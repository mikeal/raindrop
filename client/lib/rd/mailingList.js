dojo.provide("rd.mailingList");

dojo.require("rd.store");

rd.mailingList = {
  /**
   * Get the mailing list with the given ID.
   *
   * @param id {string} the ID of the mailing list to retrieve.
   * @param callback {function} success callback. Will receive an object.
   * @param errback {function} optional error callback. Will receive an error
   * object as an argument, but that error object is not strictly defined.
   */
  get: function(/*String*/id, /*Function*/callback, /*Function*/errback) {
    rd.store.megaview({
      key: ['rd.mailing-list', 'id', id],
      reduce: false,
      include_docs: true,
      success: function(json) {
        var doc;
        if (json.rows.length > 0)
          doc = json.rows[0].doc;
        callback(doc);
      },
      error: errback
    });
  }
}
