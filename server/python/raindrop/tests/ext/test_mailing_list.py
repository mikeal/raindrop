from twisted.internet import defer

from raindrop.tests import TestCaseWithCorpus

class TestSimpleCorpus(TestCaseWithCorpus):
    @defer.inlineCallbacks
    def test_simple_mailing_list(self):
        ndocs = yield self.load_corpus('hand-rolled',
                                       'mailing-list-email-simple')
        self.failUnlessEqual(ndocs, 1) # failed to load any corpus docs???
        _ = yield self.pipeline.start()

        # There should be exactly one rd.msg.email.mailing-list document.
        key = ['rd.core.content', 'schema_id', 'rd.msg.email.mailing-list']
        result = yield self.doc_model.open_view(key=key, reduce=False,
                                                include_docs=True)
        rows = result['rows']
        self.failUnlessEqual(len(rows), 1,
                             'number of rd.msg.email.mailing-list docs')

        # The rd.msg.email.mailing-list document should have one property
        # (besides the CouchDB and Raindrop private properties): list_id.
        doc = rows[0]['doc']
        expected_properties = ['list_id']
        actual_properties = sorted([key for key in doc.keys()
                                        if not key.startswith('_')
                                        and not key.startswith('rd_')])
        self.failUnlessEqual(actual_properties, expected_properties,
                             'rd.msg.email.mailing-list properties')

        # The list_id property should have the right value.
        self.failUnlessEqual(doc['list_id'],
                             'test.lists.example.com',
                             'rd.msg.email.mailing-list::list_id')

        # There should be exactly one rd.mailing-list document.
        key = ['rd.core.content', 'schema_id', 'rd.mailing-list']
        result = yield self.doc_model.open_view(key=key, reduce=False,
                                                include_docs=True)
        rows = result['rows']
        self.failUnlessEqual(len(rows), 1, 'number of rd.mailing-list docs')

        # The rd.mailing-list document should have the expected properties.
        expected_properties = ['changed_timestamp', 'help', 'id', 'identity',
                               'name', 'post', 'status', 'subscribe',
                               'unsubscribe']
        doc = rows[0]['doc']
        actual_properties = sorted([key for key in doc.keys()
                                        if not key.startswith('_')
                                        and not key.startswith('rd_')])
        self.failUnlessEqual(actual_properties, expected_properties,
                             'rd.mailing-list properties')

        # The properties should have the expected values.
        expected_values = {
            'changed_timestamp': 1251344732,
            'help': 'mailto:test-request@lists.example.com?subject=help',
            'id': 'test.lists.example.com',
            'identity': ['email', 'raindrop_test_user@mozillamessaging.com'],
            'name': 'test list ',
            'post': 'mailto:test@lists.example.com',
            'status': 'subscribed',
            'subscribe': 'https://lists.example.com/listinfo/test>,\n\t<mailto:test-request@lists.example.com?subject=subscribe',
            'unsubscribe': 'https://lists.example.com/options/test>,\n\t<mailto:test-request@lists.example.com?subject=unsubscribe',
        }
        for property in expected_properties:
            self.failUnlessEqual(doc[property], expected_values[property],
                                 'rd.mailing-list::' + property)
