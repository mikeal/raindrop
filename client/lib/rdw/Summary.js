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

dojo.provide("rdw.Summary");

dojo.require("rdw._Base");
dojo.require("rd.api");

dojo.declare("rdw.Summary", [rdw._Base], {
  templateString: '<div class="rdwSummary"></div>',

  clear: function() {
    //summary: clears the summary display.
    this.destroySupportingWidgets();
    this.domNode.className = "rdwSummary";
    this.domNode.innerHTML = "";
  },

  destroySupportingWidgets: function() {
    //summary: removes the supporting widgets
    if (this._supportingWidgets && this._supportingWidgets.length) {
      var supporting;
      while((supporting = this._supportingWidgets.shift())) {
        supporting.destroy();
      }
    }
  },

  //**************************************************
  //start topic subscription endpoints
  //**************************************************
  home: function() {
    //summary: responds to rd-protocol-home topic.
    rd.escapeHtml("Inflow", this.domNode, "only");
  },

  conversation: function(/*Array*/ conversations) {
    //summary: responds to showing a full conversation.
    var title = conversations[0]["rd.msg.body"].subject || "";
    var html = rd.escapeHtml(title) + '<div class="actions"><a href="#archive">archive</a><a href="#delete">delete</a></div>';
    this.domNode.innerHTML = html;
    dojo.addClass(this.domNode, "conversation");
  },

  contact: function(/*String*/contactId) {
    //summary: responds to rd-protocol-contact topic.
    rd.api().contact({
      ids: [contactId]
    }).ok(this, function(contacts) {
      //Use megaview to select all messages based on the identity
      //IDs.
      var contact = contacts[0];
      var keys = rd.map(contact.identities, dojo.hitch(this, function(identity) {
            rd.escapeHtml("Person: " + contact.name + identity.rd_key[1], this.domNode);
      }));
    });
  },

  direct: function() {
    //summary: responds to rd-protocol-direct topic.
  },

  group: function() {
    //summary: responds to rd-protocol-group topic.
    rd.escapeHtml("Recent group conversations", this.domNode);
  },

  locationTag: function(/*String*/locationId) {
    //summary: responds to rd-protocol-locationTag topic.
    rd.escapeHtml("Folder location: " + locationId, this.domNode);
  },

  starred: function(/*String*/locationId) {
    //summary: responds to rd-protocol-starred topic.
    rd.escapeHtml("Starred Messages (unimplemented)", this.domNode);
  },

  sent: function(/*String*/locationId) {
    //summary: responds to rd-protocol-sent topic.
    rd.escapeHtml("Sent Messages", this.domNode);
  }
  //**************************************************
  //end topic subscription endpoints
  //**************************************************
});
