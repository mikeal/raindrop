from raindrop.model import get_doc_model
from raindrop.sync import SyncConductor
from raindrop.tests import TestCaseWithTestDB, FakeOptions
from raindrop.proto.smtp import (
        SMTPClientFactory, OutgoingSMTPAccount, SMTPPostingClient)

from twisted.protocols import basic, loopback
from twisted.internet import defer

import logging
logger = logging.getLogger(__name__)

# from twisted's test_smtp.py
class LoopbackMixin:
    def loopback(self, server, client):
        return loopback.loopbackTCP(server, client)

class FakeSMTPServer(basic.LineReceiver):
    # in a dict so test-cases can override defaults.
    responses = {
        "EHLO": "250 nice to meet you",
        "QUIT": "221 see ya around\r\n",
        "MAIL FROM:": "250 ok",
        "RCPT TO:":   "250 ok",
    }

    def connectionMade(self):
        self.buffer = []
        self.sendLine('220 hello')
        self.receiving_data = False

    def lineReceived(self, line):
        self.buffer.append(line)
        # *sob* - regex foo failed me.
        for k, v in self.responses.iteritems():
            if line.startswith(k):
                handled = True
                self.transport.write(v + "\r\n")
                break
        else:
            handled = False
        if line == "QUIT":
            self.transport.loseConnection()
        elif line == "DATA":
            self.transport.write("354 go for it\r\n")
            self.receiving_data = True
        elif line == "RSET":
            self.transport.loseConnection()
        elif self.receiving_data:
            if line == ".":
                self.transport.write("250 gotcha\r\n")
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
                 'sent_state': {},
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
        acct = OutgoingSMTPAccount(get_doc_model(), {})
        return SMTPPostingClient(acct, src_doc, raw_doc, 'secret', None, 'foo')

    @defer.inlineCallbacks
    def test_simple(self):
        src_doc = yield self._prepare_test_doc()
        server = FakeSMTPServer()
        client = self._get_post_client(src_doc, src_doc)
        _ = yield self.loopback(server, client)
        # now re-open the doc and check the state says 'sent'
        src_doc = yield get_doc_model().db.openDoc(src_doc['_id'])
        self.failUnlessEqual(src_doc['sent_state']['state'], 'sent')

    @defer.inlineCallbacks
    def test_simple_rejected(self):
        src_doc = yield self._prepare_test_doc()
        server = FakeSMTPServer()
        server.responses["MAIL FROM:"] = "500 sook sook sook"

        client = self._get_post_client(src_doc, src_doc)
        _ = yield self.loopback(server, client)
        # now re-open the doc and check the state says 'error'
        src_doc = yield get_doc_model().db.openDoc(src_doc['_id'])
        self.failUnlessEqual(src_doc['sent_state']['state'], 'error')
