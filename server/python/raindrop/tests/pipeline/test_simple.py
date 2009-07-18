# The first raindrop unittest!

from twisted.internet import task, defer

from raindrop.tests import TestCaseWithTestDB, FakeOptions
from raindrop.model import get_doc_model
from raindrop.proto import test as test_proto

import logging
logger = logging.getLogger(__name__)

class TestPipelineBase(TestCaseWithTestDB):
    use_chasing_pipeline = True
    extensions = None # default extensions for test.
    simple_extensions = [
            'rd.test.core.test_converter',
            'rd.ext.core.msg-rfc-to-email',
            'rd.ext.core.msg-email-to-body',
        ]

    @defer.inlineCallbacks
    def process_doc(self, exts = None):
        self.pipeline.options.exts = exts or self.extensions
        self.pipeline.options.no_process = self.use_chasing_pipeline
        # populate our test DB with the raw message(s).
        _ = yield self.deferMakeAnotherTestMessage(None)
        if self.use_chasing_pipeline:
            # execute our pipeline
            _ = yield self.pipeline.start()

    def get_last_by_seq(self, n=1):
        def extract_rows(result):
            rows = result['rows']
            ret = []
            for row in rows:
                if 'doc' in row:
                    ret.append(row)
                    if len(ret)>=n:
                        break
            assert len(ret)==n # may have too many deleted items and need to re-request?
            return ret

        return get_doc_model().db.listDocsBySeq(limit=n*2,
                                                descending=True,
                                                include_docs=True
                ).addCallback(extract_rows
                )


class TestPipeline(TestPipelineBase):
    extensions = TestPipelineBase.simple_extensions
    def test_one_step(self):
        # Test taking a raw message one step along its pipeline.
        
        test_proto.set_test_options(next_convert_fails=False,
                                    emit_identities=False)

        def check_targets_last(lasts_by_seq, target_types):
            assert len(target_types)==len(lasts_by_seq)
            db_types = set(row['doc']['rd_schema_id'] for row in lasts_by_seq)
            self.failUnlessEqual(db_types, target_types)
            return target_types

        def check_targets(result, target_types):
            # Our targets should be the last written
            return self.get_last_by_seq(len(target_types),
                        ).addCallback(check_targets_last, target_types
                        )

        targets = set(('rd.msg.body', 'rd.msg.email', 'rd.msg.flags', 'rd.tags',
                       'rd.msg.rfc822', 'rd.msg.test.raw'))
        dm = get_doc_model()
        return self.process_doc(
                ).addCallback(check_targets, targets
                )

    def test_one_again_does_nothing(self):
        # Test that attempting to process a message which has already been
        # processed is a noop.
        dm = get_doc_model()

        def check_targets_same(lasts, targets_b4):
            # Re-processing should not have modified the targets in any way.
            db_types = set(row['doc']['rd_schema_id'] for row in lasts)
            self.failUnlessEqual(db_types, targets_b4)

        def check_nothing_done(whateva, targets_b4):
            return self.get_last_by_seq(len(targets_b4),
                        ).addCallback(check_targets_same, targets_b4
                        )

        def reprocess(targets_b4):
            return self.process_doc(
                        ).addCallback(check_nothing_done, targets_b4)

        return self.test_one_step(
                ).addCallback(reprocess
                )

class TestPipelineSync(TestPipeline):
    use_chasing_pipeline = False

class TestErrors(TestPipelineBase):
    extensions = ['rd.test.core.test_converter']
    def test_error_stub(self):
        # Test that when a converter fails an appropriate error record is
        # written
        test_proto.set_test_options(next_convert_fails=True)

        def check_target_last(lasts):
            expected = set(('rd.core.error', 'rd.msg.test.raw'))
            types = set([row['doc']['rd_schema_id'] for row in lasts])
            self.failUnlessEqual(types, expected)

        # open the test document to get its ID and _rev.
        return self.process_doc(
                ).addCallback(lambda whateva: self.get_last_by_seq(2)
                ).addCallback(check_target_last
                )

    def test_reprocess_errors(self):
        # Test that reprocessing an error results in the correct thing.
        dm = get_doc_model()

        def check_target_last(lasts, expected):
            got = set(row['doc']['rd_schema_id'] for row in lasts)
            self.failUnlessEqual(got, expected)

        def start_retry(result):
            test_proto.set_test_options(next_convert_fails=False,
                                        emit_identities=False)
            logger.info('starting retry for %r', result)
            return self.pipeline.start_retry_errors()

        # after the retry we should have the 3 schemas created by our test proto
        expected = set(('rd.msg.flags', 'rd.tags', 'rd.msg.rfc822', 'rd.msg.test.raw'))
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
            expected = set(['rd.core.error', 'rd.msg.test.raw'])
            # Note the 'rd.core.error' is the failing conversion (ie, the
            # error stub), and no 'later' records exist as they all depend
            # on the failing conversion.
            got = set(l['doc'].get('rd_schema_id') for l in lasts)
            self.failUnlessEqual(got, expected)

        test_proto.set_test_options(next_convert_fails=True)
        return self.process_doc(
                ).addCallback(lambda whateva: self.get_last_by_seq(2)
                ).addCallback(check_last_doc
                )

class TestErrorsSync(TestErrors):
    use_chasing_pipeline = False
