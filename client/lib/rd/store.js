dojo.provide("rd.store");

dojo.require("couch");

rd.store = {
  megaview: function(/*Object*/args) {
    //summary: thin wrapper around couch megaview call, just to avoid having
    //to remember or copy/paste the megaview url.
    return couch.db("raindrop").view("raindrop!content!all/_view/megaview", args);
  },

  put: function(/*Object*/doc, /*Function*/callback, /*Function?*/errback) {
    //summary: puts a document in the raindrop data store. If doc has a _rev
    //value of "latest", the doc will first be fetched to get the latest _rev,
    //and use that _rev for the doc update.
    //If successful, callback is called with the doc as the only argument.
    //It will generate the _id and rd_ext_id on the document if it does
    //not exist. Warning: it modifies the doc object.

    //Add generic UI extension ID if needed.
    if (!doc.rd_ext_id) {
      doc.rd_ext_id = rd.uiExtId;
    }

    //Generate the ID for the document, if needed.
    if (!doc._id) {
      doc._id = "rc!"
              + doc.rd_key[0]
              + "."
              + rd.toBase64(doc.rd_key[1])
              + "!"
              + doc.rd_ext_id
              + "!"
              + doc.rd_schema_id;
    }

    if (doc._rev && doc._rev == "latest") {
        //If caller indicates that the latest _rev should be used,
        //fetch it and apply that _rev to the document for updating.
        dojo.xhrGet({
          url: rd.dbPath + doc._id,
          load: function(response, ioArgs) {
            doc._rev = response._rev;
            this._put(doc, callback, errback);
          },
          error: errback
        });
    } else {
      //Just do the update with the info available now in the doc.
      this._put(doc, callback, errback);
    }
  },

  _put: function(/*Object*/doc, /*Function*/callback, /*Function?*/errback) {
    //summary: private utility to do the real send.

    var docUrl = rd.dbPath + doc._id;
    if (doc._rev) {
      docUrl += "?rev=" + doc._rev;
    }

    dojo.xhrPut({
      url: docUrl,
      putData: dojo.toJson(doc),
      load: function(response, ioArgs) {
        callback(doc);
      },
      error: errback
    });
  }
}
