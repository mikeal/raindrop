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
   * pulls the feed ID out of the messageBag's rss-entry schema.
   */
  getFeedId: function(messageBag) {
    return messageBag["rd.msg.rss-feed"] && messageBag["rd.msg.rss-feed"].feed_id;
  },

  /**
   * Determines if message is supported.
   *
   * @param messageBag {object} the collection of message schemas for a message.
   */
  canHandle: function(messageBag) {
    var feedId = this.getFeedId(messageBag);
    return (feedId && !this.feedId) || (this.feedId == feedId);
  },

  addMessage: function(messageBag) {
    this.inherited("addMessage", arguments);

    //Save the feed ID so only accept entries from this feed.
    if (!this.feedId) {
      this.feedId = this.getFeedId(messageBag);
    }

    //Set the title of the feed.
    if (messageBag) {
      this.groupTitle = messageBag["rd.msg.rss-feed"].title || "";
    }
  }
});
