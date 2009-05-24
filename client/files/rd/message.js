dojo.provide("rd.message");

dojo.require("couch");

rd.message = function(/*String|Array*/ids, /*Function*/callback, /*Function*/errback) {
  //summary: gets a message given an ID. Loads multiple couch documents to create
  //a unified message object for the UI. The method accepts either one string message
  //ID or an array of string message IDs. Normally, you will want to call rd.conversation
  //to get a message combined with all other messages in a certain conversation.

  //Find out if this is just one ID.
  var isOne = typeof ids == "string";
  if (isOne) {
    ids = [ids];
  }

  // XXX - pass the schemas as a param???
  var schemas = ['rd/msg/body', 'rd/msg/conversation', 'rd/tags'];
  //Make sure keys are just the two first segments of the doc IDs.
  var messageResults = []; // in order of input IDs.
  var messageBags = {}; // keyed by rd_key for stitching results.
  var keys = [];
  for (var i = 0, id; id = ids[i]; i++) {
    var this_bag = {};
    messageResults.push(this_bag);
    messageBags[id] = this_bag;
    for (var j=0, schema; schema = schemas[j]; j++)
      keys.push([schema, id]);
  }

  couch.db("raindrop").view("raindrop!content!all/_view/by_raindrop_schema", {
    keys: keys,
    include_docs: true,
    reduce: false,
    success: dojo.hitch(this, function(json, ioArgs) {
      if(!json.rows.length) {
        errback && errback(new Error("no message with ID: " + id));
      } else {
        for (var i = 0, row; row = json.rows[i]; i++) {
          //Make sure we have the right aggregate to use for this row.
          var [this_sch, this_rdkey] = row.key;
          var this_bag = messageBags[this_rdkey];
          // Note that we may get many of the same schema, which implies
          // we need to aggregate them - tags is a good example.  For
          // now just make noise...
          if (this_bag[this_sch])
            console.warn("message", this_rdkey, "has multiple", this_sch, "schemas");
          // for now it gets clobbered if it exists...
          this_bag[this_sch] = row.doc;
        }

        //Now apply data extensions
        // XXX - cowardly disabled by markh - do we want to pass them the
        // consolidated set, or have them register for particular schemas?
        //for (var i = 0, bag; bag = messageBags[i]; i++) {
        //  rd.message.onMessageLoaded(bag);
        //}

        if (isOne) {
          messageResults = messageResults[0];
        }
        callback(messageResults);
      }
    }),
    error: errback
  });
}

dojo._mixin(rd.message, {
  onMessageLoaded: function(/*Object*/messageBag) {
    //summary: an extension point to allow adding things to the
    //message bag before it is returned to a caller. This is how
    //to add UI data extensions for messages.
  }
});
