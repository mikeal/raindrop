dojo.provide("rd.ext");

dojo.require("rd.store");

rd.ext = {
  getUIExtension: function(/*Function*/callback, /*Function*/errback) {
    //summary: gets all UI extensions as couch documents.
    rd.store.megaview({
      reduce: false,
      startkey: ['rd.identity', 'image'],
      endkey: ['rd.identity', 'image', {}],
      success: function(json) {
        // We have all identities with images - now find out which of these
        // identities have sent a message...
        var keys = [];
        for (var i = 0, row; row = json.rows[i]; i++) {
          var rd_key = row.value.rd_key;
          // rd_key is ['identity', identity_id]
          keys.push(["rd.msg.body", "from", rd_key[1]]);
        }
      },
      error: errback
    });

  }
};
