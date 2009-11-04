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

dojo.provide("rdw.ext.facebookNotification.Group");

dojo.require("rdw.conversation.GenericGroup");

dojo.declare("rdw.ext.facebookNotification.Group", [rdw.conversation.GenericGroup], {
  matchRegExp: /notification[^@]*@facebookmail.com/,

  /**
   * Determines if message is supported.
   *
   * @param messageBag {object} the collection of message schemas for a message.
   */
  canHandle: function(messageBag) {
    var targetDoc = messageBag["rd.msg.recip-target"];
    var bodyDoc = messageBag["rd.msg.body"];
    var target = targetDoc && targetDoc.target;

    return target == "notification" && bodyDoc && bodyDoc.from && this.matchRegExp.test(bodyDoc.from[1] || "");
  },
  
  postMixInProperties: function() {
    this.inherited("postMixInProperties", arguments);
    this.groupTitle = "Facebook Notifications";
  }
});
