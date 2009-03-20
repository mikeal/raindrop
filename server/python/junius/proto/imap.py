from twisted.internet import protocol, ssl, defer, error
from twisted.mail import imap4
import logging

from ..proc import base
from ..model import get_db

brat = base.Rat

logger = logging.getLogger(__name__)

# It would appear twisted assumes 'imap4-utf-7' (which would appear to be
# simply utf-7), but gmail apparently doesn't. This clearly should not be a
# global; we need to grok this better...
imap_encoding = 'utf-8'

class ImapClient(imap4.IMAP4Client):
  '''
  Much of our logic here should perhaps be in another class that holds a
  reference to the IMAP4Client instance subclass.  Consider refactoring if we
  don't turn out to benefit from the subclassing relationship.
  '''
  def finished(self, result):
    # See bottom of file - it would be good to remove this...
    logger.info("Finished synchronizing IMAP folders")
    self.conductor.on_synch_finished(self.account, result)

  def serverGreeting(self, caps):
    logger.debug("IMAP server greeting: capabilities are %s", caps)
    return self._doAuthenticate(
            ).addCallback(self._reqList
            ).addBoth(self.finished)

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
    # As per http://python.codefetch.com/example/ow/tnpe_code/ch07/imapdownload.py,
    # We keep a 'stack' of items left to process in an instance variable...
    self.folder_infos = result[:]
    return self._process_next_folder()

  def _process_next_folder(self):
    if not self.folder_infos:
      # yay - all done!
      return

    flags, delim, name = self.folder_infos.pop()
    self.current_folder = name
    logger.debug('Processing folder %s (flags=%s)', name, flags)
    if r"\Noselect" in flags:
      logger.debug("'%s' is unselectable - skipping", name)
      return self._process_next_folder()

    # XXX - sob - markh sees:
    # 'Folder [Gmail]/All Mail has 38163 messages, 36391 of which we haven't seen'
    # although we obviously have seen them already in the other folders.
    if name and name.startswith('['):
      logger.info("'%s' appears special -skipping", name)
      return self._process_next_folder()

    return self.examine(name
                 ).addCallback(self._examineFolder, name
                 ).addErrback(self._cantExamineFolder, name)

  def _examineFolder(self, result, folder_path):
    logger.debug('Looking for messages already fetched for folder %s', folder_path)
    startkey=['rfc822', self.account.details['_id'], [folder_path, 0]]
    endkey=['rfc822', self.account.details['_id'], [folder_path, 4000000000]]
    return get_db().openView('raindrop!messages!by', 'by_storage',
                             startkey=startkey, endkey=endkey,
              ).addCallback(self._fetchAndProcess, folder_path)

  def _fetchAndProcess(self, rows, folder_path):
    allMessages = imap4.MessageSet(1, None)
    seen_ids = [r['key'][2][1] for r in rows]
    logger.debug("%d messages exist in %s", len(seen_ids), folder_path)
    return self.fetchUID(allMessages, True).addCallback(
            self._gotUIDs, folder_path, seen_ids)

  def _gotUIDs(self, uidResults, name, seen_uids):
    uids = [int(result['UID']) for result in uidResults.values()]
    logger.info("Folder %s has %d messages", name, len(uids))
    self.messages_remaining = uids
    return self._process_next_message()

  def _process_next_message(self):
    logger.debug("processNextMessage has %d messages to go...",
                 len(self.messages_remaining))
    if not self.messages_remaining:
      return self._process_next_folder()

    uid = self.messages_remaining.pop()
    # XXX - we need something to make this truly unique.
    did = "%s#%d" % (self.current_folder, uid)
    logger.debug("seeing if imap message %r exists", did)
    return self.doc_model.open_document(did,
                    ).addCallback(self._cb_process_message, uid, did
                    )

  def _cb_process_message(self, existing_doc, uid, did):
    if existing_doc is None:
      logger.debug("new imap message %r - fetching content", did)
      # grr - we have to get the rfc822 body and the flags in separate requests.
      to_fetch = imap4.MessageSet(uid)
      return self.fetchMessage(to_fetch, uid=True
                  ).addCallback(self._cb_got_body, uid, did, to_fetch
                  )
    else:
      logger.debug("Skipping message %r - already exists", did)
      # we are done with this message.
      return self._process_next_message()

  def _cb_got_body(self, result, uid, did, to_fetch):
    _, result = result.popitem()
    try:
      content = result['RFC822'].decode(imap_encoding)
    except UnicodeError, why:
      logger.error("Failed to decode message "
                   "(but will re-decode ignoring errors) : %s", why)
      # heh - 'ignore' and 'replace' are apparently ignored for the 'utf-7'
      # codecs...
      try:
        body = result['RFC822'].decode(imap_encoding, 'ignore')
      except UnicodeError, why:
        # XXX - is this possible???
        logger.error("and failed to 'ignore' unicode errors - skipping it: %s",
                     why)
        return self._process_next_message()

    # grr - get the flags
    logger.debug("fetching flags for message %s", did)
    return self.fetchFlags(to_fetch, uid=True
                ).addCallback(self._cb_got_flags, uid, did, content
                ).addErrback(self._cantGetMessage
                )

  def _cb_got_flags(self, result, uid, did, content):
    logger.debug("flags are %s", result)
    assert len(result)==1, result
    _, result = result.popitem()
    flags = result['FLAGS']
    # put the 'raw' document object together and save it.
    doc = dict(
      storage_key=[self.current_folder, uid],
      imap_flags=flags,
      imap_content=content,
      )
    return self.doc_model.create_raw_document(did, doc, 'proto/imap',
                                              self.account
                ).addCallback(self._cb_saved_message)
    
  def _cantGetMessage(self, failure):
    logger.error("Failed to fetch message: %s", failure)
    return self._process_next_message()

  def _cb_saved_message(self, result):
    logger.debug("Saved message %s", result)
    return self._process_next_message()

  def _cantSaveDocument(self, failure):
    logger.error("Failed to save message: %s", failure)
    return self._process_next_message()

  def _cantExamineFolder(self, failure, name, *args, **kw):
    logger.warning("Failed to examine folder '%s': %s", name, failure)
    return self._process_next_folder()

  def accountStatus(self, result, *args):
    return self.account.reportStatus(*args)


class ImapClientFactory(protocol.ClientFactory):
  protocol = ImapClient

  def __init__(self, account, conductor, doc_model):
    self.account = account
    self.conductor = conductor
    self.doc_model = doc_model

    self.ctx = ssl.ClientContextFactory()
    self.backoff = 8 # magic number

  def buildProtocol(self, addr):
    p = self.protocol(self.ctx)
    p.factory = self
    p.account = self.account
    p.conductor = self.conductor
    p.doc_model = self.doc_model
    return p

  def connect(self):
    details = self.account.details
    logger.debug('attempting to connect to %s:%d (ssl: %s)',
                 details['host'], details['port'], details['ssl'])
    reactor = self.conductor.reactor    
    if details.get('ssl'):
      reactor.connectSSL(details['host'], details['port'], self, self.ctx)
    else:
      reactor.connectTCP(details['host'], details['port'], self)

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
class IMAPConverter(base.ConverterBase):
  def convert(self, doc):
    headers, body = doc['imap_content'].split('\r\n\r\n', 1)
    return {'headers': headers, 'body': body}


class IMAPAccount(base.AccountBase):
  def __init__(self, db, details):
    self.db = db
    self.details = details

  def startSync(self, conductor, doc_model):
    self.factory = ImapClientFactory(self, conductor, doc_model)
    self.factory.connect()
    # XXX - wouldn't it be good to return a deferred here, so the conductor
    # can reliably wait for the deferred to complete, rather than forcing
    # each deferred to manage 'finished' itself?
