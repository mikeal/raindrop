# The first raindrop unittest!

from twisted.internet import task, defer

from raindrop.tests import TestCaseWithTestDB, FakeOptions
from raindrop.model import get_doc_model, encode_proto_id
from raindrop.proto import test as test_proto
from raindrop import pipeline

class TestPipelineBase(TestCaseWithTestDB):
    def get_pipeline(self):
        opts = FakeOptions()
        dm = get_doc_model()
        return pipeline.Pipeline(dm, opts)

    def process_doc(self, doc):
        coop = task.Cooperator()
        pl = self.get_pipeline()
        return coop.coiterate(
                    pl.gen_transition_tasks(doc['_id'], doc['_rev']))

class TestPipeline(TestPipelineBase):
    def test_one_step(self):
        # Test taking a raw message one step along its pipeline.
        test_proto.next_convert_fails = False

        def check_targets_last(lasts_by_seq, target_types):
            docs = [row['doc'] for row in lasts_by_seq]
            db_types = set(doc['type'] for doc in docs)
            self.failUnlessEqual(db_types, target_types)
            return docs

        def check_targets(result, target_types):
            # Our targets should be the last written
            return self.get_last_by_seq(len(target_types),
                        ).addCallback(check_targets_last, target_types
                        )

        # open the test document to get its ID and _rev.
        targets = set(('raw/message/rfc822', 'anno/flags'))
        dm = get_doc_model()
        return dm.open_document('msg', '0', 'proto/test'
                ).addCallback(self.process_doc
                ).addCallback(check_targets, targets
                )

    def test_one_again_does_nothing(self):
        # Test that attempting to process a message which has already been
        # processed is a noop.
        dm = get_doc_model()

        def check_targets_same(lasts, targets_b4):
            # Re-processing should not have modified the targets in any way.
            db_ids = set(row['id'] for row in lasts)
            expected = set(doc['_id'] for doc in targets_b4)
            self.failUnlessEqual(db_ids, expected)

        def check_nothing_done(whateva, targets_b4):
            return self.get_last_by_seq(len(targets_b4),
                        ).addCallback(check_targets_same, targets_b4
                        )

        def reprocess(src_doc, targets_b4):
            return self.process_doc(src_doc
                        ).addCallback(check_nothing_done, targets_b4)

        def do_it_again(target_docs):
            return dm.open_document('msg', '0', 'proto/test'
                            ).addCallback(reprocess, target_docs
                            )

        return self.test_one_step(
                ).addCallback(do_it_again
                )
        

    def test_two_steps(self):
        # Test taking a raw message two steps along its pipeline.
        def check_last_docs(lasts, target_types):
            db_types = set(row['doc']['type'] for row in lasts)
            self.failUnlessEqual(db_types, target_types)

        def process_nexts(targets):
            return defer.DeferredList([self.process_doc(d) for d in targets])

        target_types = set(('raw/message/email', 'aggr/flags'))
        return self.test_one_step(
                ).addCallback(process_nexts,
                ).addCallback(lambda whateva: self.get_last_by_seq(len(target_types))
                ).addCallback(check_last_docs, target_types
                )

    def test_all_steps(self):
        def check_last_doc(lasts):
            self.failUnlessEqual(lasts[0]['id'], 'workqueue!msg')
            self.failUnless(lasts[1]['id'].endswith("!aggr/tags"), lasts)

        test_proto.next_convert_fails = False
        return self.get_pipeline().start(
                ).addCallback(lambda whateva: self.get_last_by_seq(2)
                ).addCallback(check_last_doc
                )

class TestErrors(TestPipelineBase):
    def test_error_stub(self):
        # Test that when a converter fails an appropriate error record is
        # written
        test_proto.next_convert_fails = True

        def check_target_last(lasts):
            # The current pipeline means that the 'raw/message/email' is an
            # error but the 'anno/flags' works...
            expected = set(('anno/flags', 'core/error/msg'))
            types = set([row['doc']['type'] for row in lasts])
            self.failUnlessEqual(types, expected)

        # open the test document to get its ID and _rev.
        dm = get_doc_model()
        return dm.open_document('msg', '0', 'proto/test'
                ).addCallback(self.process_doc
                ).addCallback(lambda whateva: self.get_last_by_seq(2)
                ).addCallback(check_target_last
                )

    def test_reprocess_errors(self):
        # Test that reprocessing an error results in the correct thing.
        dm = get_doc_model()

        def check_target_last(lasts):
            got = set(row['doc']['type'] for row in lasts)
            expected = set(('anno/flags', 'raw/message/rfc822'))
            self.failUnlessEqual(got, expected)

        def start_retry(whateva):
            test_proto.next_convert_fails = False
            return self.get_pipeline().start_retry_errors()

        return self.test_error_stub(
                ).addCallback(start_retry
                ).addCallback(lambda whateva: self.get_last_by_seq(2
                ).addCallback(check_target_last)
                )

    def test_all_steps(self):
        # We test the right thing happens running a 'full' pipeline
        # when our test converter throws an error.
        def check_last_doc(lasts):
            # The tail of the DB should be as below:
            expected = set(['core/workqueue', 'aggr/flags',
                            'anno/flags', 'core/error/msg', 'proto/test'])
            # Note the 'core/error/msg' is the failing conversion (ie, the
            # error stub for the rfc822 message), and no 'email' record exists
            # as it depends on the failing conversion.  The anno and aggr
            # are independent of the failing message, so they complete.
            got = set(l['doc']['type'] for l in lasts)
            self.failUnlessEqual(got, expected)

        test_proto.next_convert_fails = True
        return self.get_pipeline().start(
                ).addCallback(lambda whateva: self.get_last_by_seq(5)
                ).addCallback(check_last_doc
                )
