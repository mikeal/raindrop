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

dojo.provide("rd.api.conversation");

dojo.require("rd.api");

rd.api.conversation = {
 /**
   * @private
   * fetches conversations. Does some magic to figure out how to get
   * a set of conversations given the input ids. 
   *
   * @param {dojo.Deferred} dfd The deferred that should be called
   * with the results.
   *
   * @param {Object} args arguments to pass to the couch calls.
   * 
   * @param {Array} ids could be identity records,
   * contact records, messages that have a conversation_id,
   * or just a plain conversation IDs.
   */
  _conversation: function(dfd, args, ids) {
    //Convert the list to be conversations IDs if they were not before.
    var sample = ids[0], convIds = [];
    if(sample.conversation_id) {
      for (var i = 0, doc; doc = ids[i]; i++) {
        convIds.push(doc.conversation_id);
      }
    } else if (sample.rd_key) {
      if (sample.rd_key[0] == "identity") {
        rd.api().megaview("");
      } else if (sampe.rd_key[0] == "contact") {
        
      } else {
        dfd.errback("rd.api().conversation: unsupported input IDs" + ids);
      }
      
    } else {
      convIds = ids;
    }

    return this._fetch(dfd, args, convIds);
  },

 /**
   * @private
   * fetches conversations based on conversation IDs.
   *
   * @param {dojo.Deferred} dfd The deferred that should be called
   * with the results.
   *
   * @param {Object} args arguments to pass to the couch calls.
   * 
   * @param {Array} ids an array of conversation IDs to fetch. Couch documents
   * can also be passed instead of conversation IDs.
   */
  _fetch: function(dfd, args, ids) {
    // find out all messages in all conversations - build a list of the
    // keys we can use to query a megaview.
    var queryKeys = [];
    for (var i = 0, id; id = ids[i]; i++) {
      queryKeys.push(["rd.msg.conversation", "conversation_id", id]);
    }
    rd.api().megaview({
      reduce: false,
      keys: queryKeys
    })
    .ok(this, function(convList) {
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

        dfd.callback(conversations);
      })
      .error(dfd);
    })
    .error(dfd);
  }

}


rd.api.extend({
  /**
   * @lends rd.api
   * Loads a set of messages. It will use the previous call's results,
   * or, optionally pass an args.ids which is an array of conversation IDs.
   */
  conversation: function(args) {
    if (args && args.ids) {
      rd.api.conversation._conversation(this._deferred, args, args.ids);
    } else {
      this.addParentCallback(dojo.hitch(rd.api.conversation, "_conversation", this._deferred, args));
    }
    return this;
  }
});
