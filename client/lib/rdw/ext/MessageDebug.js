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

dojo.provide("rdw.ext.MessageDebug");

dojo.require("rdw.Message");

rd.applyExtension("rdw.ext.MessageDebug", "rdw.Message", {
  after: {
    postCreate: function() {
      //summary: adds debug links to show documents associated with message
      //NOTE: the "this" in this function is the instance of rdw.Message.

      //Create a node to hold the debug links
      var debugNode = dojo.create("div", {
        "class": "debug"
      });

      //Loop over the sources and add links for each kind.
      for(var prop in this.msg.schemas) {
        var schema = this.msg.schemas[prop];
        var sch_id = schema.rd_schema_id; // XXX - include schema in the link?
        id = schema._id;
        dojo.create("a", {
          "class": "tag",
          target: "_blank",
          title: schema.rd_ext_id,
          href: "/_utils/document.html?raindrop/" + encodeURIComponent(id),
          innerHTML: sch_id.replace(/rd\.msg\./,'')
        }, debugNode);
      }

      //Attach the debug div to the Messsage.
      dojo.query(".message", this.domNode).addContent(debugNode);
    }
  }
});

rd.addStyle("rdw.ext.css.MessageDebug");
