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

dojo.provide("rdw.ext.EXTNAME.Conversation");

dojo.require("rdw.Conversation");

dojo.declare("rdw.ext.EXTNAME.Conversation", [rdw.Conversation], {
  templateString: dojo.cache("rdw.ext.EXTNAME", "Conversation.html"),

  //The name of the constructor function (module) that should be used
  //to show individual messages.
  //messageCtorName: "rdw.ext.EXTNAME.Message",

  /**
   * Determines if message is supported.
   *
   * @param msg {object} the collection of message schemas for a message.
   */
  canHandle: function(msg) {
    //msg["rd.msg.body"] has the rd.msg.body schema for this message bag.
    var convoId = msg
                && msg["rd.msg.conversation"]
                && msg["rd.msg.conversation"].conversation_id;

    //If there is a convoId and either there is no convoId associated (probably)
    //a direct prototype check, not on an instance), or if an instance that
    //already has a convoId matches the convoId in the convoId.
    return convoId && (!this.convoId || this.convoId == convoId);
  },

  postMixInProperties: function() {
    this.inherited("postMixInProperties", arguments);
    
    //Set any properties you want to show in the template here.
    //this.msgs is the list of messages for this conversation.
  },

  /**
   * Extends base class method for saving off conversation ID
   *
   * @param msg {object} the collection of message schemas for a message.
   */
  addMessage: function(msg) {
    this.inherited("addMessage", arguments);
    var convoDoc = msg["rd.msg.conversation"];
    if (convoDoc) {
      this.convoId = convoDoc.conversation_id;
    }
  }
});
