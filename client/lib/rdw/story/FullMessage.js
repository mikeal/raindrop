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

dojo.provide("rdw.story.FullMessage");

dojo.require("rdw.Message");

dojo.declare("rdw.story.FullMessage", [rdw.Message], {
  templateString: dojo.cache("rdw.story.templates", "FullMessage.html"),

  postMixInProperties: function() {
    //summary: dijit lifecycle method
    this.inherited("postMixInProperties", arguments);

    //Make sure to show the whole body.
    var msgBag = this.messageBag;
    var msgDoc = this.messageBag['rd.msg.body'];

    //Collapse quote regions in the text and hyperlink things.
    //TODO: make message transforms extensionized.
    this.message = this.formatQuotedBody();

    this.time = msgDoc.timestamp;

    /* XXX this timestamp needs a lot more thought to show the right kind of 
       time info and we probably also want to some standard the hCard formatting */
    var fTime = rd.friendly.timestamp(msgDoc.timestamp);
    this.utcTime = fTime["utc"];
    this.friendlyTime = fTime["friendly"];
    this.additionalTime = fTime["additional"];
  }
});
