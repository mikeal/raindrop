/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Raindrop.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Messaging, Inc..
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * */

dojo.provide("rd.tag");

dojo.require("rd.api");

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
      ['rd.mailing-list', 'id'],
      ['rd.mailing-list', 'id', {}],
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
    var api = rd.api().megaview({
      startkey: startKey,
      endkey: endKey,
      group: true
    })
    .ok(this, function(json) {
      var list = [];
      for (var i = 0, row; row = json.rows[i]; i++) {
        list.push(row.key[2]);
      }
      callback(list);
    });
    if (errback) {
      api.error(errback);
    }
  }
}
