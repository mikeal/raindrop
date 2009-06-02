# The first raindrop unittest!

from twisted.internet import task, defer

from raindrop.tests import TestCaseWithTestDB, FakeOptions
from raindrop.model import get_doc_model
from raindrop.proto import test as test_proto

import logging
logger = logging.getLogger(__name__)

class TestPipelineBase(TestCaseWithTestDB):
    use_chasing_pipeline = True
    simple_exts = [
            'rd.test.core.test_converter',
            'rd.ext.core.msg-rfc-to-email',
            'rd.ext.core.msg-email-to-body',
        ]


    @defer.inlineCallbacks
    def process_doc(self, exts = None):
        self.pipeline.options.exts = exts
        if self.use_chasing_pipeline:
            doc_model = get_doc_model()
            # populate our test DB with the raw message(s).
            _ = yield self.deferMakeAnotherTestMessage(None)
            # execute our pipeline
            _ = self.pipeline.start()
        else:
            self.pipeline.prepare_sync_processor()
            # make the test message - this should have done everything when
            # it returns.
            _ = yield self.deferMakeAnotherTestMessage(None)
            self.pipeline.finish_sync_processor()


class TestPipeline(TestPipelineBase):
    def test_one_step(self):
        # Test taking a raw message one step along its pipeline.
        test_proto.test_next_convert_fails = False
        test_proto.test_emit_identities = False

        def check_targets_last(lasts_by_seq, target_types):
            docs = [row['doc'] for row in lasts_by_seq if row['doc']['_id'].startswith('rc!')]
            db_types = set(doc['rd_schema_id'] for doc in docs[:len(target_types)])
            self.failUnlessEqual(db_types, target_types)
            return docs

        def check_targets(result, target_types):
            # Our targets should be the last written
            return self.get_last_by_seq(len(target_types)*2,
                        ).addCallback(check_targets_last, target_types
                        )

        targets = set(('rd.msg.body', 'rd.msg.email', 'rd.msg.flags',
                       'rd.msg.rfc822', 'rd.msg.test.raw'))
        dm = get_doc_model()
        return self.process_doc(self.simple_exts
                ).addCallback(check_targets, targets
                )

    def test_one_again_does_nothing(self):
        # Test that attempting to process a message which has already been
        # processed is a noop.
        dm = get_doc_model()

        def check_targets_same(lasts, targets_b4):
            # Re-processing should not have modified the targets in any way.
            db_ids = set(row['id'] for row in lasts if row['id'].startswith('rc!'))
            expected = set(doc['_id'] for doc in targets_b4)
            self.failUnlessEqual(db_ids, expected)

        def check_nothing_done(whateva, targets_b4):
            return self.get_last_by_seq(len(targets_b4)*2,
                        ).addCallback(check_targets_same, targets_b4
                        )

        def reprocess(targets_b4):
            return self.process_doc(self.simple_exts
                        ).addCallback(check_nothing_done, targets_b4)

        return self.test_one_step(
                ).addCallback(reprocess
                )

class TestPipelineSync(TestPipeline):
    use_chasing_pipeline = False

class TestErrors(TestPipelineBase):
    def test_error_stub(self):
        # Test that when a converter fails an appropriate error record is
        # written
        test_proto.test_next_convert_fails = True

        def check_target_last(lasts):
            expected = set(('core/error/msg',
                            'workqueue!msg!rd.test.core.test_converter'))
            types = set([row['doc']['type'] for row in lasts])
            self.failUnlessEqual(types, expected)

        exts = ['rs.test.core.test_converter']

        # open the test document to get its ID and _rev.
        dm = get_doc_model()
        return self.process_doc(exts
                ).addCallback(lambda whateva: self.get_last_by_seq(2)
                ).addCallback(check_target_last
                )

    def test_reprocess_errors(self):
        # Test that reprocessing an error results in the correct thing.
        dm = get_doc_model()

        def check_target_last(lasts, expected):
            got = set(row['doc']['type'] for row in lasts)
            self.failUnlessEqual(got, expected)

        def start_retry(result):
            test_proto.test_next_convert_fails = False
            logger.info('starting retry for %r', result)
            return self.pipeline.start_retry_errors()

        expected = set(('raw/message/rfc822',))
        return self.test_error_stub(
                ).addCallback(start_retry
                ).addCallback(lambda whateva: self.get_last_by_seq(len(expected)
                ).addCallback(check_target_last, expected)
                )

    def test_all_steps(self):
        # We test the right thing happens running a 'full' pipeline
        # when our test converter throws an error.
        def check_last_doc(lasts):
            # The tail of the DB should be as below:
            expected = set(['workqueue!msg!rs.test.core.test_converter',
                            'core/error/msg', 'proto/test'])
            # Note the 'core/error/msg' is the failing conversion (ie, the
            # error stub for the rfc822 message), and no 'email' record exists
            # as it depends on the failing conversion.
            got = set(l['doc']['type'] for l in lasts)
            self.failUnlessEqual(got, expected)

        test_proto.test_next_convert_fails = True
        self.pipeline.options.exts = self.simple_exts
        return self.pipeline.start(
                ).addCallback(lambda whateva: self.get_last_by_seq(3)
                ).addCallback(check_last_doc
                )

class TestErrorsSync(TestErrors):
    use_chasing_pipeline = False
