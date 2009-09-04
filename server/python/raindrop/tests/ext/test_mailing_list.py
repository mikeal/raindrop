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
