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

    def process_doc(self, doc, emit_common_ids=True):
        test_proto.test_emit_common_identities = emit_common_ids
        doc_model = get_doc_model()
        if not pipeline.spawners: # XXX - *sob* - misplaced...
            pipeline.load_extensions(doc_model)

        coop = task.Cooperator()
        wq = pipeline.IdentitySpawnerWQ(doc_model, **FakeOptions().__dict__)
        def fake_workqueue():
            for task in wq.generate_tasks(doc['_id'], doc['_rev']):
                yield task.addCallback(wq.consume)
        def log_done(whateva):
            logger.info('process identity_doc done')

        logger.info('process_doc starting')
        return coop.coiterate(fake_workqueue()
                    ).addCallback(log_done)

class TestIDPipeline(TestIDPipelineBase):
    # Test extracting identities and contacts test protocol messages
    # work as expected.
    def deferVerifyCounts(self, _, contact_count, identity_count):
        def verify(results):
            self.failUnlessEqual(len(results), 2)
            (c_ok, c_ret), (i_ok, i_ret) = results
            self.failUnless(c_ok)
            self.failUnlessEqual(len(c_ret['rows']), contact_count, repr(c_ret))
            self.failUnless(i_ok)
            self.failUnlessEqual(len(i_ret['rows']), identity_count, repr(i_ret))
            
        return defer.DeferredList([
            get_doc_model().open_view('raindrop!messages!by',
                                      'by_doc_type',
                                      key="contact"),
            get_doc_model().open_view('raindrop!messages!by',
                                      'by_doc_type',
                                      key="test_identity")
            ]).addCallback(verify)

    def test_one_testmsg(self):
        # When processing a single test message we end up with 2 identies
        # both associated with the same contact
        def extract_and_test(result):
            rows = result['rows']
            cid = rows[0]['key'][0]
            ex_bycontact = [
                     # expected 'key',  expected 'value'
                    ([cid, 'personal'], ['test_identity', '0']),
                    ([cid, 'public'],   ['test_identity', 'common']),
            ]
            # and 'by_id' is the exact inverse.
            ex_byid = [(e[1], e[0]) for e in ex_bycontact]
            return self.failUnlessView('raindrop!identities!by',
                                       'by_contact',
                                       expect=ex_bycontact,
                        ).addCallback(self.deferFailUnlessView,
                                      'raindrop!contacts!all', 'by_identity',
                                      expect=ex_byid,
                                      )

        def determine_contact_id(result):
            return get_doc_model().open_view('raindrop!identities!by',
                                             'by_contact', limit=1
                        ).addCallback(extract_and_test
                        )
            
        dm = get_doc_model()
        return dm.open_document('msg', '0', 'proto/test'
                ).addCallback(self.process_doc
                ).addCallback(determine_contact_id,
                )

    def test_one_testmsg_common(self):
        # Here we process 2 test messages which result in both messages
        # having an identity in common and one that is unique.  When we
        # process the second message we should notice the shared identity_id
        # is already associated with the contact we created first time round,
        # with the end result we still end up with a single contact, but now
        # have *three* identities for him
        def extract_and_test(result):
            rows = result['rows']
            cid = rows[0]['key'][0]
            # Our 1 contact has 3 ids.
            ex_bycontact = [
                ([cid, 'personal'], ['test_identity', '0']),
                ([cid, 'personal'], ['test_identity', '1']),
                ([cid, 'public'],   ['test_identity', 'common']),
            ]
            # and 'by_id' is the exact inverse.
            ex_byid = [(e[1], e[0]) for e in ex_bycontact]
            return self.failUnlessView('raindrop!identities!by',
                                       'by_contact',
                                        expect=ex_bycontact,
                        ).addCallback(self.deferFailUnlessView,
                                      'raindrop!contacts!all', 'by_identity',
                                      expect=ex_byid,
                                      )

        def determine_contact_id(result):
            return get_doc_model().open_view('raindrop!identities!by',
                                             'by_contact', limit=1,
                        ).addCallback(extract_and_test
                        )


        open_doc = get_doc_model().open_document
        return self.test_one_testmsg(
                ).addCallback(self.deferMakeAnotherTestMessage
                ).addCallback(lambda _: open_doc('msg', '1', 'proto/test')
                ).addCallback(self.process_doc
                ).addCallback(determine_contact_id,
                ).addCallback(self.deferVerifyCounts, 1, 3
                )

    def test_one_testmsg_unique(self):
        # Here we process 2 test messages but none of the message emit a
        # common identity ID.  The end result is we end up with 2 contacts;
        # one with 2 identities (from reusing test_one_testmsg), then a second
        # contact with only a single identity
        def extract_and_test(result):
            rows = result['rows']
            cids = [r['key'][0] for r in rows]
            # One of the contact-ids must be the same.
            if cids[0]==cids[1]:
                cid_first = cids[0]
                cid_second = cids[2]
            elif cids[0]==cids[2]:
                cid_first = cids[0]
                cid_second = cids[1]
            elif cids[1]==cids[2]:
                cid_first = cids[1]
                cid_second = cids[0]
            else:
                self.fail(cids)
                
            # Our 1 contact has 3 ids.
            ex_bycontact = [
                        ([cid_first, 'personal'], ['test_identity', '0']),
                        ([cid_first, 'public'],   ['test_identity', 'common']),
                        ([cid_second, 'personal'], ['test_identity', '1'])
                        ]
            # and 'by_id' is the exact inverse.
            ex_byid = [(e[1], e[0]) for e in ex_bycontact]
            return self.failUnlessView('raindrop!identities!by',
                                       'by_contact',
                                        expect=ex_bycontact,
                        ).addCallback(self.deferFailUnlessView,
                                      'raindrop!contacts!all', 'by_identity',
                                      expect=ex_byid,
                                      )

        def determine_contact_id(result):
            return get_doc_model().open_view('raindrop!identities!by',
                                             'by_contact', limit=3
                        ).addCallback(extract_and_test
                        )


        open_doc = get_doc_model().open_document
        return self.test_one_testmsg(
                ).addCallback(self.deferMakeAnotherTestMessage
                ).addCallback(lambda _: open_doc('msg', '1', 'proto/test')
                ).addCallback(self.process_doc, False
                ).addCallback(determine_contact_id,
                )
