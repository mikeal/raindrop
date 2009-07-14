dojo.provide("rd.store");

rd.store = {
  put: function(/*Object*/doc, /*Function*/callback, /*Function?*/errback) {
    //summary: puts a document in the raindrop data store.
    //If successful, callback is called with the doc as the only argument.
    var docUrl = "/raindrop/" + doc._id;
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
