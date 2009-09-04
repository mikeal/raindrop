# test of the back-end's document-model.
from raindrop.tests import TestCaseWithTestDB, FakeOptions
from raindrop.model import get_doc_model

from twisted.internet import defer


class TestAttachments(TestCaseWithTestDB):
    @defer.inlineCallbacks
    def _check_rev_last(self, id, rev, attach_data):
        docs = yield self.doc_model.open_documents_by_id([id])
        self.failUnlessEqual(len(docs), 1)
        self.failUnlessEqual(docs[0]['_id'], id)
        self.failUnlessEqual(docs[0]['_rev'], rev)
        got = yield self.doc_model.db.openDoc(id, attachment='test')
        # first test lengths are the same to mostly avoid dumping big strings
        self.failUnlessEqual(len(got), len(attach_data))
        self.failUnlessEqual(got, attach_data)

    def _make_test_schema_item(self, attach_data):
        items = {'field' : 'value',
                 '_attachments' :
                    {'test' : {'data' : attach_data,
                               'content_type': 'application/octect-stream',
                               }
                    },
                }
        si = {'rd_key' : ['test', 'test.1'],
              'schema_id': 'rd.test.whateva',
              'ext_id' : 'rd.testsuite',
              'items': items,
              }
        return si

    @defer.inlineCallbacks
    def test_create_schema_items_small(self, attach_data='foo\0bar'):
        si = self._make_test_schema_item(attach_data)
        ret = yield self.doc_model.create_schema_items([si])
        _ = yield self._check_rev_last(ret[0]['id'], ret[0]['rev'], attach_data)

    @defer.inlineCallbacks
    def test_create_schema_items_large(self):
        data = '\0' * (self.doc_model.MAX_INLINE_ATTACH_SIZE+10)
        _ = yield self.test_create_schema_items_small(data)

    @defer.inlineCallbacks
    def test_update_docs_small(self, attach_data='foo\0bar'):
        si = self._make_test_schema_item(attach_data)
        ret = yield self.doc_model.create_schema_items([si])
        docs = yield self.doc_model.open_documents_by_id([ret[0]['id']])
        doc = docs[0]
        doc['field'] = 'new_value'
        doc['_attachments'] = {'test' :
                                {'data' : attach_data * 2,
                                 'content_type': 'application/octect-stream',
                                }
                              }
        ret = yield self.doc_model.update_documents([doc])
        _ = yield self._check_rev_last(ret[0]['id'], ret[0]['rev'], attach_data*2)

    @defer.inlineCallbacks
    def test_update_docs_large(self, attach_data='foo\0bar'):
        data = '\0' * (self.doc_model.MAX_INLINE_ATTACH_SIZE+10)
        _ = yield self.test_update_docs_small(data)
