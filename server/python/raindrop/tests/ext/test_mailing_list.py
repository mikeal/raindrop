from twisted.internet import defer

from raindrop.tests import TestCaseWithCorpus

# Cases to test:
#
# * a message from a list: the rd.msg.email.mailing-list and rd.mailing-list
#   docs should be created with the appropriate properties;
#
# * a message that updates a list: the list properties should be updated;
#
# The rest of these testcases need to be run separately for Google Groups
# and Mailman lists, since the unsubscription code for those two kinds of lists
# isn't shared between them.  At some point it might be possible to factor out
# some of their code, however, at which point we may be able to merge some of
# the tests.
#
# * a message from a list followed by a newer unsubscribe confirmation:
#   the list state should become "unsubscribed";
#
# * a message from a list followed by an older unsubscribe confirmation:
#   the list state should remain "subscribed";
#
# * an unsubscribe confirmation followed by a newer message from the list:
#   the list state should become "subscribed";
#
# * an unsubscribe confirmation followed by an older message from the list:
#   the list state should remain "unsubscribed";
#
# * an unsubscribe confirmation for a non-existing list: the list doc should
#   be created, and its state should be "unsubscribed" (because we expect to
#   later process some older messages from the list and want to make sure they
#   show up as being from an unsubscribed list);
#
# * an unsubscribe confirmation for a non-existing list followed by an older
#   message from the list: the list state should remain "unsubscribed";
#
# * an unsubscribe confirmation for a non-existing list followed by a newer
#   message from the list: the list state should become "subscribed";
#
# * an unsubscribe confirm request for a list in the "unsubscribe-pending"
#   state: an rd.msg.outgoing.simple doc should be created with the appropriate
#   properties; the list state should become "unsubscribe-confirmed";

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

        # Process a second, later message from the same mailing list.
        docs = [d for d in self.gen_corpus_docs('hand-rolled',
                                                'mailing-list-email-simple-2')]
        self.failUnlessEqual(len(docs), 1) # failed to load any corpus docs???
        # this will do until we get lots...
        _ = yield self.doc_model.db.updateDocuments(docs)
        _ = yield self.pipeline.start()

        # There should be two rd.msg.email.mailing-list documents.
        key = ['rd.core.content', 'schema_id', 'rd.msg.email.mailing-list']
        result = yield self.doc_model.open_view(key=key, reduce=False,
                                                include_docs=True)
        rows = result['rows']
        self.failUnlessEqual(len(rows), 2,
                             'number of rd.msg.email.mailing-list docs')

        # There should be one rd.msg.email.mailing-list document with the key
        # of the message we just processed.
        key = ['rd.core.content', 'key-schema_id',
               [['email', '40c05b9d93ba4695a30e72174c5c8126@example.com'],
                'rd.msg.email.mailing-list']]
        result = yield self.doc_model.open_view(key=key, reduce=False,
                                                include_docs=True)
        rows = result['rows']
        self.failUnlessEqual(len(rows), 1,
                             'number of rd.msg.email.mailing-list docs with key ["email", "40c05b9d93ba4695a30e72174c5c8126@example.com"]')

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

        # There should still be just one rd.mailing-list document.
        key = ['rd.core.content', 'schema_id', 'rd.mailing-list']
        result = yield self.doc_model.open_view(key=key, reduce=False,
                                                include_docs=True)
        rows = result['rows']
        self.failUnlessEqual(len(rows), 1, 'number of rd.mailing-list docs')

        # The rd.mailing-list document should have the expected properties,
        # including the "archive" property that was added by the second message.
        expected_properties = ['archive', 'changed_timestamp', 'help', 'id',
                               'identity', 'name', 'post', 'status',
                               'subscribe', 'unsubscribe']
        doc = rows[0]['doc']
        actual_properties = sorted([key for key in doc.keys()
                                        if not key.startswith('_')
                                        and not key.startswith('rd_')])
        self.failUnlessEqual(actual_properties, expected_properties,
                             'rd.mailing-list properties')

        # The properties should have the expected values.
        #
        # Some of these properties (subscribe, unsubscribe) have changed
        # in the new message and should have been updated in the doc;
        # another (post) hasn't changed and should have the same value;
        # one (help) wasn't provided by the second message at all, so we leave
        # its original value in place (some lists don't provide all List-*
        # headers when they send admin messages, but that shouldn't cause us
        # to remove their properties); and one (archive) is new and should have
        # been added to the doc.
        #
        # Finally, since the list doc has been changed, its changed timestamp
        # should have been updated to the date of the second message.
        #
        expected_values = {
            'archive': 'https://lists.example.com/archive/thetest',
            'changed_timestamp': 1251401696,
            'help': 'mailto:test-request@lists.example.com?subject=help',
            'id': 'test.lists.example.com',
            'identity': ['email', 'raindrop_test_user@mozillamessaging.com'],
            'name': 'the test list ',
            'post': 'mailto:test@lists.example.com',
            'status': 'subscribed',
            'subscribe': 'https://lists.example.com/listinfo/thetest>,\n\t<mailto:thetest-request@lists.example.com?subject=subscribe',
            'unsubscribe': 'https://lists.example.com/options/thetest>,\n\t<mailto:thetest-request@lists.example.com?subject=unsubscribe',
        }
        for property in expected_properties:
            self.failUnlessEqual(doc[property], expected_values[property],
                                 'rd.mailing-list::' + property)
