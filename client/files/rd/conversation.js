dojo.provide("rd.conversation");

dojo.require("couch");
dojo.require("rd.contact");
dojo.require("rd.message");

rd.conversation = function(/*String|Array*/ids, /*Function*/callback, /*Function*/errback) {
  //summary: retrieve the conversation for a given conversation ID or conversation IDs. Either one
  //conversation ID string or an array of string conversation IDs can be passed. Couch documents
  //can also be passed instead of conversation IDs.

  //Find out if this is just one ID.
  var isOne = typeof ids == "string";
  if (isOne) {
    ids = [ids];
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
    queryKeys.push(["rd/msg/conversation", "conversation_id", id]);
  }
  couch.db("raindrop").view("raindrop!megaview!all/_view/all", {
    reduce: false,
    keys: queryKeys,
    success: dojo.hitch(this, function(convList) {
      //Build up a list of rd_keys for the messages so we can fetch whatever
      // schemas are necessary.
      var rdKeys = [];
      for (var i = 0, row; row = convList.rows[i]; i++) {
        rdKeys.push(row.value.rd_key);
      }

      rd.message(rdKeys, function(messages){
        //Create final result. It will be an array that
        //also has properties for each conversation ID,
        //to allow for easy retrieval.
        var conversations = [];
        
        for (var i = 0, message; message = messages[i]; i++) {
          var convId = message['rd/msg/conversation'].conversation_id;
          var conv = conversations["cId:" + convId];
          if (!conv) {
            conv = conversations["cId:" + convId] = [];
            conversations.push(conv);
          }
          conv.push(message);
        }

        if (isOne) {
          conversations = conversations[0];
        }
        callback(conversations);
      }, errback)
    })
  });
}

dojo._mixin(rd.conversation, {
  byMessageId: function(/*String|Array*/ids, /*Function*/callback, /*Function*/errback) {
    //summary: gets conversations based on message IDs passed in. ids can be one string
    //message document ID or an array of string message document IDs.
    
    //Find out if this is just one ID.
    var isOne = typeof ids == "string";
    if (isOne) {
      ids = [ids];
    }

    //Map the message IDs to conversation IDs.
    couch.db("raindrop").view("raindrop!conversations!by/_view/by_id", {
      keys: ids,
      success: dojo.hitch(this, function(json) {
        //Grab the conversation IDs.
        var convIds = [];
        for (var i = 0, row; row = json.rows[i]; i++) {
          convIds.push(row.value);
        }

        //Now load conversations based on those IDs.
        this(isOne ? convIds[0] : convIds, callback, errback);
      }),
      error: errback
    });    
  },

  byTimeStamp: function(/*Number*/limit, /*Function*/callback, /*Function*/errback) {
    //summary: gets the most recent messages up to limit, then
    //pulls the conversations associated with those messages.
    // XXX - this could be optimized as we again re-fetch these messages when
    // fetching all in the convo.
    couch.db("raindrop").view("raindrop!megaview!all/_view/all", {
      reduce: false,
      startkey: ["rd/msg/body", "timestamp", {}],
      endkey: ["rd/msg/body", "timestamp"],
      limit: limit,
      descending: true,
      success: dojo.hitch(this, function(json) {
        // so we now have the rd_key for messages in timestamp order;
        // now we need to fetch the 'rd/msg/conversation' schema to fetch the
        // convo ID.
        var keys = [];
        for (var i = 0, row; row = json.rows[i]; i++) {
          keys.push(['rd/msg/conversation', row.value.rd_key]);
        }
        couch.db("raindrop").view("raindrop!docs!all/_view/by_raindrop_schema", {
          keys: keys,
          reduce: false,
          include_docs: true,
          success: dojo.hitch(this, function(json) {
            // XXX - how to do sets better in js?????
            // And can't we just avoid 'reduce=false' and let the the reduce
            // function make them unique?
            var convSet = {}
            for (var i = 0, row; row = json.rows[i]; i++) {
              convSet[row.doc.conversation_id] = row.doc.conversation_id;
            }
            var convIds = [];
            for each (var cid in convSet) {
              convIds.push(cid);
            }
            this(convIds, callback, errback);
          })
        })
      })
    });
  },

  byContact: function(/*String*/contactId, /*Function*/callback, /*Function*/errback) {
    //summary: updates display to show messages related to
    //a given contact.

    //Get the list of identities for the user.
    rd.contact.get(contactId, dojo.hitch(this, function(contact) {
      //Pull out the identity IDs
      var ids = rd.map(contact.identities, function(identity) {
        return identity.identity_id;
      });

      //Use megaview to select all messages based on the identity
      //IDs. This is a bit tricky since we can only get messages for
      //a given identity ID, so have to do multiple calls.
      //TODO: just using the twitter identity for now, to test megaview.
      var id = null;
      rd.forEach(ids, function(iid) {
        if(iid[0] == "twitter"){
          id = iid;
        }
      });

      if (!id) {
        return;
      }

      couch.db("raindrop").view("raindrop!megaview!all/_view/all", {
        reduce: false,
        startkey: ["message", "from", id, 0],
        endkey: ["message", "from", id, 9999999999],
        include_docs: true,
        success: dojo.hitch(this, function(json) {
          //Get the list of message IDs.
          if(json.rows.length) {
            var messageDocIds = [];
            for (var i = 0, row; row = json.rows[i]; i++) {
              messageDocIds.push(row.id);
            }
          }

          if(!messageDocIds.length) {
            return;
          }

          //Load the conversations based on these message IDs.
          rd.conversation.byMessageId(messageDocIds, function(conversations) {
            //Sort the conversations.
            conversations.sort(function(a, b) {
              return a[0].message.timestamp > b[0].message.timestamp ? -1 : 1;
            });

            callback(conversations);
          }, errback);         
        }),
        error: errback     
      });
    }), errback);
  }
});
