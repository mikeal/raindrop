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
            yield self.doc_model.create_raw_documents(self.account,
                                                      self.bulk_docs
                    ).addCallback(self.saved_bulk_messages, len(self.bulk_docs),
                    )

    def attach(self):
        logger.info("preparing to synch test messages...")
        self.bulk_docs = [] # anything added here will be done in bulk
        # use the cooperator for testing purposes.
        return self.conductor.coop.coiterate(self.sync_generator())

    def check_test_message(self, i):
        logger.debug("seeing if message with ID %d exists", i)
        return self.doc_model.open_document("msg", str(i), "proto/test"
                        ).addCallback(self.process_test_message, i)

    def process_test_message(self, existing_doc, doc_num):
        if existing_doc is None:
            # make an attachment for testing purposes.
            attachments = {"raw-attach" : {"content_type" : 'application/octet-stream',
                                        "data" : 'test\0blob'
                                        }
            }
            doc = dict(
              storage_key=doc_num,
              _attachments=attachments,
              )
            self.bulk_docs.append(('msg', 'proto/test', str(doc_num), doc))
        else:
            logger.info("Skipping test message with ID %d - already exists",
                        doc_num)
            # we are done.

    def saved_bulk_messages(self, result, n):
        logger.debug("Finished saving %d test messages in bulk", n)
        # done

# A 'converter' - takes a proto/test as input and creates a
# 'raw/message/rfc822' as output.
class TestConverter(base.SimpleConverterBase):
    target_type = "msg", "raw/message/rfc822"
    sources = [
        ('msg', 'proto/test'),
    ]

    num_converted = 0
    def simple_convert(self, doc):
        # for the sake of testing the error queue, we cause an error on
        # every 3rd message we process.
        self.num_converted += 1
        if test_next_convert_fails or \
           (test_next_convert_fails is None and self.num_converted % 3 == 0):
            raise RuntimeError("This is a test failure")

        # for the sake of testing, we fetch the raw attachment just to compare
        # its value.
        return self.doc_model.open_attachment(doc['_id'], "raw-attach",
                  ).addCallback(self._cb_got_attachment, doc)

    def _cb_got_attachment(self, attach_content, doc):
        if attach_content != 'test\0blob':
            raise RuntimeError(attach_content)

        me = doc['storage_key']
        # Use the email package to construct a synthetic rfc822 stream.
        msg = Message()
        headers = {'from': 'From: from%(storage_key)d@test.com',
                   'subject' : 'This is test document %(storage_key)d',
                   'message-id' : 'TestMessage%(storage_key)d',
        }
        for h in headers:
            msg[h] = headers[h] % doc

        body = u"Hello, this is test message %(storage_key)d (with extended \xa9haracter!)" % doc
        msg.set_payload(body.encode('utf-8'), 'utf-8')
        #attachments = {"rfc822" : {"content_type" : 'message',
        #                           "data" : msg.get_payload(),
        #                         }
        #              }
        new_doc = {}
        new_doc['body'] = body
        #new_doc['_attachments'] = attachments
        new_doc['multipart'] = False
        new_doc['headers'] = {}        
        new_doc['timestamp'] = 123456
        for hn, hv in msg.items():
            new_doc['headers'][hn.lower()] = hv
        return new_doc

# A 'converter' - takes a proto/test as input and creates a
# 'anno/flags' as output.
class TestFlagsConverter(base.SimpleConverterBase):
    target_type = "msg", "anno/flags"
    sources = [
        ('msg', 'proto/test'),
    ]
    def simple_convert(self, doc):
        return {'seen': False}

# An 'identity spawner' takes proto/test as input and creates a few test
# identities.
class TestIdentitySpawner(base.IdentitySpawnerBase):
    source_type = 'msg', 'proto/test'
    def get_identity_rels(self, source_doc):
        assert source_doc['type'] == self.source_type[1], source_doc
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

    def get_default_contact_props(self, source_doc):
        myid = str(source_doc['storage_key'])
        return {'name' : 'test contact ' + myid}


class TestAccount(base.AccountBase):
  def startSync(self, conductor):
    return TestMessageProvider(self, conductor).attach()
