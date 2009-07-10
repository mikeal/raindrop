from raindrop.model import get_doc_model
from raindrop.pipeline import Pipeline
from raindrop.tests import TestCaseWithTestDB, FakeOptions
from raindrop.proto.smtp import SMTPAccount, SMTPPostingClient, \
                                SMTPClientFactory

from twisted.protocols import basic, loopback
from twisted.internet import defer

import logging
logger = logging.getLogger(__name__)

# from twisted's test_smtp.py
class LoopbackMixin:
    def loopback(self, server, client):
        return loopback.loopbackTCP(server, client)

SMTP_SERVER_HOST='127.0.0.1'
SMTP_SERVER_PORT=6578

class FakeSMTPServer(basic.LineReceiver):
    num_connections = 0

    def __init__(self, *args, **kw):
        # in a dict so test-cases can override defaults.
        self.responses = {
            "EHLO": "250 nice to meet you",
            "QUIT": "221 see ya around\r\n",
            "MAIL FROM:": "250 ok",
            "RCPT TO:":   "250 ok",
            "RSET": "250 ok",
            "DATA": "354 go for it",
            ".": "250 gotcha",
        }
    def connectionMade(self):
        self.__class__.num_connections += 1
        self.buffer = []
        self.sendLine('220 hello')
        self.receiving_data = False

    def lineReceived(self, line):
        self.buffer.append(line)
        # *sob* - regex foo failed me.
        for k, v in self.responses.iteritems():
            if line.startswith(k):
                if isinstance(v, Exception):
                    raise v
                handled = True
                self.transport.write(v + "\r\n")
                break
        else:
            handled = False
        if line == "QUIT":
            self.transport.loseConnection()
        elif line == "DATA":
            self.receiving_data = True
        elif self.receiving_data:
            if line == ".":
                self.receiving_data = False
        else:
            if not handled:
                raise RuntimeError("test server not expecting %r", line)


# Simple test case writes an outgoing smtp schema, and also re-uses that
# same document for the 'sent' state.  This avoids any 'pipeline' work.
class TestSMTPSimple(TestCaseWithTestDB, LoopbackMixin):
    @defer.inlineCallbacks
    def _prepare_test_doc(self):
        doc_model = get_doc_model()
        # abuse the schema API to write the outgoing smtp data and the
        # 'state' doc in one hit.
        body = 'subject: hello\r\n\r\nthe body'
        items = {'smtp_from' : 'sender@test.com',
                 'smtp_to': ['recip1@test.com', 'recip2@test2.com'],
                 # The 'state' bit...
                 'sent_state': None,
                 'outgoing_state': 'outgoing',
                }
        result = yield doc_model.create_schema_items([
                    {'rd_key': ['test', 'smtp_test'],
                     'ext_id': 'testsuite',
                     'schema_id': 'rd.msg.outgoing.smtp',
                     'items': items,
                     'attachments': {'smtp_body': {'data': body}},
                    }])
        src_doc = yield doc_model.db.openDoc(result[0]['id'])
        defer.returnValue(src_doc)

    def _get_post_client(self, src_doc, raw_doc):
        acct = SMTPAccount(get_doc_model(), {})
        # we need a factory for error handling...
        factory = SMTPClientFactory(None, None, src_doc, raw_doc)
        c = SMTPPostingClient(acct, src_doc, raw_doc, 'secret', None, None, None)
        c.factory = factory
        c.deferred = defer.Deferred()
        return c

    @defer.inlineCallbacks
    def test_simple(self):
        src_doc = yield self._prepare_test_doc()
        server = FakeSMTPServer()
        client = self._get_post_client(src_doc, src_doc)
        _ = yield self.loopback(server, client)
        # now re-open the doc and check the state says 'sent'
        src_doc = yield get_doc_model().db.openDoc(src_doc['_id'])
        self.failUnlessEqual(src_doc['sent_state'], 'sent')
        self.failUnless(server.buffer) # must have connected to the test server.

    @defer.inlineCallbacks
    def test_simple_rejected(self):
        src_doc = yield self._prepare_test_doc()
        server = FakeSMTPServer()
        server.responses["MAIL FROM:"] = "500 sook sook sook"

        client = self._get_post_client(src_doc, src_doc)
        _ = yield self.loopback(server, client)
        # now re-open the doc and check the state says 'error'
        src_doc = yield get_doc_model().db.openDoc(src_doc['_id'])
        self.failUnlessEqual(src_doc['sent_state'], 'error')

    @defer.inlineCallbacks
    def test_simple_failed(self):
        src_doc = yield self._prepare_test_doc()
        server = FakeSMTPServer()
        client = self._get_post_client(src_doc, src_doc)
        client.requireAuthentication = True # this causes failure!
        _ = yield self.loopback(server, client)
        # now re-open the doc and check the state says 'error'
        src_doc = yield get_doc_model().db.openDoc(src_doc['_id'])
        self.failUnlessEqual(src_doc['sent_state'], 'error')

# creates a real 'outgoing' schema, then uses the conductor to do whatever
# it does...
class TestSMTPSend(TestCaseWithTestDB, LoopbackMixin):
    @defer.inlineCallbacks
    def setUp(self):
        _ = yield TestCaseWithTestDB.setUp(self)
        self.serverDisconnected = defer.Deferred()
        self.serverPort = self._listenServer(self.serverDisconnected)
        #connected = defer.Deferred()
        #self.clientDisconnected = defer.Deferred()
        #self.clientConnection = self._connectClient(connected,
        #                                            self.clientDisconnected)
        #return connected

    def _listenServer(self, d):
        from twisted.internet.protocol import Factory
        from twisted.internet import reactor
        f = Factory()
        f.onConnectionLost = d
        f.protocol = FakeSMTPServer
        return reactor.listenTCP(SMTP_SERVER_PORT, f)

    def tearDown(self):
        self.serverPort.stopListening()
        return ###?????????
        d = defer.maybeDeferred(self.serverPort.stopListening)
        return defer.gatherResults([d, self.serverDisconnected])

    @defer.inlineCallbacks
    def _prepare_test_doc(self):
        doc_model = get_doc_model()
        # write a simple outgoing schema
        items = {'body' : 'hello there',
                 'from' : ['email', 'test1@test.com'],
                 'from_display': 'Sender Name',
                 'to' : [
                            ['email', 'test2@test.com'],
                            ['email', 'test3@test.com'],
                        ],
                 'to_display': ['recip 1', 'recip 2'],
                 'cc' : [
                            ['email', 'test4@test.com'],
                    
                        ],
                 'cc_display' : ['CC recip 1'],
                 'subject': "the subject",
                 # The 'state' bit...
                 'sent_state': None,
                 'outgoing_state': 'outgoing',
                }
        result = yield doc_model.create_schema_items([
                    {'rd_key': ['test', 'smtp_test'],
                     'ext_id': 'testsuite',
                     'schema_id': 'rd.msg.outgoing.simple',
                     'items': items,
                    }])
        src_doc = yield doc_model.db.openDoc(result[0]['id'])
        defer.returnValue(src_doc)

    def prepare_test_accounts(self, config):
        acct = config.accounts['test'] = {}
        acct['kind'] = 'smtp'
        acct['username'] = 'test'
        acct['id'] = 'smtp_test'
        acct['host'] = SMTP_SERVER_HOST
        acct['port'] = SMTP_SERVER_PORT
        acct['ssl'] = False

    @defer.inlineCallbacks
    def test_outgoing(self):
        doc_model = get_doc_model()
        src_doc = yield self._prepare_test_doc()
        opts = FakeOptions()
        pipeline = Pipeline(doc_model, opts)
        _ = yield self.get_conductor(opts).sync(pipeline)

    @defer.inlineCallbacks
    def test_outgoing_twice(self):
        doc_model = get_doc_model()
        src_doc = yield self._prepare_test_doc()
        opts = FakeOptions()
        pipeline = Pipeline(doc_model, opts)
        conductor = self.get_conductor(opts)
        nc = FakeSMTPServer.num_connections
        _ = yield conductor.sync(pipeline)
        self.failUnlessEqual(nc+1, FakeSMTPServer.num_connections)
        nc = FakeSMTPServer.num_connections
        # sync again - better not make a connection this time!
        _ = yield conductor.sync(pipeline)
        self.failUnlessEqual(nc, FakeSMTPServer.num_connections)

