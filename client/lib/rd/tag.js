dojo.provide("rd.tag");

dojo.require("rd.store");

rd.tag = {
  /**
   * Gets a list of tags that are locations corresponding to imap folders.
   *
   * @param callback {function} success callback. Will receive an array
   * of location names as the only callback argument. Each array item itself is
   * and array, indicating a heirarchy of the location.
   * 
   * @param errback {function} optional error callback. Will receive an error
   * object as an argument, but that error object is not strictly defined.
   */
  locations: function(callback, errback) {
    this._fetchGroupedIds(
      ["rd.msg.location", "location"],
      ["rd.msg.location", "location", {}],
      callback,
      errback
    );
  },

  /**
   * Gets a list of mailing lists.
   *
   * @param callback {function} success callback. Will receive an array
   * of mailing list names as the only callback argument.
   * 
   * @param errback {function} optional error callback. Will receive an error
   * object as an argument, but that error object is not strictly defined.
   */
  lists: function(callback, errback) {
    this._fetchGroupedIds(
      ['rd.msg.email.mailing-list', 'id'],
      ['rd.msg.email.mailing-list', 'id', {}],
      callback,
      errback
    );
  },

  /**
   * Helper for doing megaview grouped calls that just get ids.
   *
   * @param startKey {array} start key to use for megaview call.
   * 
   * @param endKey {array} end key to use for megaview call.
   * 
   * @param callback {function} success callback. Will receive an array
   * of ids.
   * 
   * @param errback {function} optional error callback. Will receive an error
   * object as an argument, but that error object is not strictly defined.
   *
   * @private
   */
  _fetchGroupedIds: function(startKey, endKey, callback, errback) {
    rd.store.megaview({
      startkey: startKey,
      endkey: endKey,
      group: true,
      success: dojo.hitch(this, function(json) {
        var list = [];
        for (var i = 0, row; row = json.rows[i]; i++) {
          list.push(row.key[2]);
        }
        callback(list);
      }),
      error: errback
    });    
  }
}
