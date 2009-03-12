from twisted.internet import protocol, ssl, defer, reactor, error
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
  def serverGreeting(self, caps):
    logger.debug("IMAP server greeting: capabilities are %s", caps)
    d = self._doAuthenticate()
    d.addCallback(self._reqList)


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
    return self._processNextFolder()

  def _processNextFolder(self):
    if not self.folder_infos:
      # yay - all done!
      logger.info("Finished synchronizing IMAP folders")
      # need to report we are done somewhere?
      from ..sync import get_conductor
      return get_conductor().accountFinishedSync(self.account)

    flags, delim, name = self.folder_infos.pop()
    self.current_folder_path = cfp = name.split(delim)
    logger.debug('Processing folder %s (flags=%s)', name, flags)
    if r"\Noselect" in flags:
      logger.debug("'%s' is unselectable - skipping", name)
      return self._processNextFolder()

    # XXX - sob - markh sees:
    # 'Folder [Gmail]/All Mail has 38163 messages, 36391 of which we haven't seen'
    # although we obviously have seen them already in the other folders.
    if cfp and cfp[0].startswith('[') and cfp[0].endswith(']'):
      logger.info("'%s' appears special -skipping", name)
      return self._processNextFolder()

    return self.examine(name
                 ).addCallback(self._examineFolder, cfp
                 ).addErrback(self._cantExamineFolder, cfp)

  def _examineFolder(self, result, name):
    logger.debug('Looking for messages already fetched for folder %s', name)
    startkey=[self.account.details['_id'], name, 0]
    endkey=[self.account.details['_id'], name, 4000000000]
    get_db().openView('raindrop!messages!by', 'by_storage'
        ).addCallback(self._fetchAndProcess, name)

  def _fetchAndProcess(self, rows, name):
    allMessages = imap4.MessageSet(1, None)
    key_check = [self.account.details['_id'], name]
    seen_ids = [r['key'][2] for r in rows if r['key'][0:2]==key_check]
    logger.debug("%d messages already exist from %s",
                 len(seen_ids), name)
    return self.fetchUID(allMessages, True).addCallback(
            self._gotUIDs, name, seen_ids)

  def _gotUIDs(self, uidResults, name, seen_uids):
    uids = set([result['UID'] for result in uidResults.values()])
    need = uids - set(seen_uids)
    logger.info("Folder %s has %d messages, %d of which we haven't seen",
                 name, len(uids), len(need))
    self.messages_remaining = need
    return self._processNextMessage()

  def _processNextMessage(self):
    logger.debug("processNextMessage has %d messages to go...",
                 len(self.messages_remaining))
    if not self.messages_remaining:
      return self._processNextFolder()

    uid = self.messages_remaining.pop()
    to_fetch = imap4.MessageSet(uid)
    # grr - we have to get the rfc822 body and the flags in separate requests.
    logger.debug("fetching rfc822 for message %s", to_fetch)
    return self.fetchMessage(to_fetch, uid=True
                ).addCallback(self._gotBody, to_fetch
                )

  def _gotBody(self, result, to_fetch):
    _, result = result.popitem()
    try:
      body = result['RFC822'].decode(imap_encoding)
    except UnicodeError, why:
      logger.error("Failed to decode message "
                   "(but will re-decode ignoring errors) : %s", why)
      # heh - 'ignore' and 'replace' are apparently ignored for the 'utf-7'
      # codecs...
      try:
        body = result['RFC822'].decode(imap_encoding, 'ignore')
      except UnicodeError, why:
        logger.error("and failed to 'ignore' unicode errors - skipping it: %s",
                     why)
        return self._processNextMessage()

    # grr - get the flags
    logger.debug("fetching flags for message %s", to_fetch)
    return self.fetchFlags(to_fetch, uid=True
                ).addCallback(self._gotMessage, body
                ).addErrback(self._cantGetMessage
                )

  def _gotMessage(self, result, body):
    # not sure about this - can we ever get more?
    logger.debug("flags are %s", result)
    assert len(result)==1, result
    _, result = result.popitem()
    flags = result['FLAGS']
    # put the 'raw' document object together and save it.
    doc = dict(
      type='rawMessage',
      subtype='rfc822',
      account_id=self.account.details['_id'],
      storage_path=self.current_folder_path,
      storage_id=result['UID'],
      rfc822=body,
      read=r'\Seen' in flags,
      )
    get_db().saveDoc(doc
            ).addCallback(self._savedDocument
            ).addErrback(self._cantSaveDocument
            )

  def _cantGetMessage(self, failure):
    logger.error("Failed to fetch message: %s", failure)
    return self._processNextMessage()

  def _savedDocument(self, result):
    logger.debug("Saved message %s", result)
    return self._processNextMessage()

  def _cantSaveDocument(self, failure):
    logger.error("Failed to save message: %s", failure)
    return self._processNextMessage()

  def _cantExamineFolder(self, failure, name, *args, **kw):
    logger.warning("Failed to examine folder '%s': %s", name, failure)
    return self._processNextFolder()

  def accountStatus(self, result, *args):
    self.account.reportStatus(*args)


class ImapClientFactory(protocol.ClientFactory):
  protocol = ImapClient

  def __init__(self, account):
    self.account = account

    self.ctx = ssl.ClientContextFactory()
    self.backoff = 8 # magic number

  def buildProtocol(self, addr):
    p = self.protocol(self.ctx)
    p.factory = self
    p.account = self.account
    return p

  def connect(self):
    details = self.account.details
    logger.debug('attempting to connect to %s:%d (ssl: %s)',
                 details['host'], details['port'], details['ssl'])
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
        reactor.callLater(2, self.connect)

  def clientConnectionFailed(self, connector, reason):
    self.account.reportStatus(brat.SERVER, brat.BAD, brat.UNREACHABLE,
                              brat.TEMPORARY)
    logger.warning('Failed to connect, will retry after %d secs',
                   self.backoff)
    # It occurs that some "account manager" should be reported of the error,
    # and *it* asks us to retry later?  eg, how do I ask 'ignore backoff -
    # try again *now*"?
    reactor.callLater(self.backoff, self.connect)
    self.backoff = min(self.backoff * 2, 600) # magic number


class IMAPAccount(base.AccountBase):
  def __init__(self, db, details):
    self.db = db
    self.details = details

  def startSync(self, conductor):
    self.factory = ImapClientFactory(self)
    self.factory.connect()
