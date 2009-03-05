from twisted.internet import protocol, ssl, defer, reactor
from twisted.mail import imap4

from junius.proc import base
brat = base.Rat

class ImapClient(imap4.IMAP4Client):
  '''
  Much of our logic here should perhaps be in another class that holds a
  reference to the IMAP4Client instance subclass.  Consider refactoring if we
  don't turn out to benefit from the subclassing relationship.
  '''
  def serverGreeting(self, caps):
    d = self._doAuthenticate()
    d.addCallback(self._reqList)


  def _doAuthenticate(self):
    if self.account.details['crypto'] == 'TLS':
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
    for flags, delim, name in result:
      print 'Mailbox', flags, delim, name

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
    self.account.log.debug('attempting to connect to %s:%d (ssl: %s)',
                           details['host'], details['port'], details['ssl'])
    if self.details.get('ssl'):
      reactor.connectSSL(details['host'], details['port'], self, self.ctx)
    else:
      reactor.connectTCP(details['host'], details['port'], self)

  def clientConnectionLost(self, connector, reason):
    # the flaw in this is that we start from scratch every time; which is why
    #  most of the logic in the client class should really be pulled out into
    #  the account logic, probably.  this class itself may have issues too...
    self.account.log.debug(
      'lost connection to server, going to reconnect in a bit')
    reactor.callLater(2, self.connect)

  def clientConnectionFailed(self, connector, reason):
    self.account.reportStatus(brat.SERVER, brat.BAD, brat.UNREACHABLE,
                              brat.TEMPORARY)
    self.account.log.warning('Failed to connect, will retry after %d secs',
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
    self.log = logging.getLogger('imap')

  def startSync(self, conductor):
    self.factory = ImapClientFactory(self)
    self.factory.connect()
