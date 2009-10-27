# Much of this taken from twisted.mail.test.test_imap
from raindrop.model import get_doc_model
import raindrop.proto.imap
from raindrop.tests import TestCaseWithTestDB, FakeOptions
from raindrop.proc.base import Rat

from twisted.internet import defer, reactor
from twisted.mail import imap4

from twisted import cred
import twisted.cred.error
import twisted.cred.checkers
import twisted.cred.credentials
import twisted.cred.portal
from twisted.internet.protocol import Factory
from twisted.internet import reactor
import twisted.internet.error

from zope.interface import implements

import logging
logger = logging.getLogger(__name__)

IMAP_SERVER_HOST='127.0.0.1'
IMAP_SERVER_PORT=6579

class SimpleMailbox:
    implements(imap4.IMailboxInfo, imap4.IMailbox, imap4.ICloseableMailbox)

    flags = ('\\Flag1', 'Flag2', '\\AnotherSysFlag',
             # XXX - twisted gets upset with unicode here...
             u'FlagWithExtended\xa9har'.encode('imap4-utf-7'),
             'LastFlag')
    capabilities = ['testing']
    messages = []
    mUID = 0
    rw = 1
    closed = False

    def __init__(self):
        self.listeners = []
        self.addListener = self.listeners.append
        self.removeListener = self.listeners.remove

    def getFlags(self):
        return self.flags

    def getUIDValidity(self):
        return 42

    def getUIDNext(self):
        return len(self.messages) + 1

    def getMessageCount(self):
        return 9

    def getRecentCount(self):
        return 3

    def getUnseenCount(self):
        return 4

    def isWriteable(self):
        return self.rw

    def destroy(self):
        pass

    def getHierarchicalDelimiter(self):
        return '/'

    def requestStatus(self, names):
        r = {}
        if 'MESSAGES' in names:
            r['MESSAGES'] = self.getMessageCount()
        if 'RECENT' in names:
            r['RECENT'] = self.getRecentCount()
        if 'UIDNEXT' in names:
            r['UIDNEXT'] = self.getMessageCount() + 1
        if 'UIDVALIDITY' in names:
            r['UIDVALIDITY'] = self.getUID()
        if 'UNSEEN' in names:
            r['UNSEEN'] = self.getUnseenCount()
        return defer.succeed(r)

    def addMessage(self, message, flags, date = None):
        self.messages.append((message, flags, date, self.mUID))
        self.mUID += 1
        return defer.succeed(None)

    def expunge(self):
        delete = []
        for i in self.messages:
            if '\\Deleted' in i[1]:
                delete.append(i)
        for i in delete:
            self.messages.remove(i)
        return [i[3] for i in delete]

    def close(self):
        self.closed = True

    # XXX - it would be nice to have a real fetch impl...
    def fetch(self, messages, uid):
        return []

class Account(imap4.MemoryAccount):
    mailboxFactory = SimpleMailbox
    def _emptyMailbox(self, name, id):
        return self.mailboxFactory()

    def select(self, name, rw=1):
        mbox = imap4.MemoryAccount.select(self, name)
        if mbox is not None:
            mbox.rw = rw
        return mbox

class TestRealm:
    theAccount = None

    def requestAvatar(self, avatarId, mind, *interfaces):
        return imap4.IAccount, self.theAccount, lambda: None

class TestIMAPException(imap4.IMAP4Exception): pass

class SimpleServer(imap4.IMAP4Server):
    def __init__(self, *args, **kw):
        imap4.IMAP4Server.__init__(self, *args, **kw)
        realm = TestRealm()
        realm.theAccount = Account('testuser')
        portal = cred.portal.Portal(realm)
        c = cred.checkers.InMemoryUsernamePasswordDatabaseDontUse()
        self.checker = c
        self.portal = portal
        portal.registerChecker(c)
        self.testcase = None # set by the factory.

    def lineReceived(self, line):
        if getattr(self.testcase, 'is_timeout_test', False):
            #Do not send a respones
            return

        imap4.IMAP4Server.lineReceived(self, line)

    _username = 'test_raindrop@test.mozillamessaging.com'
    _password = 'topsecret'
    def authenticateLogin(self, username, password):
        if self.testcase.num_current_logins >= self.testcase.max_logins:
            self.testcase.num_failed_logins += 1
            raise TestIMAPException("too many concurrent connections")

        if self.testcase.num_transient_auth_errors:
            self.testcase.num_transient_auth_errors -= 1
            self.testcase.num_failed_logins += 1
            raise cred.error.UnauthorizedLogin()

        if username == self._username and password == self._password:
            # lose the connection now - it is the *next* request from the
            # client which is likely to fail.
            if getattr(self.testcase, 'is_disconnect_early_test', False):
                self.transport.loseConnection()

            return imap4.IAccount, self.theAccount, lambda: None
        self.testcase.num_failed_logins += 1
        raise cred.error.UnauthorizedLogin()

    def do_LOGOUT(self, tag):
        self.testcase.num_current_logins -= 1
        return imap4.IMAP4Server.do_LOGOUT(self, tag)
    unauth_LOGOUT = (do_LOGOUT,)
    auth_LOGOUT = unauth_LOGOUT

    @defer.inlineCallbacks
    def do_LOGIN(self, tag, user, passwd):
        _ = yield imap4.IMAP4Server.do_LOGIN(self, tag, user, passwd)
        self.testcase.num_current_logins += 1
    unauth_LOGIN = (do_LOGIN, imap4.IMAP4Server.arg_astring, imap4.IMAP4Server.arg_astring)

    def _parseMbox(self, mbox):
        # losing the connection now can be interesting - the client may just
        # conclude there are no folders.
        if getattr(self.testcase, 'is_disconnect_after_mbox_test', False):
            reactor.callLater(0, self.transport.loseConnection)
        if self.testcase.num_transient_list_errors:
            self.testcase.num_transient_list_errors -= 1
            raise TestIMAPException("something transient")
        return imap4.IMAP4Server._parseMbox(self, mbox)

    def _listWork(self, tag, ref, mbox, sub, cmdName):
        if getattr(self.testcase, 'is_disconnect_after_list_test', False):
            reactor.callLater(0, self.transport.loseConnection)
        return imap4.IMAP4Server._listWork(self, tag, ref, mbox, sub, cmdName)

    auth_LIST = (_listWork, imap4.IMAP4Server.arg_astring, imap4.IMAP4Server.arg_astring, 0, 'LIST')



class ServerFactory(Factory):
    protocol = SimpleServer
    def __init__(self, testcase):
        self.testcase = testcase
    def buildProtocol(self, addr):
        p = Factory.buildProtocol(self, addr)
        p.testcase = self.testcase
        return p


class IMAP4TestBase(TestCaseWithTestDB):
    serverCTX = None
    mailboxes = []
    num_transient_auth_errors = 0
    num_transient_list_errors = 0
    num_fetch_requests = 0
    num_failed_logins = 0
    num_current_logins = 0
    max_logins = 99

    @defer.inlineCallbacks
    def setUp(self):
        self.old_backoff = raindrop.proto.imap.RETRY_BACKOFF
        raindrop.proto.imap.RETRY_BACKOFF = 0
        self.old_retries = raindrop.proto.imap.NUM_CONNECT_RETRIES 
        raindrop.proto.imap.NUM_CONNECT_RETRIES = 2
        self.old_timeout = raindrop.proto.imap.ImapClient.timeout
        raindrop.proto.imap.ImapClient.timeout = 0.25

        self.server_disconnected = defer.Deferred()
        self.server_port = self._listenServer(self.server_disconnected)

        SimpleMailbox.messages = []
        theAccount = Account('testuser')
        theAccount.mboxType = SimpleMailbox
        SimpleServer.theAccount = theAccount
        if self.mailboxes:
            for mb in self.mailboxes:
                theAccount.create(mb)

        _ = yield super(IMAP4TestBase, self).setUp()
        # and almost every test here generates errors
        filter = lambda record: True
        self.log_handler.ok_filters.append(filter)

    def tearDown(self):
        raindrop.proto.imap.RETRY_BACKOFF = self.old_backoff
        raindrop.proto.imap.NUM_CONNECT_RETRIES = self.old_retries
        raindrop.proto.imap.ImapClient.timeout = self.old_timeout
        if self.server_port is not None:
            self.server_port.stopListening()
            self.server_port = None
        return super(IMAP4TestBase, self).tearDown()

    def _listenServer(self, d):
        f = ServerFactory(self)
        f.onConnectionLost = d
        return reactor.listenTCP(IMAP_SERVER_PORT, f)

    def make_config(self):
        config = TestCaseWithTestDB.make_config(self)
        # now clobber it with our imap account
        config.accounts = {}
        acct = config.accounts['test'] = {}
        acct['proto'] = 'imap'
        acct['username'] = SimpleServer._username
        acct['password'] = SimpleServer._password
        acct['id'] = 'imap_test'
        acct['host'] = IMAP_SERVER_HOST
        acct['port'] = IMAP_SERVER_PORT
        acct['ssl'] = False
        return config

class TestSimpleFailures(IMAP4TestBase):
    @defer.inlineCallbacks
    def test_no_connect(self):
        # stop the server first.
        self._observer._ignoreErrors(twisted.internet.error.ConnectionRefusedError)
        self.server_port.stopListening()
        self.server_port = None
        # now attempt to connect to it.
        cond = yield self.get_conductor()
        _ = yield cond.sync(self.pipeline.options)
        status = cond.get_status_ob()['accounts']['imap_test']['status']
        self.failUnlessEqual(status['state'], Rat.BAD)
        self.failUnlessEqual(status['why'], Rat.UNREACHABLE)

    @defer.inlineCallbacks
    def test_disconnect_early(self):
        self._observer._ignoreErrors(TestIMAPException,
                                     twisted.internet.error.ConnectionDone)
        self.is_disconnect_early_test = True
        cond = yield self.get_conductor()
        _ = yield cond.sync(self.pipeline.options)
        status = cond.get_status_ob()['accounts']['imap_test']['status']
        self.failUnlessEqual(status['state'], Rat.BAD)
        # don't have a specific 'why' state for this, so don't bother
        # testing is - 'state'==bad is good enough...

    @defer.inlineCallbacks
    def test_disconnect_late(self):
        self._observer._ignoreErrors(TestIMAPException,
                                     twisted.internet.error.ConnectionDone)
        self.is_disconnect_after_mbox_test = True
        cond = yield self.get_conductor()
        _ = yield cond.sync(self.pipeline.options)
        status = cond.get_status_ob()['accounts']['imap_test']['status']
        self.failUnlessEqual(status['state'], Rat.BAD)
        # don't have a specific 'why' state for this, so don't bother
        # testing is - 'state'==bad is good enough...

    @defer.inlineCallbacks
    def test_disconnect_later(self):
        self._observer._ignoreErrors(TestIMAPException,
                                     twisted.internet.error.ConnectionDone)
        self.is_disconnect_after_list_test = True
        cond = yield self.get_conductor()
        _ = yield cond.sync(self.pipeline.options)
        status = cond.get_status_ob()['accounts']['imap_test']['status']
        self.failUnlessEqual(status['state'], Rat.BAD)

    @defer.inlineCallbacks
    def test_timeout(self):
        self._observer._ignoreErrors(twisted.internet.error.TimeoutError)
        self.is_timeout_test = True
        cond = yield self.get_conductor()
        _ = yield cond.sync(self.pipeline.options)
        status = cond.get_status_ob()['accounts']['imap_test']['status']
        self.failUnlessEqual(status['state'], Rat.BAD)
        self.failUnlessEqual(status['why'], Rat.TIMEOUT)

class TestAuthFailures(IMAP4TestBase):
    def make_config(self):
        config = IMAP4TestBase.make_config(self)
        config.accounts['test']['username'] = "notme@anywhere"
        return config

    @defer.inlineCallbacks
    def test_bad_auth(self):
        self._observer._ignoreErrors(imap4.IMAP4Exception)
        cond = yield self.get_conductor()
        _ = yield cond.sync(self.pipeline.options)
        status = cond.get_status_ob()['accounts']['imap_test']['status']
        self.failUnlessEqual(status['state'], Rat.BAD)
        self.failUnlessEqual(status['why'], Rat.PASSWORD)

class TestSimpleEmpty(IMAP4TestBase):
    @defer.inlineCallbacks
    def test_simple_nothing(self):
        cond = yield self.get_conductor()
        _ = yield cond.sync(self.pipeline.options)
        status = cond.get_status_ob()['accounts']['imap_test']['status']
        self.failUnlessEqual(status['state'], Rat.GOOD)
        self.failUnlessEqual(status['what'], Rat.EVERYTHING)

    @defer.inlineCallbacks
    def test_simple_nothing_recovers_early(self):
        self.num_transient_auth_errors = 1
        _ = yield self.test_simple_nothing()
        self.failUnlessEqual(self.num_transient_auth_errors, 0)

    @defer.inlineCallbacks
    def test_simple_nothing_recovers_late(self):
        self._observer._ignoreErrors(TestIMAPException)
        self.num_transient_list_errors = 1
        _ = yield self.test_simple_nothing()
        self.failUnlessEqual(self.num_transient_list_errors, 0)

class TestSimpleMailboxes(IMAP4TestBase):
    mailboxes = ["foo/bar", u"extended \xa9har"]
    @defer.inlineCallbacks
    def test_simple(self):
        cond = yield self.get_conductor()
        _ = yield cond.sync(self.pipeline.options)
        status = cond.get_status_ob()['accounts']['imap_test']['status']
        self.failUnlessEqual(status['state'], Rat.GOOD)
        self.failUnlessEqual(status['what'], Rat.EVERYTHING)

    @defer.inlineCallbacks
    def test_simple_limited_connections(self):
        self._observer._ignoreErrors(TestIMAPException, imap4.IMAP4Exception)
        # XXX - we fail if we try only 1.
        self.max_logins = 2
        cond = yield self.get_conductor()
        _ = yield cond.sync(self.pipeline.options)
        status = cond.get_status_ob()['accounts']['imap_test']['status']
        self.failUnlessEqual(status['state'], Rat.GOOD)
        self.failUnlessEqual(status['what'], Rat.EVERYTHING)
        # check the server did actually reject at least one request.
        self.failUnless(self.num_failed_logins > 1)
