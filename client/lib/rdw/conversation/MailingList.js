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

dojo.provide("rdw.conversation.MailingList");

dojo.require("rdw.Conversation");

/**
 * Groups twitter broadcast messages into one "conversation"
 */
dojo.declare("rdw.conversation.MailingList", [rdw.Conversation], {
  templateString: '<div class="rdwConversationMailingList"> \
                    <div class="timestamp" dojoAttachPoint="timestampNode"> \
                    <span class="friendly" dojoAttachPoint="friendlyNode"></span> \
                    </div> \
                    <div class="mailingList" dojoAttachPoint="containerNode"><span dojoAttachPoint="nameNode" class="MailingListTitle"></span></div> \
                  </div>',

  /**
   * The name of the module to use for showing individual messages.
   */
  messageCtorName: "rdw.conversation.MailingListMessage",

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
  },

  /**
   * sorting to use for messages. Unlike rdw.Conversation, the twitter timeline
   * should show most recent tweet first. This method should not use
   * the "this" variable.
   */
  msgSort: function (a,b) {
    return a["rd.msg.body"].timestamp < b["rd.msg.body"].timestamp
  },

  /**
   * Determines if TwitterTimeLine can support this message.
   *
   * @param messageBag {object} the collection of message schemas for a message.
   */
  canHandle: function(messageBag) {
    var listDoc = messageBag["rd.msg.email.mailing-list"];
    
    //If there is a listDoc and either there is no list ID associated (probably)
    //a direct prototype check, not on an instance), or if an instance that
    //already has a listId matches the listId in the listDoc.
    return !!listDoc && (!this.listId || this.listId == listDoc.list_id);
  },

  /**
   * Extends base class method for saving off list details.
   *
   * @param messageBag {object} the collection of message schemas for a message.
   */
  addMessage: function(messageBag) {
    //Only add one message per conversation.
    var convoId = messageBag["rd.msg.conversation"];
    if (convoId) {
      convoId = convoId.conversation_id;
    }

    if(convoId && !this.convoIds[convoId]) {
      this.inherited("addMessage", arguments);
      var listDoc = messageBag["rd.msg.email.mailing-list"];
      this.listId = listDoc.list_id;
      this.listName = listDoc.list_id;
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
    rd.escapeHtml(this.listName, this.nameNode, "only");
  }
});
