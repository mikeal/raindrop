# This is an implementation of a 'test' protocol.
import logging
from twisted.internet import defer, error

logger = logging.getLogger(__name__)

from ...proc import base


# May be set by the test suite.  Note some of our 'test' extensions also
# refer to these variables, so just because they aren't referenced here
# doesn't mean they aren't used!
test_next_convert_fails = None
test_emit_common_identities = False
# "normal" behaviour
test_emit_identities = False
# overrides the config option.
test_num_test_docs = None

# A helper for the test suite to set/reset options.
def set_test_options(next_convert_fails=False, emit_common_identities=False,
                      emit_identities=False):
    global test_next_convert_fails, test_emit_common_identities
    global test_emit_identities

    test_next_convert_fails = next_convert_fails
    test_emit_common_identities = emit_common_identities
    test_emit_identities = emit_identities


class TestMessageProvider(object):
    # The 'id' of this extension
    # XXX - should be managed by our caller once these 'protocols' become
    # regular extensions.
    rd_extension_id = 'proto.test'
    def __init__(self, account, conductor):
        self.account = account
        self.doc_model = account.doc_model # this is a little confused...
        self.conductor = conductor

    def sync_generator(self):
        if test_num_test_docs is not None:
            num_docs = test_num_test_docs
        else:
            num_docs = int(self.account.details.get('num_test_docs', 5))
        logger.info("Creating %d test documents", num_docs)
        for i in xrange(num_docs):
            yield self.check_test_message(i)
        if self.bulk_docs:
            pipeline = self.conductor.pipeline
            yield pipeline.provide_schema_items(self.bulk_docs
                    ).addCallback(self.saved_bulk_messages, len(self.bulk_docs),
                    )

    def attach(self):
        logger.info("preparing to synch test messages...")
        self.bulk_docs = [] # anything added here will be done in bulk
        # use the cooperator for testing purposes.
        return self.conductor.coop.coiterate(self.sync_generator())

    def check_test_message(self, i):
        logger.debug("seeing if message with ID %d exists", i)
        rd_key = ['email', 'TestMessage%d' % i]
        return self.doc_model.open_schemas(rd_key, "rd.msg.test.raw"
                        ).addCallback(self.process_test_message, i)

    def process_test_message(self, schemas, doc_num):
        if not schemas:
            # make an attachment for testing purposes.
            attachments = {"raw-attach" : {"content_type" : 'application/octet-stream',
                                        "data" : 'test\0blob'
                                        }
            }
            rd_key = ['email', 'TestMessage%d' % doc_num]
            data = dict(
              storage_key=doc_num,
              _attachments=attachments,
              )
            info = {'schema_id': 'rd.msg.test.raw',
                    'ext_id': self.rd_extension_id,
                    'rd_source': None,
                    'rd_key': rd_key,
                    'items': data,
                    }
            self.bulk_docs.append(info)
            # and we 'assert the existance' of 2 identities - one unique to
            # our test message and one common for all.
            if test_emit_identities:
                self.bulk_docs.append({
                        'schema_id': 'rd.identity.exists',
                        'ext_id': self.rd_extension_id,
                        'rd_source': None,
                        'rd_key': ['identity', ['test_identity', str(doc_num)]],
                        'items': None,
                    })
                self.bulk_docs.append({
                        'schema_id': 'rd.identity.exists',
                        'ext_id': self.rd_extension_id,
                        'rd_source': None,
                        'rd_key': ['identity', ['test_identity', 'common']],
                        'items': None,
                    })
        else:
            logger.info("Skipping test message with ID %d - already exists",
                        doc_num)
            # we are done.

    def saved_bulk_messages(self, result, n):
        logger.debug("Finished saving %d test messages in bulk", n)
        # done

class TestAccount(base.AccountBase):
    def startSync(self, conductor):
        return TestMessageProvider(self, conductor).attach()

    def get_identities(self):
        return [('test_identity', 'me')]
