# ***** BEGIN LICENSE BLOCK *****
# * Version: MPL 1.1
# *
# * The contents of this file are subject to the Mozilla Public License Version
# * 1.1 (the "License"); you may not use this file except in compliance with
# * the License. You may obtain a copy of the License at
# * http://www.mozilla.org/MPL/
# *
# * Software distributed under the License is distributed on an "AS IS" basis,
# * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# * for the specific language governing rights and limitations under the
# * License.
# *
# * The Original Code is Raindrop.
# *
# * The Initial Developer of the Original Code is
# * Mozilla Messaging, Inc..
# * Portions created by the Initial Developer are Copyright (C) 2009
# * the Initial Developer. All Rights Reserved.
# *
# * Contributor(s):
# *

# extensions we hack in which changes the 'from' for a message.
# This extension depends on the same schema it writes (ie, it depends on
# rd.msg.body and writes a new value)
extension_same_schema = {
    'rd_key': ['ext', 'test-suite'],
    'rd_ext_id': 'rd.test',
    'rd_schema_id': 'rd.ext.workqueue',
    'items': {
        "source_schemas" : ["rd.msg.body"],
        "code" : """
def handler(doc):
    if doc['from'] == ['email', 'issues-noreply@bitbucket.org']:
        emit_schema('rd.msg.body',
                    {'from': ['email', 'raindrop_test_user@mozillamessaging.com']})
""",
        "content_type" : "application/x-python",
        "info": "Test suite",
        "category": "extender",
        "confidence": 1,
    }
}

# This extension has the same end-result as the above, but depends directly
# on the rd.msg.rfc822 stream.
extension_different_schema = {
    'rd_key': ['ext', 'test-suite'],
    'rd_ext_id': 'rd.test',
    'rd_schema_id': 'rd.ext.workqueue',
    'items': {
        "source_schemas" : ["rd.msg.rfc822"],
        "code" : """
def handler(doc):
    content = open_schema_attachment(doc, "rfc822")
    if "from: issues-noreply@bitbucket.org" in content.lower():
        emit_schema('rd.msg.body',
                    {'from': ['email', 'raindrop_test_user@mozillamessaging.com']})
""",
        "content_type" : "application/x-python",
        "info": "Test suite",
        "confidence": 1,
        "category": "extender",
    }
}

from twisted.internet import defer
from raindrop.tests.api import APITestCase

class TestConfidencesBase(APITestCase):
    @defer.inlineCallbacks
    def prepare_test_db(self, config):
        _ = yield APITestCase.prepare_test_db(self, config)
        # add our test extension(s).
        _ = yield self.doc_model.create_schema_items([self.extension])

    @defer.inlineCallbacks
    def _test_override(self):
        # We should see the conversation including the message we "modified"
        our_msg = ('email', '07316ced2329a69aa169f3b9c6467703@bitbucket.org')
        # make a megaview request to determine the convo ID with our message.
        result = yield self.doc_model.open_view(key=['rd.conv.messages', 'messages', our_msg],
                                                reduce=False)
        # should be exactly 1 convo.
        self.failUnlessEqual(len(result['rows']), 1)
        our_conv_id = result['rows'][0]['value']['rd_key']
        seen = set()
        result = yield self.call_api("inflow/conversations/identities",
                                     message_limit=100)
        # loop over the convos finding the one we care about.
        for convo in result:
            if convo['id'] == our_conv_id:
                msgs = convo['messages']
                # and only one message in the convo.
                self.failUnlessEqual(len(msgs), 1, msgs)
                # and the body schema should have the modified "from" address"
                self.failUnlessEqual(msgs[0]['schemas']['rd.msg.body']['from'],
                                     ['email', 'raindrop_test_user@mozillamessaging.com'],
                                     msgs)
                break
        else:
            self.fail("failed to find our message")

class TestConfidencesSameSchema(TestConfidencesBase):
    extension = extension_same_schema
    def test_it(self):
        return self._test_override()

class TestConfidencesDifferentSchema(TestConfidencesBase):
    extension = extension_different_schema
    def test_it(self):
        return self._test_override()
