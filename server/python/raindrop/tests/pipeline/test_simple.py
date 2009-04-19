# The first raindrop unittest!
# execute via: path/to/twisted/scripts/trial.py path/to/this_file.py

from twisted.internet import task

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

        def open_target(whateva):
            return dm.open_document('msg', '0', 'raw/message/rfc822')

        def check_target_last(lasts_by_seq, doc):
            self.failUnlessEqual(lasts_by_seq[0]['id'], doc['_id'])
            return doc

        def check_target(doc):
            # Our doc should be the last written
            self.failUnless(doc)
            return self.get_last_by_seq(
                        ).addCallback(check_target_last, doc
                        )

        # open the test document to get its ID and _rev.
        dm = get_doc_model()
        return dm.open_document('msg', '0', 'proto/test'
                ).addCallback(self.process_doc
                ).addCallback(open_target
                ).addCallback(check_target
                )

    def test_one_again_does_nothing(self):
        # Test that attempting to process a message which has already been
        # processed is a noop.
        dm = get_doc_model()

        def check_target_same(lasts, target_b4):
            # Re-processing should not have modified the target in any way.
            self.failUnlessEqual(lasts[0]['doc'], target_b4)

        def check_nothing_done(whateva, target_b4):
            return self.get_last_by_seq(
                        ).addCallback(check_target_same, target_b4
                        )

        def reprocess(src_doc, target_b4):
            return self.process_doc(src_doc
                        ).addCallback(check_nothing_done, target_b4)

        def do_it_again(target_doc):
            return dm.open_document('msg', '0', 'proto/test'
                            ).addCallback(reprocess, target_doc
                            )

        return self.test_one_step(
                ).addCallback(do_it_again
                )
        

    def test_two_steps(self):
        # Test taking a raw message two steps along its pipeline.
        def check_last_doc(lasts):
            self.failUnless(lasts[0]['id'].endswith("!raw/message/email"), lasts)

        return self.test_one_step(
                ).addCallback(self.process_doc
                ).addCallback(lambda whateva: self.get_last_by_seq()
                ).addCallback(check_last_doc
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

        def open_target(whateva):
            return dm.open_document('msg', '0', 'raw/message/rfc822')

        def check_target_last(lasts_by_seq, doc):
            self.failUnlessEqual(lasts_by_seq[0]['id'], doc['_id'])
            self.failUnlessEqual(doc['type'], 'core/error/msg')
            self.failUnless('This is a test failure' in doc['error_details'],
                            doc['error_details'])
            return doc

        def check_target(doc):
            # Our doc should be the last written and be an error records.
            self.failUnless(doc)
            return self.get_last_by_seq(
                        ).addCallback(check_target_last, doc
                        )

        # open the test document to get its ID and _rev.
        dm = get_doc_model()
        return dm.open_document('msg', '0', 'proto/test'
                ).addCallback(self.process_doc
                ).addCallback(open_target
                ).addCallback(check_target
                )

    def test_reprocess_errors(self):
        # Test that reprocessing an error results in the correct thing.
        dm = get_doc_model()
        def open_target(whateva):
            return dm.open_document('msg', '0', 'raw/message/rfc822')

        def check_target_last(lasts_by_seq, doc):
            self.failUnlessEqual(lasts_by_seq[0]['id'], doc['_id'])
            return doc

        def check_target(doc):
            # Our doc should be the last written
            self.failUnless(doc)
            return self.get_last_by_seq(
                        ).addCallback(check_target_last, doc
                        )

        def start_retry(whateva):
            test_proto.next_convert_fails = True
            return self.get_pipeline().start_retry_errors()

        return self.test_error_stub(
                ).addCallback(start_retry
                ).addCallback(open_target
                ).addCallback(check_target
                )

    def test_all_steps(self):
        # We test the right thing happens running a 'full' pipeline
        # when our test converter throws an error.
        def check_last_doc(lasts):
            self.failUnlessEqual(lasts[0]['id'], 'workqueue!msg')
            self.failUnlessEqual(lasts[1]['doc']['type'], 'core/error/msg')

        test_proto.next_convert_fails = True
        return self.get_pipeline().start(
                ).addCallback(lambda whateva: self.get_last_by_seq(2)
                ).addCallback(check_last_doc
                )
