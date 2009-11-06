
from twisted.internet import defer
from raindrop.tests.api import APITestCase

class TestConvoSimple(APITestCase):
    # "my identity" in the context of these tests should give us
    # 'raindrop_test_user@mozillamessaging.com' - and we know he
    # participates in at least the following convos.
    def get_known_msgs_from_identities(self, iids=None):
        known_msgs = set()
        if iids is None or \
           ('email', 'raindrop_test_user@mozillamessaging.com') in iids:
            # sent-email-simple.rfc822.txt
            known_msgs.add(('email', 'd3d08a8a534c464881a95b75300e9011@something'))
        # a skype convo
        if iids is None or ('skype', 'raindrop_test_user') in iids:
            # Our test user also has a skype identity.
            known_msgs.add(('skype-msg', 'raindrop_test_user-1'))
        return known_msgs

    def get_known_msgs_to_identities(self, iids=None):
        known_msgs = set()
        if iids is None or \
           ('email', 'raindrop_test_user@mozillamessaging.com') in iids:
            # sent-email-simple-reply.rfc822.txt
            known_msgs.add(('email', '78cb2eb5dbc74cdd9691dcfdb266d1b9@something'))
        return known_msgs

    def get_known_msgs_not_from_identities(self):
        # some 'random' messages not associated with our test identities.
        return set([('email', '07316ced2329a69aa169f3b9c6467703@bitbucket.org')])

    def sanity_check_convo(self, convo):
        # all messages in a convo must have the same conversation ID.
        messages = convo['messages']
        seen_cids = set([msg['schemas']['rd.msg.conversation']['conversation_id']
                        for msg in messages])
        self.failUnlessEqual(len(seen_cids), 1, seen_cids)
        # No message should appear twice.
        seen_keys = set([tuple(msg['schemas']['rd.msg.body']['rd_key'])
                        for msg in messages])
        self.failUnlessEqual(len(seen_keys), len(messages), str(seen_keys))

    @defer.inlineCallbacks
    def test_identities_mine(self, iids=None):
        known_msgs = self.get_known_msgs_to_identities(iids)
        known_msgs.update(self.get_known_msgs_from_identities(iids))
        result = yield self.call_api("inflow/conversations/identities", ids=iids)
        seen = set()
        for convo in result:
            self.sanity_check_convo(convo)
            for msg in convo['messages']:
                # take the rd_key from the body schema
                rdkey = msg['schemas']['rd.msg.body']['rd_key']
                seen.add(tuple(rdkey))

        self.failUnlessEqual(seen.intersection(known_msgs), known_msgs)
        unknown_msgs = self.get_known_msgs_not_from_identities()
        self.failUnlessEqual(seen.intersection(unknown_msgs), set())

    def test_identities_specific(self):
        # check it works when our default user is explicitly specified.
        iids = [('email', 'raindrop_test_user@mozillamessaging.com')]
        return self.test_identities_mine(iids)

    @defer.inlineCallbacks
    def test_direct(self):
        known_msgs = self.get_known_msgs_to_identities()
        result = yield self.call_api("inflow/conversations/direct")
        seen = set()
        for convo in result:
            self.sanity_check_convo(convo)
            for msg in convo['messages']:
                # take the rd_key from the body schema
                rdkey = msg['schemas']['rd.msg.body']['rd_key']
                seen.add(tuple(rdkey))

        self.failUnlessEqual(seen.intersection(known_msgs), known_msgs)
        unknown_msgs = self.get_known_msgs_not_from_identities()
        self.failUnlessEqual(seen.intersection(unknown_msgs), set())
