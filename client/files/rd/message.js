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

  //Make sure keys are just the two first segments of the doc IDs.
  var keys = [];
  for (var i = 0, id; id = ids[i]; i++) {
    keys.push(id.split("!", 2).join("!"));
  }

  var messageBags = [];
  couch.db("raindrop").view("raindrop!messages!by/_view/by_id_no_raw_proto", {
    keys: keys,
    include_docs: true,
    success: dojo.hitch(this, function(json, ioArgs) {
      //Error out if no rows return.
      if(!json.rows.length) {
        errback && errback(new Error("no message with ID: " + id));
      } else {
        var bag, currentId;
        for (var i = 0, row; row = json.rows[i]; i++) {
          //Make sure we have the right aggregate to use for this row.
          if(row.key != currentId) {
            var index = dojo.indexOf(keys, row.key);
            bag = messageBags[index] || (messageBags[index] = {});
            currentId = row.key;
          }
          bag[row.value] = row.doc;
        }

        //Now apply data extensions
        for (var i = 0, bag; bag = messageBags[i]; i++) {
          rd.message.onMessageLoaded(bag);
        }

        if (isOne) {
          messageBags = messageBags[0];
        }
        callback(messageBags);
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
