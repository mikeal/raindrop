/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Raindrop.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Messaging, Inc..
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * */

dojo.provide("rdw.ext.twitter.ext");

dojo.require("rdw.Summary");
dojo.require("rdw.Conversations");
dojo.require("rdw.Widgets");
dojo.require("rdw.ext.twitter.Group");
dojo.require("rdw.ext.twitter.Conversation");

rd.applyExtension("rdw.ext.twitter.ext", "rdw.Summary", {
  addToPrototype: {
    twitter: function() {
      rd.escapeHtml("Twitter Timeline", this.domNode);
    }
  }
});

rd.applyExtension("rdw.ext.twitter.ext", "rdw.Conversations", {
  addToPrototype: {
    topics: {
      "rd-protocol-twitter": "twitter"
    },

    topicConversationCtorNames: {
      "rd-protocol-twitter": "rdw.ext.twitter.Conversation"
    },

    twitter: function() {
      //summary: responds to requests to show all twitter messages
      rd.api({
        url: 'inflow/conversations/twitter',
        limit: this.conversationLimit,
        message_limit: this.messageLimit
      })
      .ok(dojo.hitch(this, function(conversations) {
        this.updateConversations("summary", conversations); 
        if (this.summaryWidget.twitter) {
          this.summaryWidget.twitter();
        }
      }));
    }
  }
});

rd.applyExtension("rdw.ext.twitter.ext", "rdw.Widgets", {
  addToPrototype: {
    convoModules: [
      "rdw.ext.twitter.Group"
    ]
  }
});
