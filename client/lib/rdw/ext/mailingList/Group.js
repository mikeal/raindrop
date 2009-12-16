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

dojo.provide("rdw.ext.mailingList.Group");

dojo.require("rdw.Conversation");
dojo.require("rdw.fx.wiper");

/**
 * Groups twitter broadcast messages into one "conversation"
 */
dojo.declare("rdw.ext.mailingList.Group", [rdw.Conversation, rdw.fx.wiper], {
  templateString: '<div class="WidgetBox rdwConversationMailingList"> \
                     <div class="WidgetHeader hbox"> \
                      <a href="#" dojoAttachPoint="nameNode" class="title boxFlex"></a> \
                      <span class="actions"> \
                         <span class="action broadcastCount" dojoAttachPoint="broadcastCountNode"></span> \
                         <span class="action noteCount" dojoAttachPoint="noteCountNode"></span> \
                         <button class="wipeToggle" dojoAttachPoint="headNode" dojoAttachEvent="onclick: toggleWiper"></button> \
                      </span> \
                     </div> \
                    <div class="mailingList" dojoAttachPoint="containerNode,bodyNode"></div> \
                  </div>',

  /**
   * The name of the module to use for showing individual messages.
   */
  messageCtorName: "rdw.ext.mailingList.GroupMessage",

  /**
   * The relative importance of this group widget. 0 is most important.
   */
  groupSort: 4,

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
    //Hack, see TODO below about Conversations inside Conversations.
    this.msgs = [];
    this.convoIds = {};
    this.totalCount = 0;
    this.addConversation(this.conversation);
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
    var listDoc = conversation.messages[0].schemas["rd.msg.email.mailing-list"];

    //If there is a listDoc and either there is no list ID associated (probably)
    //a direct prototype check, not on an instance), or if an instance that
    //already has a listId matches the listId in the listDoc.
    return !!listDoc && (!this.listId || this.listId == listDoc.list_id);
  },

  /**
   * Extends base class method for saving off list details.
   *
   * @param conversation {object} the conversation API object.
   */
  addConversation: function(conversation) {
    this.conversation = conversation;

    //Only add one message per conversation.
    var convoId = conversation.id;
    if(convoId && !this.convoIds[convoId]) {
      //Add some extra data to the message, the senders.
      //TODO: This is a bit of
      //a hack. Probably need to allow rdw.Conversation widgets to contain
      //other rdw.Conversation subclasses instead of just messages.
      var msg = conversation.messages[0];
      msg.convoFromDisplay = conversation.from_display;
      msg.convoUnreadCount = conversation.unread;
      this.msgs.push(msg);

      var listDoc = conversation.messages[0].schemas["rd.msg.email.mailing-list"];
 
      this.listId = listDoc.list_id;
      this.listName = listDoc.list_id;
      this.convoIds[convoId] = 1;
    }

    this.totalCount += 1;

    if (this._displayed) {
      this.display();
    }
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
    rd.escapeHtml(this.listName, this.nameNode, "only");
    dojo.attr(this.nameNode, "href", "#rd:mailingList:" + encodeURIComponent(this.listId));
  }
});
