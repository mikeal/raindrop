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

dojo.provide("rdw.InflowSummaryGroup");

dojo.require("rdw._Base");

rd.addStyle("rdw.InflowSummaryGroup");

dojo.declare("rdw.InflowSummaryGroup", [rdw._Base], {
  templateString: '<div class="rdwInflowSummaryGroup"><h3>Inflow Summary</h3><ul dojoAttachPoint="containerNode"><li dojoAttachPoint="totalCountNode"></li></ul></div>',

  postCreate: function() {
    //summary: dijit lifecycle method after template insertion in the DOM.
    this.inherited("postCreate", arguments);
    this.apiHandle = rd.api.subscribe("inflow/conversations/personal", this, "onApiUpdate");
  },

  destroy: function() {
    //summary: dijit lifecycle method.
    rd.api.unsubscribe(this.apiHandle);
    this.inherited("destroy", arguments);
  },

  onApiUpdate: function(conversations) {
    var i, convo;
    if (!conversations || conversations.length == 0) {
      this.domNode.innerHTML = "No conversations";
    } else {
      var unread = 0;
      for (i = 0; (convo = conversations[i]); i++) {
        unread += convo.unread || 0;
      }
      //TODO: not localized.
      dojo.place('<span class="count">' + unread + '</span> unread message' + (unread != 1 ? 's' : ''), this.totalCountNode, "only");
    }
  }
});
