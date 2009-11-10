# test of the back-end's document-model.
from raindrop.tests import TestCaseWithTestDB, FakeOptions
from raindrop.model import get_doc_model

from twisted.internet import defer

class TestSchemas(TestCaseWithTestDB):
    def _make_test_schema_item(self, attach_data="hello\0there"):
        items = {'field' : 'value',
                }
        si = {'rd_key' : ['test', 'test.1'],
              'rd_schema_id': 'rd.test.whateva',
              'rd_ext_id' : 'rd.testsuite',
              'items': items,
              'attachments' :
                {'test' : {'data' : attach_data,
                           'content_type': 'application/octect-stream',
                           }
                },
              }
        return si

    def _check_only_schema_in_doc(self, doc, si):
        self.failUnlessEqual(doc['rd_key'], si['rd_key'])
        self.failUnlessEqual(doc['rd_schema_id'], si['rd_schema_id'])
        items = doc['rd_schema_items']
        self.failUnlessEqual(len(items), 1)
        self.failUnless(si['rd_ext_id'] in items)
        item = items[si['rd_ext_id']]
        self.failUnlessEqual(item['rd_source'], None)
        # must not be deleted
        self.failIf('_deleted' in doc)
        # the fields should be in the top-level
        self.failUnlessEqual(item['schema'], None)
        for field_name, field_value in si['items'].iteritems():
            if not field_name.startswith('_'):
                self.failUnlessEqual(doc[field_name], field_value)
        # and all document items must also be in the si
        for field_name, field_value in doc.iteritems():
            if not field_name.startswith('_') and not field_name.startswith('rd_'):
                self.failUnlessEqual(si['items'][field_name], field_value)
        # The doc itself should have the attachments from the item, and only
        # those attachments, prefixed
        seen = set()
        for attach_name, attach_data in doc['_attachments'].iteritems():
            self.failUnless('/' in attach_name, attach_name)
            ext, base = attach_name.split("/", 1)
            if '_deleted' in attach_data:
                continue
            self.failUnlessEqual(ext, si['rd_ext_id'])
            seen.add(attach_name)
        expected = set("%s/%s" % (si['rd_ext_id'], n) for n in si['attachments'])
        self.failUnlessEqual(seen, expected)

    def test_add_single_item(self):
        si = self._make_test_schema_item()
        doc = {}
        self.doc_model._add_item_to_doc(doc, si)
        self._check_only_schema_in_doc(doc, si)
        return doc, si

    def test_add_remove_single_item(self):
        si = self._make_test_schema_item()
        doc = {}
        self.doc_model._add_item_to_doc(doc, si)
        si['_deleted'] = True
        si['_rev'] = "dummy" # or we assert!
        self.doc_model._add_item_to_doc(doc, si)
        self.failUnlessEqual(doc.get('_deleted'), True)
        self.failUnlessEqual(doc.get('_rev'), 'dummy')

    def test_add_remove_null_item(self):
        si1 = {'rd_key' : ['test', 'test.1'],
               'rd_schema_id': 'rd.test.exists',
               'rd_ext_id' : 'rd.testsuite.1',
               'items': None,
               }
        si2 = {'rd_key' : ['test', 'test.1'],
               'rd_schema_id': 'rd.test.exists',
               'rd_ext_id' : 'rd.testsuite.2',
               'items': None,
               }
        doc = {}
        self.doc_model._add_item_to_doc(doc, si1)
        self.doc_model._add_item_to_doc(doc, si2)
        si1['_deleted'] = True
        si1['_rev'] = si2['_rev'] = "dummy" # or we assert!
        self.doc_model._add_item_to_doc(doc, si1)
        # now should only be 1 item - si2.
        self.failIf('_deleted' in doc)
        self.failUnlessEqual(len(doc['rd_schema_items']), 1)
        self.failUnless('rd.testsuite.2' in doc['rd_schema_items'])
        self.failUnless('schema' in doc['rd_schema_items']['rd.testsuite.2'])
        # but the schemas should be empty in these items.
        self.failIf(doc['rd_schema_items']['rd.testsuite.2']['schema'])

        # now delete si2 - should be deleted.
        si2['_deleted'] = True
        self.doc_model._add_item_to_doc(doc, si2)
        self.failUnlessEqual(doc.get('_deleted'), True)
        self.failUnlessEqual(doc.get('_rev'), 'dummy')

    def test_add_multi_items(self):
        doc, si = self.test_add_single_item()
        si2 = si.copy()
        items = {'field2' : 'value2'}
        si2['items'] = items
        si2['attachments'] = \
                    {'test' : {'data' : 'more\0data',
                               'content_type': 'application/octect-stream',
                               }
                    }

        si2['rd_ext_id'] = 'rd.testsuite.2'
        self.doc_model._add_item_to_doc(doc, si2)
        items = doc['rd_schema_items']
        self.failUnlessEqual(len(items), 2)
        self.failUnless(si['rd_ext_id'] in items and si2['rd_ext_id'] in items)
        # the fields from both should be in the top-level doc
        for silook in (si, si2):
            item = items[silook['rd_ext_id']]
            for field_name, field_value in silook['items'].iteritems():
                if not field_name.startswith('_'):
                    self.failUnlessEqual(doc[field_name], field_value)
                    self.failUnlessEqual(item['schema'][field_name], field_value)

        # delete the first schema
        si['_deleted'] = True
        si['_rev'] = 'dummy'
        self.doc_model._add_item_to_doc(doc, si)
        # si2 should be the only schema left
        self._check_only_schema_in_doc(doc, si2)

    @defer.inlineCallbacks
    def test_create_single_item(self):
        si = self._make_test_schema_item()
        info = (yield self.doc_model.create_schema_items([si]))[0]
        doc = (yield self.doc_model.open_documents_by_id([info['id']],
                                                         attachments=True))[0]
        self._check_only_schema_in_doc(doc, si)

    @defer.inlineCallbacks
    def test_create_remove_single_item(self):
        si = self._make_test_schema_item()
        info = (yield self.doc_model.create_schema_items([si]))[0]
        si['_deleted'] = True
        si['_rev'] = info['rev']
        info = (yield self.doc_model.create_schema_items([si]))[0]
        # attempt to open the doc - we should get back none.
        doc = (yield self.doc_model.open_documents_by_id([info['id']]))[0]
        self.failUnlessEqual(doc, None)


class TestAttachments(TestCaseWithTestDB):
    @defer.inlineCallbacks
    def _check_rev_last(self, id, rev, attach_data):
        docs = yield self.doc_model.open_documents_by_id([id])
        self.failUnlessEqual(len(docs), 1)
        self.failUnlessEqual(docs[0]['_id'], id)
        self.failUnlessEqual(docs[0]['_rev'], rev)
        got = yield self.doc_model.db.openDoc(id, attachment='rd.testsuite/test')
        # first test lengths are the same to mostly avoid dumping big strings
        self.failUnlessEqual(len(got), len(attach_data))
        self.failUnlessEqual(got, attach_data)

    def _make_test_schema_item(self, attach_data):
        items = {'field' : 'value',
                }
        si = {'rd_key' : ['test', 'test.1'],
              'rd_schema_id': 'rd.test.whateva',
              'rd_ext_id' : 'rd.testsuite',
              'items': items,
              'attachments' :
                {'test' : {'data' : attach_data,
                           'content_type': 'application/octect-stream',
                           }
                },
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
        doc['_attachments'] = {'rd.testsuite/test' :
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
