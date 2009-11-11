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

dojo.provide("rd.conversation");

dojo.require("rd.api");

rd.conversation = {
  messageKey: function(/*String|Array*/ids, /*Function*/callback, /*Function*/errback) {
    //summary: gets conversations based on message IDs passed in. ids can be one string
    //message document ID or an array of string message document IDs.
    var api = rd.api({
      url: 'inflow/conversations/with_messages',
      keys: ids
    });
    if (callback) {
      api.ok(callback);
    }
    if (errback) {
      api.error(errback);
    }
  },

  location: function(/*Array*/locationId, /*Number*/limit, /*Function*/callback, /*Function*/errback) {
    //summary: gets the most recent messages up to a limit for a given imap folder
    //location ID, then pulls the conversations associated with those messages.
    //Conversation with the most recent message will be first.
    rd.api().megaview({
      key: ["rd.msg.location", "location", locationId],
      reduce: false,
      limit: limit
    })
    .ok(this, function(json) {
      //Get message keys
      var keys = [];
      for (var i = 0, row; row = json.rows[i]; i++) {
        keys.push(row.value.rd_key);
      }

      this.messageKey(keys, callback, errback);
    });
  }
};

