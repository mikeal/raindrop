//Never dojo.require this file directly, only dojo.require rd.api.
dojo.provide("rd.api.message");

dojo.require("rd.api");
dojo.require("rd.api.identity");

rd.api.message = {
  /**
   * @private
   * fetches a message based on a message ID.
   * Tries to use couch info, but for certain services
   * falls back to using the service API associated with the identity.
   *
   * @param {dojo.Deferred} dfd The deferred that should be called
   * with the results.
   *
   * @param {Object} args arguments to pass to the couch calls.
   * 
   * @param {Array} ids an array of message IDs to fetch.
   */
  _fetch: function(dfd, args, ids) {
    //Generate proper key for megaview lookup.
    var keys = [];
    for (var i = 0, id; id = ids[i]; i++) {
      keys.push(['rd.core.content', 'key', id]);
    }

    rd.api().megaview({
      keys: keys,
      include_docs: true,
      reduce: false
    })
    .ok(this, function(json) {
      if(!json.rows.length) {
        dfd.errback(new Error("no message with IDs: " + ids));
      } else {
        var messageResults = [],
            bag = {},
            fromMap = {},
            fromIds = [];

        for (var i = 0, row, doc; ((row = json.rows[i]) && (doc = row.doc)); i++) {
          //Make sure we have the right aggregate to use for this row.
          var rdKey = doc.rd_key;
          var schemaId = doc.rd_schema_id;

          //Skip some schemas since it is extra stuff we do not need.
          //Prefer a blacklist vs. a whitelist, since user extensions may add
          //other things, and do not want to have extensions register extra stuff? TODO.
          if (schemaId.indexOf("/rfc822") == -1 && schemaId.indexOf("/raw") == -1) {
            // TODO: note that we may get many of the same schema, which implies
            // we need to aggregate them - tags is a good example.  For
            // now just make noise...
            if (bag[schemaId]) {
              console.warn("message", doc.rd_key, "has multiple", schemaId, "schemas");
            }
            // for now it gets clobbered if it exists...
            bag[schemaId] = row.doc;
          }

          //See if all schemas are loaded for a message bag by checking the next
          //document in the json results to see if it has a different rd_key.
          //If so, then tell any extensions about new message load.
          var nextDoc = json.rows[i + 1] && json.rows[i + 1].doc;
          if (!nextDoc || rdKey[1] != nextDoc.rd_key[1]) {
            //Have a final bag. Make sure it is not a ghost by checking
            //for a body.
            if (bag["rd.msg.body"]) {              
              //Hold on to the from names to check if they are known later
              //TODO: this should probably be a back end extension.
              var from = bag["rd.msg.body"].from;
              var fromId = from.join(",");
              var fromList = fromMap[fromId];
              if (!fromList) {
                fromList = fromMap[fromId] = [];
                fromIds.push(from);
              }
              fromList.push(bag);

              messageResults.push(bag);
            }
            //Reset the bag.
            bag = {};
          }
        }

        //Look up the IDs for the from identities. If they are real
        //identities, synthesize a schema to represent this.
        //TODO: this should probably be a back-end extension.
        rd.api().contactIdentity({
          ids: fromIds
        })
        .ok(this, function(identities) {
          //Cycle through the identities, and work up a schema for
          //them if they are known.
          for (var i = 0, idty; idty = identities[i]; i++) {
            var msgBags = fromMap[idty.rd_key[1].join(",")];
            for (var j = 0, bag; bag = msgBags[j]; j++) {
              bag["rd.msg.ui.known"] = {
                rd_schema_id : "rd.msg.ui.known"
              };
            }
          }

          dfd.callback(messageResults);
        })
        .error(dfd);
      }
    })
    .error(dfd);
  }
};

rd.api.extend({
  /**
   * @lends rd.api
   * Loads a set of messages. It will use the previous call's results,
   * or, optionally pass an args.ids which can be a one string messsage ID
   * or an array of message IDs.
   */
  message: function(args) {
    if (args && args.ids) {
      rd.api.message._fetch(this._deferred, args, args.ids);
    } else {
      this.addParentCallback(dojo.hitch(rd.api.message, "_fetch", this._deferred, args));
    }
    return this;
  }
});
