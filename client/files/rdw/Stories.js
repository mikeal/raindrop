dojo.provide("rdw.Stories");
dojo.require("rdw._Base");
dojo.require("rdw.Story");

dojo.declare("rdw.Stories", [rdw._Base], {
  _docs: null,
  
  // docs is called w/ a set of document IDs which correspond to
  // the messages that we want to display.  But we want to display
  // them in context, so we need to find the set of related
  // mesages which provide the 'story'.
  docs: function(rows) {
    if (!rows)
      return this._docs;

    this._docs = rows;

    // Remove existing message widgets from the presentation.
    rd.query(".Message", this.domNode).forEach(function(message) {
      rd.destroy(message);
    });

    // we need to find out the set of conversation IDs that we're
    // about to display.
    this.conv_ids_map = {};
    this.conv_ids = [];
    var convid;
    rd.map(rows, dojo.hitch(this, function(row) {
      // we want to figure out all of the conversation id's that we need to
      // then find all messages for.
      convid = row.value.conversation_id;
      if (! this.conv_ids_map[convid]) {
        this.conv_ids_map[convid] = [];
        this.conv_ids.push(convid);
      }
    }));
    // We are going to do a bunch of XHR calls, and when they're all
    // done, we'll create the DOM widgets.
    // We'll keep track of the number of pending such calls.
    this.waitingForN = this.conv_ids.length;
    var docs = dojo.forEach(this.conv_ids, dojo.hitch(this, function(convid) {
      var startkey = convid;
      var endkey = convid + 'A';
      // find out all messages in this conversation
      couch.db("raindrop").view("raindrop!messages!by/_view/by_conversation", {
        startkey: startkey,
        endkey: endkey,
        include_docs: true,
        group: false,
        error: dojo.hitch(this, function(json) {
          this.gotOne();
        }),
        success: dojo.hitch(this, function(convid, json2) {
          // we now have the messages in that conversation, we need to
          // find all of the documents corresponding to each.
          conversation = this.conv_ids_map[convid];
          dojo.forEach(json2.rows, dojo.hitch(this, function(conversation, row) {
              var [msg, pid, doc_type] = row.id.split('!', 3);
              conversation.push(row.doc);
            }, conversation));
          this.gotOne();
        }, convid)
      })
    }));
    return true;
  },

  createStories: function() {
    //Use a document fragment for best performance
    //and load up each story widget in there.
    var frag = dojo.doc.createDocumentFragment();
    dojo.forEach(this.conv_ids, dojo.hitch(this, function(convid) {
      new rdw.Story({
         msgs: this.conv_ids_map[convid]
       }, dojo.create("div", null, frag));
    }));

    //Inject nodes all at once for best performance.
    this.domNode.appendChild(frag);    

    // Return anything to suppress JavaScript strict warnings about the function
    // not always returning a value.
    return true;
  },

  gotOne: function() {
    this.waitingForN -= 1;
    if (this.waitingForN == 0) {
      this.createStories();
    }
  },
  templateString: '<ol id="Stories"></ol>'
});
