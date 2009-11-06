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

dojo.provide("rdw.ext.feedNotification.Group");

dojo.require("rdw.conversation.GenericGroup");

dojo.declare("rdw.ext.feedNotification.Group", [rdw.conversation.GenericGroup], {
  /**
   * Holds on to the ID for the feed.
   */
  feedId: "",
  
  /**
   * pulls the feed ID out of the msg's rss-entry schema.
   */
  getFeedId: function(msg) {
    return msg.schemas["rd.msg.rss-feed"] && msg.schemas["rd.msg.rss-feed"].feed_id;
  },

  /**
   * Determines if conversation is supported.
   *
   * @param conversation {object} the conversation API object
   */
  canHandle: function(conversation) {
    var feedId = this.getFeedId(conversation.messages[0]);
    return (feedId && !this.feedId) || (this.feedId == feedId);
  },

  addConversation: function(conversation) {
    this.inherited("addConversation", arguments);
    var msg = conversation.messages[0];

    //Save the feed ID so only accept entries from this feed.
    if (!this.feedId) {
      this.feedId = this.getFeedId(msg);
    }

    //Set the title of the feed.
    if (msg) {
      this.groupTitle = msg.schemas["rd.msg.rss-feed"].title || "";
    }
  }
});
