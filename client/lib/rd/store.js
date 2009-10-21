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

dojo.provide("rd.store");

dojo.require("couch");

rd.store = {
  megaview: function(/*Object*/args) {
    //summary: thin wrapper around couch megaview call, just to avoid having
    //to remember or copy/paste the megaview url.
    return couch.db("raindrop").view("raindrop!content!all/_view/megaview", args);
  },

  megaviewList: function(/*String*/ listName, /*Object*/args) {
    //summary: thin wrapper around the couch lists for the megaview call.
    return couch.db("raindrop").view("raindrop!content!all/_list/" + listName + "/megaview", args);
  },

  put: function(/*Object*/doc, /*Function*/callback, /*Function?*/errback) {
    //summary: puts a document in the raindrop data store.
    //If successful, callback is called with the doc as the only argument.
    //It will generate the _id and rd_ext_id on the document if it does
    //not exist. Warning: it modifies the doc object.

    //Add generic UI extension ID if needed.
    if (!doc.rd_ext_id) {
      doc.rd_ext_id = rd.uiExtId;
    }

    //Generate the ID for the document, if needed.
    if (!doc._id) {
      doc._id = "rc!"
              + doc.rd_key[0]
              + "."
              + rd.toBase64(doc.rd_key[1])
              + "!"
              + doc.rd_ext_id
              + "!"
              + doc.rd_schema_id;
    }

    var docUrl = rd.dbPath + doc._id;
    if (doc._rev) {
      docUrl += "?rev=" + doc._rev;
    }

    dojo.xhrPut({
      url: docUrl,
      putData: dojo.toJson(doc),
      load: function(response, ioArgs) {
        if (response.rev) {
          doc._rev = response.rev;
        }
        callback(doc);
      },
      error: errback
    });
  }
}
