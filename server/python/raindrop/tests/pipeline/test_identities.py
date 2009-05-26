# Test the 'identity spawner pipeline'

from twisted.internet import task, defer

from raindrop.tests import TestCaseWithTestDB, FakeOptions
from raindrop.model import get_doc_model
from raindrop.proto import test as test_proto
from raindrop import pipeline

import logging
logger = logging.getLogger(__name__)

class TestIDPipelineBase(TestCaseWithTestDB):
    def get_pipeline(self):
        opts = FakeOptions()
        dm = get_doc_model()
        return pipeline.Pipeline(dm, opts)

    def process_doc(self, exts=None, emit_common_ids=True):
        test_proto.test_emit_identities = True
        test_proto.test_emit_common_identities = emit_common_ids
        doc_model = get_doc_model()
        if not pipeline.extensions: # XXX - *sob* - misplaced...
            pipeline.load_extensions(doc_model)

        p = self.get_pipeline()
        p.options.exts = exts
        return p.start()


class TestIDPipeline(TestIDPipelineBase):
    # Test extracting identities and contacts test protocol messages
    # work as expected.
    @defer.inlineCallbacks
    def deferVerifyCounts(self, _, contact_count, identity_count):
        # First determine the contact ID.
        key = ['rd/core/content', 'schema_id', 'rd/contact']
        result = yield get_doc_model().open_view(key=key, reduce=False)
        self.failUnlessEqual(len(result['rows']), contact_count, repr(result))

        # each identity should have got 2 schema instances.
        keys = [['rd/core/content', 'schema_id', 'rd/identity/exists'],
                ['rd/core/content', 'schema_id', 'rd/identity/contacts'],
               ]

        result = yield get_doc_model().open_view(keys=keys, reduce=False)
        self.failUnlessEqual(len(result['rows']), identity_count*2, repr(result))

    def test_one_testmsg(self):
        # When processing a single test message we end up with 2 identies
        # both associated with the same contact

        @defer.inlineCallbacks
        def check_it(result):
            dm = get_doc_model()
            # First determine the contact ID.
            key = ['rd/core/content', 'schema_id', 'rd/contact']
            result = yield dm.open_view(key=key, reduce=False, include_docs=True)

            rows = result['rows']
            # Should be exactly 1 record with a 'contact' schema.
            self.failUnlessEqual(len(rows), 1, str(rows))
            key_type, cid = rows[0]['doc']['rd_key']
            self.failUnlessEqual(key_type, 'contact')

            # should be exact 2 rd/identity/contacts records, each pointing
            # at my contact.
            key = ['rd/core/content', 'schema_id', 'rd/identity/contacts']
            result = yield dm.open_view(key=key, reduce=False, include_docs=True)
            rows = result['rows']
            self.failUnlessEqual(len(rows), 2, str(rows))
            docs = [r['doc'] for r in rows]
            for doc in docs:
                contacts = doc['contacts']
                self.failUnlessEqual(len(contacts), 1, contacts)
                this_id, this_rel = contacts[0]
                self.failUnlessEqual(this_id, cid)
                self.failUnless(this_rel in ['personal', 'public'], this_rel)
            # and that will do!

        dm = get_doc_model()
        exts = ['raindrop.proto.test.test_converter']

        return self.process_doc(exts
                ).addCallback(check_it,
                )

    def test_one_testmsg_common(self):
        # Here we process 2 test messages which result in both messages
        # having an identity in common and one that is unique.  When we
        # process the second message we should notice the shared identity_id
        # is already associated with the contact we created first time round,
        # with the end result we still end up with a single contact, but now
        # have *three* identities for him
        @defer.inlineCallbacks
        def check_it(result):
            # First determine the contact ID.
            key = ['rd/core/content', 'schema_id', 'rd/contact']
            result = yield get_doc_model().open_view(key=key, reduce=False,
                                             include_docs=True)

            rows = result['rows']
            # Should be exactly 1 record with a 'contact' schema.
            self.failUnlessEqual(len(rows), 1, str(rows))
            key_type, cid = rows[0]['doc']['rd_key']
            self.failUnlessEqual(key_type, 'contact')

            # should be exact 3 rd/identity/contacts records, each pointing
            # at my contact.
            key = ['rd/core/content', 'schema_id', 'rd/identity/contacts']
            result = yield get_doc_model().open_view(key=key,
                                             reduce=False,
                                             include_docs=True)

            rows = result['rows']
            self.failUnlessEqual(len(rows), 3, str(rows))
            docs = [r['doc'] for r in rows]
            for doc in docs:
                contacts = doc['contacts']
                self.failUnlessEqual(len(contacts), 1, contacts)
                this_id, this_rel = contacts[0]
                self.failUnlessEqual(this_id, cid)
                self.failUnless(this_rel in ['personal', 'public'], this_rel)
            # and that will do!

        exts = ['raindrop.proto.test.test_converter']
        return self.test_one_testmsg(
                ).addCallback(self.deferMakeAnotherTestMessage
                ).addCallback(lambda _: self.process_doc(exts)
                ).addCallback(check_it,
                ).addCallback(self.deferVerifyCounts, 1, 3
                )

    def test_one_testmsg_unique(self):
        # Here we process 2 test messages but none of the messages emit a
        # common identity ID.  The end result is we end up with 2 contacts;
        # one with 2 identities (from reusing test_one_testmsg), then a second
        # contact with only a single identity
        @defer.inlineCallbacks
        def check_it(result):
            # First determine the 2 contact IDs.
            key = ['rd/core/content', 'schema_id', 'rd/contact']
            result = yield get_doc_model().open_view(key=key, reduce=False,
                                             include_docs=True)

            rows = result['rows']
            # Should be exactly 2 records with a 'contact' schema.
            self.failUnlessEqual(len(rows), 2, str(rows))
            key_type, cid1 = rows[0]['doc']['rd_key']
            self.failUnlessEqual(key_type, 'contact')
            key_type, cid2 = rows[1]['doc']['rd_key']
            self.failUnlessEqual(key_type, 'contact')

            # should be exact 3 rd/identity/contacts records, each pointing
            # at my contact.
            key = ['rd/core/content', 'schema_id', 'rd/identity/contacts']
            result = yield get_doc_model().open_view(key=key, reduce=False,
                                                     include_docs=True)

            rows = result['rows']
            self.failUnlessEqual(len(rows), 3, str(rows))
            docs = [r['doc'] for r in rows]
            for doc in docs:
                contacts = doc['contacts']
                self.failUnlessEqual(len(contacts), 1, contacts)
                this_id, this_rel = contacts[0]
                self.failUnless(this_id in [cid1, cid2])
                self.failUnless(this_rel in ['personal', 'public'], this_rel)
            # and that will do!


        exts = ['raindrop.proto.test.test_converter']
        return self.test_one_testmsg(
                ).addCallback(self.deferMakeAnotherTestMessage
                ).addCallback(lambda _: self.process_doc(exts, False)
                ).addCallback(check_it,
                ).addCallback(self.deferVerifyCounts, 2, 3
                )
