from twisted.internet import protocol, ssl, defer, error
from twisted.mail import imap4
import logging
from email.utils import mktime_tz, parsedate_tz
import time

from ..proc import base

brat = base.Rat

logger = logging.getLogger(__name__)

def get_rdkey_for_email(msg_id):
  return ("email", msg_id)

class ImapClient(imap4.IMAP4Client):
  '''
  Much of our logic here should perhaps be in another class that holds a
  reference to the IMAP4Client instance subclass.  Consider refactoring if we
  don't turn out to benefit from the subclassing relationship.
  '''
  # The 'id' of this extension
  # XXX - should be managed by our caller once these 'protocols' become
  # regular extensions.
  rd_extension_id = 'proto.imap'

  def _defaultHandler(self, tag, rest):
    # XXX - worm around a bug related to MismatchedQuoting exceptions.
    # Probably: http://twistedmatrix.com/trac/ticket/1443
    # "[imap4] mismatched quoting spuriously raised" - raised early 2006 :(
    try:
      imap4.IMAP4Client._defaultHandler(self, tag, rest)
    except imap4.MismatchedQuoting, exc:
      # The rest seems necessary to 'gracefully' ignore the error.
      cmd = self.tags[tag]
      cmd.defer.errback(exc)
      del self.tags[tag]
      self.waiting = None
      self._flushQueue()

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
      # 'Folder [Gmail]/All Mail has 38163 messages, 36391 of which we haven'
      # although we obviously have seen them already in the other folders.
      # XXX - but should not be necessary now we are using message-id
      if name and name.startswith('['):
        logger.info("'%s' appears special - skipping", name)
        continue

      yield self.examine(name
                 ).addCallback(self._examineFolder, name
                 ).addErrback(self._cantExamineFolder, name)
    logger.info('imap processing finished.')

  @defer.inlineCallbacks
  def _examineFolder(self, result, folder_path):
    # fetch info about all messages currently in the folder, 100
    # at a time...
    nper = 500
    num_msgs = (yield self.status(folder_path, 'MESSAGES'))['MESSAGES']
    logger.info("folder %s has %d messages total", folder_path, num_msgs)
    while num_msgs > 0:
      batch = imap4.MessageSet(num_msgs, max(num_msgs-nper, 1))
      num_msgs -= nper
      # fetchAll does *not* get the body...
      results = yield self.fetchAll(batch, True)
      _ = yield self._processFolderBatch(results, folder_path)

  @defer.inlineCallbacks
  def _processFolderBatch(self, results, folder_path):
    msg_infos = {}
    # 'invert' the map so we have one keyed by UID
    for seq, msg_info in results.iteritems():
      if self.conductor.options.max_age:
        date_str = msg_info['ENVELOPE'][0]
        try:
          date = mktime_tz(parsedate_tz(date_str))
        except (ValueError, TypeError):
          continue # invalid date - skip it.
        if date < time.time() - self.conductor.options.max_age:
          logger.debug('skipping message - too old')
          continue

      msg_id = msg_info['ENVELOPE'][-1]
      if msg_id in msg_infos:
        # This isn't a very useful check - we are only looking in a single
        # folder...
        logger.warn("Duplicate message ID %r detected", msg_id)
        # and it will get clobbered below :(
      msg_infos[get_rdkey_for_email(msg_id)] = msg_info
    if not msg_infos:
      # nothing new in this batch
      return

    # Get all messages that already have this schema
    keys = [['rd.core.content', 'key-schema_id', [k, 'rd.msg.rfc822']]
            for k in msg_infos.keys()]
    result = yield self.doc_model.open_view(keys=keys, reduce=False)
    seen = set([tuple(r['value']['rd_key']) for r in result['rows']])
    # convert each key elt to a list like we get from the views.
    remaining = set(msg_infos.iterkeys())-set(seen)

    logger.debug("folder %s has %d messages in this batch, %d new", folder_path,
                len(msg_infos), len(remaining))
    rem_uids = [int(msg_infos[k]['UID']) for k in remaining]
    # *sob* - re-invert keyed by the UID.
    by_uid = {}
    for key, info in msg_infos.iteritems():
      uid = int(info['UID'])
      if uid in rem_uids:
        info['RAINDROP_KEY'] = key
        by_uid[uid] = info

    # fetch most-recent (highest UID) first...
    left = sorted(list(rem_uids), reverse=True)
    while left:
      # do 10 at a time...
      this = left[:10]
      left = left[10:]
      to_fetch = ",".join(str(v) for v in this)
      # grr - we have to get the rfc822 body and the flags in separate requests.
      results = yield self.fetchMessage(to_fetch, uid=True)
      # Run over the results stashing in our by_uid dict.
      infos = []
      for info in results.values():
        uid = int(info['UID'])
        content = info['RFC822']
        flags = by_uid[uid]['FLAGS']
        rdkey = by_uid[uid]['RAINDROP_KEY']
        mid = rdkey[-1]
        # XXX - we need something to make this truly unique.
        logger.debug("new imap message %r (flags=%s)", mid, flags)
  
        # put our schemas together
        attachments = {'rfc822' : {'content_type': 'message',
                                   'data': content,
                                   }
        }
        items = {'_attachments': attachments}
        infos.append({'rd_key' : rdkey,
                      'ext_id': self.rd_extension_id,
                      'schema_id': 'rd.msg.rfc822',
                      'items': items})
        items = {'flags' : flags}
        infos.append({'rd_key' : rdkey,
                      'ext_id': self.rd_extension_id,
                      'schema_id': 'rd.msg.imap.flags',
                      'items': items})
        # could add other schemas with info from the 'body'?

      _ = yield self.doc_model.create_schema_items(infos)

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


class IMAPAccount(base.AccountBase):
  def startSync(self, conductor):
    self.factory = ImapClientFactory(self, conductor)
    return self.factory.connect()
