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

dojo.provide("rdw.conversation.TwitterTimeLine");

dojo.require("rdw.Conversation");

/**
 * Groups twitter broadcast messages into one "conversation"
 */
dojo.declare("rdw.conversation.TwitterTimeLine", [rdw.Conversation], {
  templateString: '<div class="WidgetBox rdwConversationTwitterTimeLine"> \
                    <div dojoAttachPoint="nameNode" class="title">Twitter</div> \
                    <div class="tweetList" dojoAttachPoint="containerNode"></div> \
                   </div>',

  /**
   * The limit of tweets to use.
   */
  unreadReplyLimit: 1,

  /**
   * Do not format messages greater than the first one as replies
   */
  replyStyle: "",

  /**
   * sorting to use for messages. Unlike rdw.Conversation, the twitter timeline
   * should show most recent tweet first. This method should not use
   * the "this" variable.
   */
  msgSort: function (a,b) {
    return a.schemas["rd.msg.body"].timestamp < b.schemas["rd.msg.body"].timestamp
  },

  /**
   * Determines if TwitterTimeLine can support this conversation.
   *
   * @param conversation {object} the conversation API object.
   */
  canHandle: function(conversation) {
    var msg = conversation.messages[0];
    var recip = msg.schemas["rd.msg.recip-target"];
    var keyType = msg.schemas["rd.msg.body"].rd_key[0];
    return keyType == "tweet" && recip && recip.target == "broadcast";
  },

  /**
   * Extends base class implementation of display to do subclass-specific rendering.
   */
  display: function() {
    this.inherited("display", arguments);

    //Update total count.
    rd.escapeHtml(dojo.string.substitute(this.i18n.poundCount, {
      count: this.msgs.length
    }), this.countNode, "only");
  }
});
