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
                     <div class="actions"> \
                       <div class="viewAll">view all</div> \
                       <div class="noteCount" dojoAttachPoint="noteCountNode"></div> \
                       <div class="broadcastCount" dojoAttachPoint="broadcastCountNode"></div> \
                     </div> \
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
   * storage for notification messages. An array.
   */
  noteMsgs: null,

  /**
   * Widget lifecycle method, called before template is generated.
   */
  postMixInProperties: function() {
    this.inherited("postMixInProperties", arguments);
    this.noteMsgs = [];
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
    var notification = msg.schemas["rd.msg.notification"];
    var notifyType = notification && notification.type;
  
    return (keyType == "tweet" && recip && recip.target == "broadcast") || notifyType == "twitter";
  },


  /**
   * Adds a message to this group.
   *
   * @param conversation {object} the conversation for this widget.
   */
  addConversation: function(conversation) {
    if (conversation) {
      this.conversation = conversation;
    }

    var msg = this.conversation.messages[0];
    if (msg.schemas["rd.msg.notification"]) {
      this.noteMsgs.push(msg);
    } else {
      //A regular broadcast message. Pull the messages out of the conversation.
      var messages = conversation.messages;
      if (messages && messages.length) {
        this.msgs.push.apply(this.msgs, conversation.messages);
      }
    }

    if (this._displayed) {
      this.display();
    }
  },

  /**
   * Extends base class implementation of display to do subclass-specific rendering.
   */
  display: function() {
    this.inherited("display", arguments);

    //Update the notification and broadcast counts.
    this._updateCount(this.noteCountNode, this.noteMsgs.length);
    this._updateCount(this.broadcastCountNode, this.msgs.length);
  },

  _updateCount: function(node, count) {
    if (count) {
      node.innerHTML = count;
      node.style.disply = "";
    } else {
      node.style.disply = "none";
    }
  }
});
