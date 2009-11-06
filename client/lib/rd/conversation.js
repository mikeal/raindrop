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

dojo.require("rd.store");
dojo.require("rd.contact");
dojo.require("rd.api");

rd.conversation = function(/*String|Array*/ids, /*Function*/callback, /*Function*/errback) {
  //summary: retrieve the conversation for a given conversation ID or conversation IDs. Either one
  //conversation ID string or an array of string conversation IDs can be passed. Couch documents
  //can also be passed instead of conversation IDs.

  //Find out if this is just one ID.
  var isOne = typeof ids == "string";
  if (isOne) {
    ids = [ids];
  }

  //Skip the processing if no IDs passed in.
  if (!ids.length) {
    if (errback) {
      errback("no ids");
    } else {
      callback([]);
    }
    return;
  }

  //Convert the list to be conversations IDs if they were not before.
  if(ids[0].conversation_id) {
    convIds = [];
    for (var i = 0, doc; doc = ids[i]; i++) {
      convIds.push(doc.conversation_id);
    }
    ids = convIds;
  }

  // find out all messages in all conversations - build a list of the
  // keys we can use to query a megaview.
  var queryKeys = [];
  for (var i = 0, id; id = ids[i]; i++) {
    queryKeys.push(["rd.msg.conversation", "conversation_id", id]);
  }
  rd.store.megaview({
    reduce: false,
    keys: queryKeys,
    success: dojo.hitch(this, function(convList) {
      //Build up a list of rd_keys for the messages so we can fetch whatever
      // schemas are necessary.
      var rdKeys = [];
      for (var i = 0, row; row = convList.rows[i]; i++) {
        rdKeys.push(row.value.rd_key);
      }

      rd.api().message({
        ids: rdKeys
      })
      .ok(function(messages) {
        //Create final result. It will be an array that
        //also has properties for each conversation ID,
        //to allow for easy retrieval.
        var conversations = [];

        for (var i = 0, message; message = messages[i]; i++) {
          var convId = message['rd.msg.conversation'].conversation_id;
          var conv = conversations["cId:" + convId];
          if (!conv) {
            conv = conversations["cId:" + convId] = [];
            conversations.push(conv);
          }
          conv.push(message);
        }

        //Now sort the messages in each conversation by timestamp,
        //earliest timestamp first.
        for(var i = 0; i < conversations.length; i++) {
          conversations[i].sort(function(a, b) {
            return a["rd.msg.body"].timestamp > b["rd.msg.body"].timestamp ? 1 : -1;
          });
        }

        //Now sort conversations so the conversation with a message that is most
        //recent is first.
        conversations.sort(function(a, b) {
          return a[a.length - 1]["rd.msg.body"].timestamp > b[b.length - 1]["rd.msg.body"].timestamp ? -1 : 1;
        });

        if (isOne) {
          conversations = conversations[0];
        }
        callback(conversations);
      })
      .error(errback);
    })
  });
}

dojo._mixin(rd.conversation, {
  home: function(/*Number*/limit, /*Function*/callback, /*Function*/errback) {
    rd.api().rest('inflow/conversations/home', {limit: limit}, callback, errback);
  },

  messageKey: function(/*String|Array*/ids, /*Function*/callback, /*Function*/errback) {
    //summary: gets conversations based on message IDs passed in. ids can be one string
    //message document ID or an array of string message document IDs.
    rd.api().rest('inflow/conversations/with_messages', {keys: ids}, callback, errback);
  },

  direct: function(/*Number*/limit, /*Function*/callback, /*Function*/errback) {
    //summary: gets the most recent direct messages up to limit, then pulls
    //the conversations associated with those messages. Conversation with
    //the most recent message will be first.
    rd.api().rest('inflow/conversations/direct', {limit: limit}, callback, errback);
  },

  group: function(/*Number*/limit, /*Function*/callback, /*Function*/errback) {
    //summary: gets the most recent group messages up to limit, then pulls
    //the conversations associated with those messages. Conversation with
    //the most recent message will be first.
    rd.api().rest('inflow/conversations/group', {limit: limit},
                    callback, errback);
  },

  broadcast: function(/*Number*/limit, /*Function*/callback, /*Function*/errback) {
    //summary: gets the most recent broadcast messages up to limit, then pulls
    //the conversations associated with those messages. Conversation with
    //the most recent message will be first.
    rd.api().rest('inflow/conversations/broadcast', {limit: limit},
                    callback, errback);
  },

  location: function(/*Array*/locationId, /*Number*/limit, /*Function*/callback, /*Function*/errback) {
    //summary: gets the most recent messages up to a limit for a given imap folder
    //location ID, then pulls the conversations associated with those messages.
    //Conversation with the most recent message will be first.
    rd.store.megaview({
      key: ["rd.msg.location", "location", locationId],
      reduce: false,
      limit: limit,
      success: dojo.hitch(this, function(json) {
        //Get message keys
        var keys = [];
        for (var i = 0, row; row = json.rows[i]; i++) {
          keys.push(row.value.rd_key);
        }

        this.messageKey(keys, callback, errback);
      })
    });
  },

  sent: function(/*Number*/limit, /*Function*/callback, /*Function*/errback) {
    //summary get all conversations sent by the user according to their account
    //identities
    return rd.api().rest("inflow/conversations/identities")
  },

  contact: function(/*String*/contactId, /*Function*/callback, /*Function*/errback) {
    //summary: updates display to show messages related to
    //a given contact.
    return rd.api().rest('inflow/conversations/contact', {id: '"' + contactId + '"'},
                         callback, errback);
  }
});
