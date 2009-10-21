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

dojo.provide("rdw.story.GenericGroup");

dojo.require("rdw.Story");

rd.addStyle("rdw.story.css.GenericGroup");

/**
 * Groups some broadcast/general group messages into one "story"
 */
dojo.declare("rdw.story.GenericGroup", [rdw.Story], {
  templateString: '<li class="rdwStoryGenericGroup"> \
                    <div class="genericGroup" dojoAttachPoint="containerNode"><span dojoAttachPoint="nameNode" class="title"></span></div> \
                  </li>',

  /**
   * The name of the module to use for showing individual messages.
   */
  messageCtorName: "rdw.story.GenericGroupMessage",

  /**
   * Limit to number of unread messages. If value is -1, then it means show all.
   * In this context, it is treated as number of threads to show that have unread
   * messages.
   */
  unreadReplyLimit: 2,

  /**
   * A style to add to any messages that are replies, but this grouping
   * widgte does not care to style replies separately.
   */
  replyStyle: "",

  /**
   * This value is used to show the title of the group in the HTML. Set
   * this value before display() is called.
   */
  groupTitle: "",

  /**
   * Djit lifecycle method, before template is created/injected in the DOM.
   */
  postMixInProperties: function() {
    this.inherited("postMixInProperties", arguments);
    this.totalCount = 0;
  },

  /**
   * sorting to use for messages. Unlike rdw.Story, this generic group
   * should show most recent message first. This method should not use
   * the "this" variable.
   */
  msgSort: function (a,b) {
    return a["rd.msg.body"].timestamp < b["rd.msg.body"].timestamp
  },

  /**
   * Determines if GenericGroup can support this message. Subclasses should
   * override this message.
   *
   * @param messageBag {object} the collection of message schemas for a message.
   */
  canHandle: function(messageBag) {
    return false;
  },

  /**
   * Extends base class method for saving off list details. Subclasses should
   * call this method and further subclass, but call this method to set up
   * the counts correcty.
   *
   * @param messageBag {object} the collection of message schemas for a message.
   */
  addMessage: function(messageBag) {
    if (messageBag) {
      this.msgs.push(messageBag);
      this.totalCount += 1;
    }

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
    rd.escapeHtml(this.groupTitle, this.nameNode, "only");
  }
});
