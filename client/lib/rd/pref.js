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

dojo.provide("rd.pref");

dojo.require("rd.api");

/**
 * Gets preferences for a preference ID.
 *
 * @param prefId {string} preference ID. Preference IDs for JavaScript modules
 * or components/widgets should take the form of
 * componentName, componentName:appName, or componentName:appName:instanceId.
 * If the prefId has : parts, then all prefs for the name that have fewer
 * : parts will be loaded at the same time. So, if componentName:appName:instanceId
 * is asked for, then componentName:appName and componentName prefs will also
 * be requested. The more specific name's preferences will take priority
 * over less specific names.
 * 
 * @param callback {function} success callback. Will receive the pref
 * document as the only callback argument. If there are no saved preferences,
 * then callback gets a null value passed to it.
 * 
 * @param errback {function} optional error callback. Will receive an error
 * object as an argument, but that error object is not strictly defined.
 */
rd.pref = function(prefId, callback, errback) {
  //First break down the prefId.
  var parts = prefId.split(":");
  var name = parts[0];
  var prefNames = [name];
  var keys = [rd.pref._key(name)];
  for (var i = 1; i < parts.length; i++) {
    name += ":" + parts[1];
    prefNames.push(name);
    keys.push(rd.pref._key(name));
  }

  var api = rd.api().megaview({
    keys: keys,
    include_docs: true,
    reduce: false
  })
  .ok(function(json) {
    var prefs = {},
        docs = {},
        isEmpty = true;
    //first, conver the json returned values into an object keyed by
    //rd_key value so they are applied to prefs in the right order.
    for (var i = 0, row, doc; (row = json.rows[i]) && (doc = row.doc); i++) {
      isEmpty = false;
      docs[doc.rd_key[1]] = doc;
    }

    if (!isEmpty) {
      //Now cycle through the previously generated keys to get the
      //pref names that should be applied in order, and mixin the prefs
      //for each pref name into the final result.
      for (var i = 0, prefName; prefName = prefNames[i]; i++) {
        var temp = docs[prefName];
        if (temp) {
          dojo._mixin(prefs, temp);
        }
      }
    }

    callback(isEmpty ? null : prefs);
  });
  if (errback) {
    api.error(errback);
  }
}

/**
 * Saves preferences for a preference ID.
 *
 * @param prefId {string} preference ID. Preference IDs for JavaScript modules
 * or components/widgets should take the form of
 * componentName, componentName:appName, or componentName:appName:instanceId.
 * The prefs saved will be for the exact prefId value.
 *
 * @param prefs {object} json object holding the preferences to store.
 * 
 * @param callback {function} success callback. Will receive the pref
 * document as the only callback argument.
 * 
 * @param errback {function} optional error callback. Will receive an error
 * object as an argument, but that error object is not strictly defined.
 */
rd.pref.save = function(prefId, prefs, callback, errback) {
  //First, see if there is an existing doc, to get its _rev and possibly its
  //_id.
  var api = rd.api().megaview({
    key: rd.pref._key(prefId),
    include_docs: true,
    reduce: false
  })
  .ok(function(json) {
    var doc = (json.rows[0] && json.rows[0].doc) || {};

    //Favor existing doc for ID.
    if (doc._id) {
      prefs._id = doc._id;
    }

    if (doc._rev && prefs._rev != doc._rev) {
      var err = new Error("rd.docOutOfDate");
      err.currentRev = doc._rev;
      errback(err);
      return;
    }

    //Fill in any rd_* properties
    if (!prefs.rd_key) {
      prefs.rd_key = doc.rd_key || ["pref", prefId];
    }
    if (!prefs.rd_source) {
      prefs.rd_source = doc.rd_source || null;
    }
    if (!prefs.rd_schema_id) {
      prefs.rd_schema_id = doc.rd_schema_id || "rd.pref";
    }
    if (!prefs.rd_ext_id) {
      prefs.rd_ext_id = doc.rd_ext_id;
    }

    //Save the pref.
    var saveApi = rd.api().put({
      doc: prefs
    }).ok(callback);
    if (errback) {
      saveApi.error(errback);
    }
  });
  if (errback) {
    api.error(errback);
  }
}

/**
 * Generates key for use in megaview calls.
 *
 * @param prefId {string} preference ID. Preference IDs for JavaScript modules
 * @private
 */

rd.pref._key = function(prefId) {
  return ['rd.core.content', 'key-schema_id', [["pref", prefId], "rd.pref"]];
}
