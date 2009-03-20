# This is an implementation of a 'test' protocol.
import logging
from twisted.internet import defer, error

logger = logging.getLogger(__name__)

from ...proc import base

class TestMessageProvider(object):
    def __init__(self, account, conductor, doc_model):
        self.account = account
        self.conductor = conductor
        self.doc_model = doc_model

    def attach(self):
        logger.info("preparing to synch test messages...")
        # Is a 'DeferredList' more appropriate here?
        d = defer.Deferred()
        num_docs = int(self.account.details.get('num_test_docs', 5))
        logger.info("Creating %d test documents", num_docs)
        for i in xrange(num_docs):
            d.addCallback(self.check_test_message, i)
        d.addCallback(self.finished)
        return d.callback(None)

    def check_test_message(self, result, i):
        logger.debug("seeing if message with ID %d exists", i)
        return self.doc_model.open_document("test.message.%d" % i,
                        ).addCallback(self.process_test_message, i)

    def process_test_message(self, existing_doc, doc_num):
        if existing_doc is None:
            logger.info("Creating new test message with ID %d", doc_num)
            doc = dict(
              storage_key=doc_num,
              )
            did = "test.message.%d" % doc_num
            return self.doc_model.create_raw_document(did, doc, 'proto/test',
                                                      self.account
                        ).addCallback(self.saved_message, doc)
        else:
            logger.info("Skipping test message with ID %d - already exists",
                        doc_num)
            # we are done.

    def finished(self, result):
      self.conductor.on_synch_finished(self.account, result)

    def saved_message(self, result, doc):
        logger.debug("Finished saving test message %r", result)
        # done

# A 'converter' - takes a proto/test as input and creates a
# 'raw/message/rfc822' as output.
class TestConverter(base.ConverterBase):
    def convert(self, doc):
        me = doc['storage_key']
        headers = """\
From: from%(storage_key)d@test.com
To: from%(storage_key)d@test.com
Subject: This is test document %(storage_key)d
""" % doc
        headers = headers.replace('\n', '\r\n')
        body = "Hello, this is test message %(storage_key)d" % doc

        new_doc = dict(headers=headers, body=body)
        return new_doc


class TestAccount(base.AccountBase):
  def __init__(self, db, details):
    self.db = db
    self.details = details

  def startSync(self, conductor, doc_model):
    TestMessageProvider(self, conductor, doc_model).attach()
