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

dojo.provide("rdw.conversation.Broadcast");

dojo.require("rdw.Conversation");
dojo.require("rdw.fx.wiper");

/**
 * Groups twitter broadcast messages into one "conversation"
 */
dojo.declare("rdw.conversation.Broadcast", [rdw.Conversation, rdw.fx.wiper], {
  templateString: '<div class="WidgetBox rdwConversationBroadcast"> \
                     <div class="WidgetHeader hbox"> \
                      <div dojoAttachPoint="nameNode" class="title boxFlex"></div> \
                      <span class="actions"> \
                         <span class="action broadcastCount" dojoAttachPoint="broadcastCountNode"></span> \
                         <span class="action noteCount" dojoAttachPoint="noteCountNode"></span> \
                         <button class="wipeToggle" dojoAttachPoint="headNode" dojoAttachEvent="onclick: toggleWiper"></button> \
                      </span> \
                     </div> \
                    <div class="messages" dojoAttachPoint="containerNode,bodyNode"></div> \
                  </div>',

  /**
   * The name of the module to use for showing individual messages.
   */
  messageCtorName: "rdw.conversation.BroadcastMessage",

  /**
   * Limit to number of unread messages. If value is -1, then it means show all.
   * In this context, it is treated as number of threads to show that have unread
   * messages.
   */
  unreadReplyLimit: 1,

  /**
   * A style to add to any messages that are replies, but this grouping
   * widgte does not care to style replies separately.
   */
  replyStyle: "",

  /**
   * Djit lifecycle method, before template is created/injected in the DOM.
   */
  postMixInProperties: function() {
    this.inherited("postMixInProperties", arguments);
    this.convoIds = {};
    this.totalCount = 0;

    var body = this.conversation.messages[0].schemas["rd.msg.body"];
    this.from = body.from;
    this.fromDisplay = body.from_display;
  },

  /**
   * Widget lifecycle method, called after template is in the DOM.
   */
  postCreate: function() {
    this.inherited("postCreate", arguments);
    this.wiperInit("open");
  },

  /**
   * sorting to use for messages. Unlike rdw.Conversation, the twitter timeline
   * should show most recent tweet first. This method should not use
   * the "this" variable.
   */
  msgSort: function (a,b) {
    return a.schemas["rd.msg.body"].timestamp < b.schemas["rd.msg.body"].timestamp
  },

  /**
   * Determines if the widget can support this conversation.
   *
   * @param conversation {object} the conversation API object
   */
  canHandle: function(conversation) {
    var msg = conversation.messages[0];

    var target = msg.schemas["rd.msg.recip-target"];
    target = target && target.target;

    var from = msg.schemas["rd.msg.body"];
    from = from.from;

    //If target is broadcast or notification and not associated (probably)
    //a direct prototype check, not on an instance), or if an instance that
    //already has a from that matches the conversation's from
    return (target == "broadcast" || target == "notification") && (!this.from || this.from == from);
  },

  /**
   * Extends base class method for saving off convo details.
   *
   * @param conversation {object} the conversation API object.
   */
  addConversation: function(conversation) {
    //Only add one message per conversation.
    var convoId = conversation.id;
    if(convoId && !this.convoIds[convoId]) {
      this.inherited("addConversation", arguments);
      this.convoIds[convoId] = 1;
    }

    this.totalCount += 1;
  },

  /**
   * Extends base class implementation of display to do subclass-specific rendering.
   */
  display: function() {
    //Set the message limit before calling display.

    this.inherited("display", arguments);

    //Update total count.
    rd.escapeHtml(dojo.string.substitute(this.i18n.poundCount, {
      count: this.totalCount
    }), this.countNode, "only");

    //Update the title.
    rd.escapeHtml(this.fromDisplay, this.nameNode, "only");
  }
});
