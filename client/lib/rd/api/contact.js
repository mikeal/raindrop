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

dojo.provide("rd.api.contact");

dojo.require("rd.api");
dojo.require("rd.api.identity");

rd.api.contact = {
  /**
   * storage for the contacts. Using an array, even though there will
   * be properties on it for each contactId to allow combined ease of lookup
   * with an array of all contacts
   */
  _store: [],

  /**
   * @private
   * filters the found from the missing contacts so only the
   * missing ones are fetched via the network.
   *
   * @param {Array} ids an array of string contact IDs.
   *
   * @returns {Object} has two properties, "found" and "missing"
   * that are arrays of contact IDs.
   */
  _filter: function(ids) {
    var missing = [], found = [];

    for (var i = 0, id; id = ids[i]; i++) {
      var temp = this._store[id];
      temp && temp.identities ? found.push(temp) : missing.push(id);
    }

    return {
      found: found.length ? found : null,
      missing: missing.length ? missing: null
    }
  },

 /**
   * @private
   * fetches contacts based on contact IDs.
   *
   * @param {dojo.Deferred} dfd The deferred that should be called
   * with the results.
   *
   * @param {Object} args arguments to pass to the couch calls.
   * 
   * @param {Array} ids an array of contact IDs to fetch.
   */
  _fetch: function(dfd, args, ids) {
    //rd.api.identity handles loading of the identity/contact records, so wait for it.
    rd.api.identity._fetchIdentityContacts().addErrback(dfd, "errback").addCallback(this, function() {
      //Figure out what kind of IDs there are.
      var sample = ids[0];
      if (sample && sample.rd_key && sample.rd_key[0] == "identity") {
        //They are identity docs. Find the contact IDs by using
        //the lookups from rd.api.identity.
        var temp = [], identity = rd.api.identity;
        for (var i = 0, idty; idty = ids[i]; i++) {
          var cIds = identity._byIdty[idty.rd_key[1].join(",")];
          if (cIds) {
            temp.push.apply(temp, cIds);
          }
        }
        ids = temp;
      }

      //Filter out stuff already in the cache vs. new things to fetch.
      var missing = [], found = [], keys = [];
      for (var i = 0, id; id = ids[i]; i++) {
        var temp = this._store[id];
        if (temp && temp.identities) {
          found.push(temp);
        } else {
          missing.push(id);
          keys.push(["rd.core.content", "key-schema_id", [["contact", id], "rd.contact"]]);
        }
      }
  
      if (!missing.length) {
        dfd.callback(found);
      } else {
        //First fetch the rd.contact record for each contact.
        rd.api().megaview({
          keys: keys,
          reduce: false,
          include_docs: true
        })
        .ok(this, function(json) {
          //Store all the contacts in the store.
          for (var i = 0, row, doc; (row = json.rows[i]) && (doc = row.doc); i++) {
            this._store.push(doc);
            // for contacts, rd_key is a tuple of ['contact', contact_id]
            this._store[doc.rd_key[1]] = doc;
          }

          //Gather the identities we need to fetch, based
          //on the contact-to-identity mapping.
          var identityIds = [];
          for(var i = 0, id; id = missing[i]; i++) {
            var idtyIds = rd.api.identity._byContact[id];
            if (idtyIds && idtyIds.length) {
              identityIds.push.apply(identityIds, idtyIds);
            }
          }

          if(!identityIds.length) {
            dfd.callback(found);
          } else {
            //Get identities.
            rd.api().identity({
              ids: identityIds
            })
            .ok(this, function(foundIdtys) {
              //Attach the identities to the right contact.
              for (var i = 0, idty; idty = foundIdtys[i]; i++) {
                this._attachIdentity(idty);
              }
    
              //Now collect the contacts originally requested and do the callback.
              var ret = [];
              for (var i = 0, cId; cId = missing[i]; i++) {
                ret.push(this._store[cId]);
              }
    
              //Concat the results with the already found contacts.
              dfd.callback(found.concat(ret));
            })
            .error(dfd);
          }
        });
      }
    });
  },

  _attachIdentity: function(/*Object*/idty) {
    //summary: given an identity, attach it to the cache of the contact in the data store.
    //Use the first part of the identity as a property on the contact. This means for
    //instance, only one twitter account will be on the contact at
    //contact.twitter, but all identities are listed in contact.identities.
    console.assert(idty.rd_key[0]=='identity', idty) // not an identity?
    var idid = idty.rd_key[1];
    var cIds = rd.api.identity._byIdty[idid.join(",")];
    if (cIds && cIds.length) {
      for (var j = 0, cId; cId = cIds[j]; j++) {
        var contact = this._store[cId];
        if (!contact) {
          continue;
        }
        var idType = idid[0];

        //Only keep one property on the object
        //with the idType, so that means first one
        //in the list wins for that type of identity.
        if (!contact[idType]) {
          contact[idType] = idty;
        }

        if (!contact.identities) {
          contact.identities = [];
        }

        //Make sure we do not add the same contact more than once.
        //Would be nice to avoid the array scan here in the future.
        if(dojo.indexOf(contact.identities, idty) == -1) {
          contact.identities.push(idty);

          //If the contact does not have an image, use one
          //on the identity if possible. First one with a picture wins.
          if(idty.image && !contact.image) {
            contact.image = idty.image;
          }
        }
      }
    }
  }
}

rd.api.extend({
  /**
   * @lends rd.api
   * Loads a set of contacts. It will use the previous call's results,
   * or, optionally pass an args.ids which is an array of contact IDs.
   */
  contact: function(args) {
    if (args && args.ids) {
      rd.api.contact._fetch(this._deferred, args, args.ids);
    } else {
      this.addParentCallback(dojo.hitch(rd.api.contact, "_fetch", this._deferred, args));
    }
    return this;
  }
});
