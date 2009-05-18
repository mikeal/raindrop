# This is an implementation of a 'test' protocol.
import logging
from twisted.internet import defer, error
from email.message import Message

logger = logging.getLogger(__name__)

from ...proc import base

# May be set to True or False by the test suite, or remains None for
# "normal" behaviour
test_next_convert_fails = None
test_emit_common_identities = False
# overrides the config option.
test_num_test_docs = None

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
            yield self.doc_model.create_schema_items(self.bulk_docs
                    ).addCallback(self.saved_bulk_messages, len(self.bulk_docs),
                    )

    def attach(self):
        logger.info("preparing to synch test messages...")
        self.bulk_docs = [] # anything added here will be done in bulk
        # use the cooperator for testing purposes.
        return self.conductor.coop.coiterate(self.sync_generator())

    def check_test_message(self, i):
        logger.debug("seeing if message with ID %d exists", i)
        rd_key = ['raindrop.test.message', i]
        return self.doc_model.open_schemas(rd_key, "rd/msg/test/raw"
                        ).addCallback(self.process_test_message, i)

    def process_test_message(self, schemas, doc_num):
        if not schemas:
            # make an attachment for testing purposes.
            attachments = {"raw-attach" : {"content_type" : 'application/octet-stream',
                                        "data" : 'test\0blob'
                                        }
            }
            rd_key = ['raindrop.test.message', doc_num]
            data = dict(
              storage_key=doc_num,
              _attachments=attachments,
              )
            info = {'schema_id': 'rd/msg/test/raw',
                    'ext_id': self.rd_extension_id,
                    'rd_source': None,
                    'rd_key': rd_key,
                    'items': data,
                    }
            self.bulk_docs.append(info)
        else:
            logger.info("Skipping test message with ID %d - already exists",
                        doc_num)
            # we are done.

    def saved_bulk_messages(self, result, n):
        logger.debug("Finished saving %d test messages in bulk", n)
        # done

num_converted = 0

# A 'converter' - takes a proto/test as input and creates a
# 'rd/msg/rfc822 schema as output, which in turn will force the
# email schema converters to run to create body etc schemas.
@base.raindrop_extension('rd/msg/test/raw')
def test_converter(src):
    global num_converted
    # for the sake of testing the error queue, we cause an error on
    # every 3rd message we process.
    num_converted += 1
    if test_next_convert_fails or \
       (test_next_convert_fails is None and self.num_converted % 3 == 0):
        raise RuntimeError("This is a test failure")

    # for the sake of testing, we fetch the raw attachment just to compare
    # its value.
    return doc_model.open_schema_attachment(src, "raw-attach"
                    ).addCallback(_cb_got_attachment, src, emit_schema
                    )

def _cb_got_attachment(attach_content, src, emit_schema):
    if attach_content != 'test\0blob':
        raise RuntimeError(attach_content)

    me = src['storage_key']
    # Use the email package to construct a synthetic rfc822 stream.
    msg = Message()
    headers = {'from': 'From: from%(storage_key)d@test.com',
               'subject' : 'This is test document %(storage_key)d',
               'message-id' : 'TestMessage%(storage_key)d',
    }
    for h in headers:
        msg[h] = headers[h] % src

    body = u"Hello, this is test message %(storage_key)d (with extended \xa9haracter!)" % src
    msg.set_payload(body.encode('utf-8'), 'utf-8')
    attachments = {"rfc822" : {"content_type" : 'message',
                               "data" : msg.get_payload(),
                             }
                  }
    
    data = {}
    data['_attachments'] = attachments
    emit_schema('rd/msg/rfc822', data)

    # emit a 'flags' schema too just for fun
    emit_schema('rd/msg/flags', {'seen': False})

   
# An 'identity spawner' takes proto/test as input and creates a few test
# identities.
@base.raindrop_identity_extension('rd/msg/test/raw')
def get_identity_rels(source_doc):
    # We want every 'test message' to result in 2 identities - one
    # unique to the message and one common across all.
    myid = str(source_doc['storage_key'])
    # invent relationships called 'public' and 'personal'...
    ret = [
        (('test_identity', myid), 'personal'),
    ]
    if test_emit_common_identities:
        ret.append((('test_identity', 'common'), 'public'))
    return ret

class TestAccount(base.AccountBase):
  def startSync(self, conductor):
    return TestMessageProvider(self, conductor).attach()
