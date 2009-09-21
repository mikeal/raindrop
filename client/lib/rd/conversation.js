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
    //summary: returns the number of conversations based on the limit. Favors
    //direct and group messages vs broadcast messages.

    var directDfd = new dojo.Deferred();
    var groupDfd = new dojo.Deferred();
    var broadcastDfd = new dojo.Deferred();
    var dfdList = new dojo.DeferredList([directDfd, groupDfd, broadcastDfd]);
    var allRecips = [];

    //Direct messages
    rd.api().megaview({
      startkey: ["rd.msg.recip-target", "target-timestamp", ["direct", {}]],
      endkey: ["rd.msg.recip-target", "target-timestamp", ["direct"]],
      descending: true,
      reduce: false,
      include_docs: true,
      limit: limit
    })
    .ok(function(results) {
      if (results && results.rows && results.rows.length) {
        allRecips = allRecips.concat(results.rows);
      }
      directDfd.callback(results);
    })
    .error(function(err) {
       directDfd.errback(err);
    });

    //Group messages
    rd.api().megaview({
      startkey: ["rd.msg.recip-target", "target-timestamp", ["group", {}]],
      endkey: ["rd.msg.recip-target", "target-timestamp", ["group"]],
      descending: true,
      reduce: false,
      include_docs: true,
      limit: limit
    })
    .ok(function(results) {
      if (results && results.rows && results.rows.length) {
        allRecips = allRecips.concat(results.rows);
      }
      groupDfd.callback(results);
    })
    .error(function(err) {
       groupDfd.errback(err);
    });

    //Broadcast messages
    rd.api().megaview({
      startkey: ["rd.msg.recip-target", "target-timestamp", ["broadcast", {}]],
      endkey: ["rd.msg.recip-target", "target-timestamp", ["broadcast"]],
      descending: true,
      reduce: false,
      include_docs: true,
      limit: limit
    })
    .ok(function(results) {
      if (results && results.rows && results.rows.length) {
        allRecips = allRecips.concat(results.rows);
      }
      broadcastDfd.callback(results);
    })
    .error(function(err) {
       broadcastDfd.errback(err);
    });

    //Action to do once all deferreds complete.
    dfdList.addCallback(this, function() {
      //Convert the allRecips to docs.
      allRecips = dojo.map(allRecips, function(item) {
        return item.doc;
      });

      //Filter out the items that are not "fresh".
      rd.api().fresh({
        ids: allRecips
      })
      .ok(this, function(fresh) {
        //sort the allRecips by timestamp
        allRecips = fresh;

        allRecips.sort(function(a, b) {
          return a.timestamp > b.timestamp ? -1 : 1;
        });
  
        // The json has the rd_key for messages in timestamp order;
        // now we need to fetch the 'rd.msg.conversation' schema to fetch the
        // convo ID.
        var keys = [];
        for (var i = 0, doc; doc = allRecips[i]; i++) {
          keys.push(['rd.core.content', 'key-schema_id', [doc.rd_key, 'rd.msg.conversation']]);
        }
        rd.store.megaview({
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
            for (var cid in convSet) {
              convIds.push(convSet[cid]);
            }
            this(convIds, function(convos) {
              convos.sort(function(a, b) {
                //Look at last message in each convo.
                var aBody = a[a.length - 1]["rd.msg.body"] || {};
                var bBody = b[b.length - 1]["rd.msg.body"] || {};
  
                return aBody.timestamp > bBody.timestamp ? -1 : 1;
              });
              
              callback(convos);
            },
            errback);
          })
        });
      })
      .error(this, function(err) {
        if (errback) {
          errback(err);
        }
      });
    });

    //Error dispatching.
    dfdList.addErrback(function(err){
      if (errback) {
        errback(err);
      }
    });
  },

  messageKey: function(/*String|Array*/ids, /*Function*/callback, /*Function*/errback) {
    //summary: gets conversations based on message IDs passed in. ids can be one string
    //message document ID or an array of string message document IDs.

    //Find out if this is just one ID.
    var isOne = typeof ids == "string";
    if (isOne) {
      ids = [ids];
    }
    // XXX - this is duplicated below in byTimeStamp...
    var keys = [];
    for (var i = 0; i< ids.length; i++) {
      keys.push(['rd.core.content', 'key-schema_id', [ids[i], 'rd.msg.conversation']]);
    }
    rd.store.megaview({
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
        for (var cid in convSet) {
          convIds.push(convSet[cid]);
        }
        //Now load conversations based on those IDs.
        this(isOne ? convIds[0] : convIds, callback, errback);
      }),
      error: errback
    });    
  },

  direct: function(/*Number*/limit, /*Function*/callback, /*Function*/errback) {
    //summary: gets the most recent direct messages up to limit, then pulls
    //the conversations associated with those messages. Conversation with
    //the most recent message will be first.
    this._query({
      startkey: ["rd.msg.recip-target", "target-timestamp", ["direct", {}]],
      endkey: ["rd.msg.recip-target", "target-timestamp", ["direct"]],
      limit: limit      
    }, callback, errback);   
  },

  group: function(/*Number*/limit, /*Function*/callback, /*Function*/errback) {
    //summary: gets the most recent group messages up to limit, then pulls
    //the conversations associated with those messages. Conversation with
    //the most recent message will be first.
    this._query({
      startkey: ["rd.msg.recip-target", "target-timestamp", ["group", {}]],
      endkey: ["rd.msg.recip-target", "target-timestamp", ["group"]],
      limit: limit      
    }, callback, errback);
  },

  broadcast: function(/*Number*/limit, /*Function*/callback, /*Function*/errback) {
    //summary: gets the most recent broadcast messages up to limit, then pulls
    //the conversations associated with those messages. Conversation with
    //the most recent message will be first.
    this._query({
      startkey: ["rd.msg.recip-target", "target-timestamp", ["broadcast", {}]],
      endkey: ["rd.msg.recip-target", "target-timestamp", ["broadcast"]],
      limit: limit      
    }, callback, errback);
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

  starred: function(/*Number*/limit, /*Function*/callback, /*Function*/errback) {
    /* Not yet implemented */
  },

  sent: function(/*Number*/limit, /*Function*/callback, /*Function*/errback) {
    //summary get all conversations sent by the user according to their account
    //identities and related contacts
/*
    rd.api().me().conversation({
      identity: "from"
      limit: 
      
    }).ok(callback).error(errback);
*/
    rd.api().me()
    .ok(this, function(idtys) {
      //Remap the services that count, from uses "email", not "imap"
      var allowedServices = {
        twitter: "twitter",
        email: "imap"
      };

      //Build up a list of identity IDs for yourself
      var senders = [];
      for (var i = 0, idty; idty = idtys[i]; i++) {
        var id = idty.rd_key[1];
        if (id[0] in allowedServices) {
          //Add to list of senders we are willing to handle
          senders.push([allowedServices[id[0]], id[1]]);
        }
      }

      //Lookup the array of contacts by the array of identities
      rd.contact.byIdentity(senders, dojo.hitch(this, function(contacts){
        if (!contacts) {
          callback([]);
        } else {
          var contact_ids = rd.map(contacts, function(contact) {
            return contact.rd_key[1];
          });
          this.contact(contact_ids, callback, errback);
        }
      }));
    });
  },

  latest: function(/*Number*/limit, /*Number*/skip, /*Function*/callback, /*Function*/errback) {
    //summary: gets the most recent messages up to limit, then
    //pulls the conversations associated with those messages. Conversation with
    //the most recent message will be first.

    // XXX - this could be optimized as we again re-fetch these messages when
    // fetching all in the convo.
    this._query({
      startkey: ["rd.msg.body", "timestamp", {}],
      endkey: ["rd.msg.body", "timestamp"],
      limit: limit,
      skip: skip
    }, callback, errback);
  },

  contact: function(/*String*/contactId, /*Function*/callback, /*Function*/errback) {
    //summary: updates display to show messages related to
    //a given contact.

    //Get the list of identities for the user.
    rd.api().contact({
      ids: typeof contactId == "string" ? [contactId] : contactId
    })
    .ok(this, function(contact) {
      //Use megaview to select all messages based on the identity
      //IDs.
      var identities = contact.identities;
      if (dojo.isArray(contact)) {
        identities = [];
        for (var i = 0, c; c = contact[i]; i++) {
          identities = identities.concat(c.identities);
        }
      }

      var keys = rd.map(identities, function(identity) {
        return ["rd.msg.body", "from", identity.rd_key[1]];
      });
      if (!keys) {
        console.error("seem to have no identities for this contact??");
        return;
      }

      rd.store.megaview({
        reduce: false,
        keys: keys,
        success: dojo.hitch(this, function(json) {
          //Get the list of message IDs.
          if(!json.rows.length) {
            console.log("no messages from this contact");
            return;
          }
          var messageKeys = [];
          for (var i = 0, row; row = json.rows[i]; i++) {
            messageKeys.push(row.value.rd_key);
          }
          if(!messageKeys.length) {
            return;
          }

          //Load the conversations based on these message IDs.
          rd.conversation.messageKey(messageKeys, function(conversations) {
            //Sort the conversations.
            conversations.sort(function(a, b) {
              return a[0]['rd.msg.body'].timestamp > b[0]['rd.msg.body'].timestamp ? -1 : 1;
            });

            callback(conversations);
          }, errback);         
        }),
        error: errback     
      });
    })
    .error(errback);
  },

  _query: function(/*Object*/args, /*Function*/callback, /*Function*/errback) {
    //summary: handles fetching the conversations for the messages in the
    //json returned from a timestamp-related query.

    //Combine args with standard args for the megaview call.
    var mvArgs = dojo._mixin({
      reduce: false,
      startkey: ["rd.msg.body", "timestamp", {}],
      endkey: ["rd.msg.body", "timestamp"],
      descending: true,
      success: dojo.hitch(this, function(json) {
        // The json has the rd_key for messages in timestamp order;
        // now we need to fetch the 'rd.msg.conversation' schema to fetch the
        // convo ID.
        var keys = [];
        for (var i = 0, row; row = json.rows[i]; i++) {
          keys.push(['rd.core.content', 'key-schema_id', [row.value.rd_key, 'rd.msg.conversation']]);
        }
        rd.store.megaview({
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
            for (var cid in convSet) {
              convIds.push(convSet[cid]);
            }
            this(convIds, callback, errback);
          })
        });
      }),
      error: errback
    }, args);

    //If no descending preference is made, default to true,
    //to get most recent items first.
    if (!"descending" in mvArgs) {
      mvArgs.descending = true;
    }

    rd.store.megaview(mvArgs);
  }
});
