from twisted.internet import protocol, ssl, defer, error
from twisted.mail import imap4
import logging

from ..proc import base
from ..ext.message.rfc822 import doc_from_bytes

brat = base.Rat

logger = logging.getLogger(__name__)


class ImapClient(imap4.IMAP4Client):
  '''
  Much of our logic here should perhaps be in another class that holds a
  reference to the IMAP4Client instance subclass.  Consider refactoring if we
  don't turn out to benefit from the subclassing relationship.
  '''
  def serverGreeting(self, caps):
    logger.debug("IMAP server greeting: capabilities are %s", caps)
    return self._doAuthenticate(
            ).addCallback(self._reqList
            ).addCallback(self.deferred.callback)

  def _doAuthenticate(self):
    if self.account.details.get('crypto') == 'TLS':
      d = self.startTLS(self.factory.ctx)
      d.addErrback(self.accountStatus,
                   brat.SERVER, brat.BAD, brat.CRYPTO, brat.PERMANENT)
      d.addCallback(self._doLogin)
    else:
      d = self._doLogin()
    d.addErrback(self.accountStatus,
                 brat.SERVER, brat.BAD, brat.PASSWORD, brat.PERMANENT)
    return d


  def _doLogin(self, *args, **kwargs):
    return self.login(self.account.details['username'],
                      self.account.details['password'])

  def _reqList(self, *args, **kwargs):
    self.account.reportStatus(brat.EVERYTHING, brat.GOOD)
    return self.list('', '*').addCallback(self._procList)

  def _procList(self, result, *args, **kwargs):
    return self.conductor.coop.coiterate(self.gen_folder_list(result))

  def gen_folder_list(self, result):
    for flags, delim, name in result:
      logger.debug('Processing folder %s (flags=%s)', name, flags)
      if r"\Noselect" in flags:
        logger.debug("'%s' is unselectable - skipping", name)
        continue

      # XXX - sob - markh sees:
      # 'Folder [Gmail]/All Mail has 38163 messages, 36391 of which we haven't seen'
      # although we obviously have seen them already in the other folders.
      if name and name.startswith('['):
        logger.info("'%s' appears special -skipping", name)
        continue

      yield self.examine(name
                 ).addCallback(self._examineFolder, name
                 ).addErrback(self._cantExamineFolder, name)
    logger.debug('imap processing finished.')

  def _examineFolder(self, result, folder_path):
    logger.debug('Looking for messages already fetched for folder %s', folder_path)
    return self.doc_model.open_view('raindrop!proto!seen', 'imap',
                             startkey=[folder_path], endkey=[folder_path, {}]
              ).addCallback(self._fetchAndProcess, folder_path)

  def _fetchAndProcess(self, result, folder_path):
    # XXX - we should look at the flags and update the message if it's not
    # the same - later.
    rows = result['rows']
    logger.debug('_FetchAndProcess says we have seen %d items for %r',
                 len(rows), folder_path)
    seen_uids = set(row['key'][1] for row in rows)
    # now build a list of all message currently in the folder.
    allMessages = imap4.MessageSet(1, None)
    return self.fetchUID(allMessages, True).addCallback(
            self._gotUIDs, folder_path, seen_uids)

  def _gotUIDs(self, uidResults, name, seen_uids):
    all_uids = set(int(result['UID']) for result in uidResults.values())
    remaining = all_uids - seen_uids
    logger.info("Folder %s has %d messages, %d new", name,
                len(all_uids), len(remaining))
    def gen_remaining(folder_name, reming):
      left = sorted(list(reming))
      while left:
        # do 10 at a time...
        this = left[:10]
        left = left[10:]
        to_fetch = imap4.MessageSet(this[0], this[-1])
        # grr - we have to get the rfc822 body and the flags in separate requests.
        yield self.fetchMessage(to_fetch, uid=True
                      ).addCallback(self._cb_got_body, folder_name, to_fetch
                      )

    return self.conductor.coop.coiterate(gen_remaining(name, remaining))

  def _cb_got_body(self, results, folder_name, to_fetch):
    # grr - get the flags
    logger.debug("Got %d messages from %s; fetching flags", len(results),
                 folder_name)
    return self.fetchFlags(to_fetch, uid=True
                ).addCallback(self._cb_got_flags, results, folder_name,
                )

  def _cb_got_flags(self, results, msg_results, folder_name):
    #logger.debug("flags are %s", result)
    doc_infos = []
    for seq in results:
      uid = int(msg_results[seq]['UID'])
      content = msg_results[seq]['RFC822']
      flags = results[seq]['FLAGS']
      assert int(results[seq]['UID']) == uid
      # XXX - we need something to make this truly unique.
      did = "%s#%d" % (folder_name, uid)
      logger.debug("new imap message %r (flags=%s)", did, flags)
      # put the 'raw' document object together and save it.
      doc = dict(
        storage_key=[folder_name, uid],
        imap_flags=flags,
        )
      attachments = {'rfc822' : {'content_type': 'message',
                                 'data': content,
                                 }
                    }
      doc['_attachments'] = attachments
      doc_infos.append(('msg', 'proto/imap', did, doc))
    return self.doc_model.create_raw_documents(self.account, doc_infos
                ).addCallback(self._cb_saved_messages)

  def _cb_saved_messages(self, result):
    logger.debug("Saved message %s", result)

  def _cantExamineFolder(self, failure, name, *args, **kw):
    logger.warning("Failed to examine folder '%s': %s", name, failure)

  def accountStatus(self, result, *args):
    return self.account.reportStatus(*args)


class ImapClientFactory(protocol.ClientFactory):
  protocol = ImapClient

  def __init__(self, account, conductor):
    # base-class has no __init__
    self.account = account
    self.conductor = conductor
    self.doc_model = account.doc_model # this is a little confused...

    self.ctx = ssl.ClientContextFactory()
    self.backoff = 8 # magic number

  def buildProtocol(self, addr):
    p = self.protocol(self.ctx)
    p.factory = self
    p.account = self.account
    p.conductor = self.conductor
    p.doc_model = self.account.doc_model
    p.deferred = self.deferred # this isn't going to work in reconnect scenarios
    return p

  def connect(self):
    details = self.account.details
    logger.debug('attempting to connect to %s:%d (ssl: %s)',
                 details['host'], details['port'], details['ssl'])
    reactor = self.conductor.reactor
    self.deferred = defer.Deferred()
    if details.get('ssl'):
      reactor.connectSSL(details['host'], details['port'], self, self.ctx)
    else:
      reactor.connectTCP(details['host'], details['port'], self)
    return self.deferred

  def clientConnectionLost(self, connector, reason):
    # the flaw in this is that we start from scratch every time; which is why
    #  most of the logic in the client class should really be pulled out into
    #  the account logic, probably.  this class itself may have issues too...
    # XXX - also note that a simple exception in other callbacks can trigger
    # this - meaning we retry just to hit the same exception.
    if reason.check(error.ConnectionDone):
        # only an error if premature
        if not self.deferred.called:
            self.deferred.errback(reason)
    else:
        #self.deferred.errback(reason)
        logger.debug('lost connection to server, going to reconnect in a bit')
        self.conductor.reactor.callLater(2, self.connect)

  def clientConnectionFailed(self, connector, reason):
    self.account.reportStatus(brat.SERVER, brat.BAD, brat.UNREACHABLE,
                              brat.TEMPORARY)
    logger.warning('Failed to connect, will retry after %d secs',
                   self.backoff)
    # It occurs that some "account manager" should be reported of the error,
    # and *it* asks us to retry later?  eg, how do I ask 'ignore backoff -
    # try again *now*"?
    self.conductor.reactor.callLater(self.backoff, self.connect)
    self.backoff = min(self.backoff * 2, 600) # magic number


# A 'converter' - takes a proto/imap as input and creates a
# 'raw/message/rfc822' as output
class IMAPConverter(base.SimpleConverterBase):
  target_type = 'msg', 'raw/message/rfc822'
  sources = [('msg', 'proto/imap')]

  def simple_convert(self, doc):
    # I need the binary attachment.
    return self.doc_model.open_attachment(doc['_id'], "rfc822",
              ).addCallback(self._cb_got_attachment, doc)

  def _cb_got_attachment(self, content, doc):
    # the 'rfc822' module knows what to do...
    return doc_from_bytes(doc['_id'], content)


class IMAPAccount(base.AccountBase):
  def startSync(self, conductor):
    self.factory = ImapClientFactory(self, conductor)
    return self.factory.connect()
