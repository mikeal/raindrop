# The first raindrop unittest!

from twisted.internet import task, defer

from raindrop.tests import TestCaseWithTestDB, FakeOptions
from raindrop.model import get_doc_model
from raindrop.proto import test as test_proto
from raindrop import pipeline

import logging
logger = logging.getLogger(__name__)

class TestPipelineBase(TestCaseWithTestDB):
    simple_exts = [
            'raindrop.proto.test.test_converter',
            'raindrop.ext.message.rfc822.rfc822_converter',
            'raindrop.ext.message.rfc822.email_converter',
        ]

    def get_pipeline(self):
        opts = FakeOptions()
        dm = get_doc_model()
        return pipeline.Pipeline(dm, opts)

    def process_doc(self, doc, exts = None):
        doc_model = get_doc_model()
        if not pipeline.extensions: # XXX - *sob* - misplaced...
            pipeline.load_extensions(doc_model)

        p = self.get_pipeline()
        p.options.exts = exts
        return p.start()


class TestPipeline(TestPipelineBase):
    def test_one_step(self):
        # Test taking a raw message one step along its pipeline.
        test_proto.test_next_convert_fails = False

        def check_targets_last(lasts_by_seq, target_types):
            docs = [row['doc'] for row in lasts_by_seq if row['doc']['_id'].startswith('rc!')]
            db_types = set(doc['rd_schema_id'] for doc in docs)
            self.failUnlessEqual(db_types, target_types)
            return docs

        def check_targets(result, target_types):
            # Our targets should be the last written
            return self.get_last_by_seq(len(target_types)*2,
                        ).addCallback(check_targets_last, target_types
                        )

        targets = set(('rd/msg/body', 'rd/msg/email', 'rd/msg/flags',
                       'rd/msg/rfc822', 'rd/msg/test/raw'))
        dm = get_doc_model()
        return dm.open_document('msg', '0', 'proto/test'
                ).addCallback(self.process_doc, self.simple_exts
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

        def reprocess(src_doc, targets_b4):
            return self.process_doc(src_doc, self.simple_exts
                        ).addCallback(check_nothing_done, targets_b4)

        def do_it_again(target_docs):
            return dm.open_document('msg', '0', 'proto/test'
                            ).addCallback(reprocess, target_docs
                            )

        return self.test_one_step(
                ).addCallback(do_it_again
                )


class TestErrors(TestPipelineBase):
    def test_error_stub(self):
        # Test that when a converter fails an appropriate error record is
        # written
        test_proto.test_next_convert_fails = True

        def check_target_last(lasts):
            expected = set(('core/error/msg',
                            'workqueue!msg!raindrop.proto.test.TestConverter'))
            types = set([row['doc']['type'] for row in lasts])
            self.failUnlessEqual(types, expected)

        exts = ['raindrop.proto.test.TestConverter']

        # open the test document to get its ID and _rev.
        dm = get_doc_model()
        return dm.open_document('msg', '0', 'proto/test'
                ).addCallback(self.process_doc, exts
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
            return self.get_pipeline().start_retry_errors()

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
            expected = set(['workqueue!msg!raindrop.proto.test.TestConverter', 
                            'core/error/msg', 'proto/test'])
            # Note the 'core/error/msg' is the failing conversion (ie, the
            # error stub for the rfc822 message), and no 'email' record exists
            # as it depends on the failing conversion.
            got = set(l['doc']['type'] for l in lasts)
            self.failUnlessEqual(got, expected)

        test_proto.test_next_convert_fails = True
        p = self.get_pipeline()
        p.options.exts = self.simple_exts + self.extra_exts
        return p.start(
                ).addCallback(lambda whateva: self.get_last_by_seq(3)
                ).addCallback(check_last_doc
                )
