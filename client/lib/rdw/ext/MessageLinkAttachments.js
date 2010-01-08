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

dojo.provide("rdw.ext.MessageLinkAttachments");

dojo.require("rdw.Message");

/*
Applies a display extension to rdw.Message.
Allows showing links included in the message as inline attachments
*/

rd.applyExtension("rdw.ext.MessageLinkAttachments", "rdw.Message", {
  after: {
    postCreate: function() {
      //NOTE: the "this" in this function is the instance of rdw.Message.

      //Check for links found in a message
      var link_schema = this.msg.schemas["rd.msg.body.quoted.hyperlinks"];
      if (!link_schema ) {
        return;
      }
      var links = link_schema["links"];
      for (var i = 0; i < links.length; i++) {

        //Create a node to hold the link object
        var linkNode = dojo.create("div", {
          "class": "link",
          innerHTML: "<a target=\"_blank\" href='"+ links[i] +"'>"+ links[i] +"</a>"
        });
        dojo.query(".message .attachments", this.domNode).addContent(linkNode);
        dojo.connect(linkNode, "onclick", this, "onMessageLinkAttachmentClick");
      }

    }
  },
  addToPrototype: {
    onMessageLinkAttachmentClick: function(evt) {
      //summary: handles clicking anywhere on the link attachment block
      var link_schema = this.msg.schemas["rd.msg.body.quoted.hyperlinks"];
      if (!link_schema ) {
        return;
      }
    }
  }
});

rd.addStyle("rdw.ext.css.MessageLinkAttachments");
