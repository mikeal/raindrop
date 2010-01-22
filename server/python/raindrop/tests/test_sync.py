from twisted.internet import defer

from raindrop.tests import TestCaseWithTestDB, FakeOptions
from raindrop.model import get_doc_model
from raindrop.proto import test as test_proto

import logging
logger = logging.getLogger(__name__)

class TestSyncing(TestCaseWithTestDB):
    def make_config(self):
        config = TestCaseWithTestDB.make_config(self)
        # now add our smtp account
        acct = config.accounts['test_smtp'] = {}
        acct['proto'] = 'smtp'
        acct['username'] = 'test_raindrop@test.mozillamessaging.com'
        acct['id'] = 'smtp_test'
        acct['ssl'] = False
        return config

    @defer.inlineCallbacks
    def test_sync_state_doc(self, expected_num_syncs=1):
        _ = yield self.deferMakeAnotherTestMessage(None)
        _ = yield self.ensure_pipeline_complete()
        # open the document with the sync state.
        wanted = ["raindrop", "sync-status"], 'rd.core.sync-status'
        si = (yield self.doc_model.open_schemas([wanted]))[0]
        self.failUnless(si)
        self.failUnlessEqual(si.get('new_items'), 1)
        self.failUnlessEqual(si.get('num_syncs'), expected_num_syncs)

    @defer.inlineCallbacks
    def test_sync_state_doc_twice(self):
        # make sure it works twice with the same conductor instance/db
        _ = yield self.test_sync_state_doc()
        _ = yield self.test_sync_state_doc(2)
