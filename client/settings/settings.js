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

dojo.provide("settings");

dojo.require("settings.Account");
dojo.require("rd.api");

dojo.addOnLoad(function() {
  var allowed = [
    "gmail",
    "twitter"
  ];

  //Fetch all accounts and create widgets, but only for the allowed types.
  rd.api().megaview({
    key: ["rd.core.content", "schema_id", "rd.account"],
    reduce: false,
    include_docs: true
  })
  .ok(function(json) {
    var settingsNode = dojo.byId("settings");
    
    //Build up a set of kind to doc mappings.
    var kindMap = {};
    for (var i = 0, row, doc; (row = json.rows[i]) && (doc = row.doc); i++) {
      if (doc.kind) {
        kindMap[doc.kind] = doc;
      }
    }
    
    //Build a list of widgets for the allowed set, using documents if they exist
    //to populate them.
    for (var i = 0, svc; svc = allowed[i]; i++) {
      var doc = kindMap[svc] || {
        kind: svc
      };

      new settings.Account({
        doc: doc
      }, dojo.create("div", null, settingsNode));
    }
    
  })
});