//Never dojo.require this file directly, only dojo.require rd.api.
dojo.provide("rd.api.identity");

dojo.require("rd.api");

rd.api.identity = {
  /**
   * maps each identity ID to a contact ID, a sort of cache for
   * rd.identity.contacts documents.
   */
  _contactMap: {},

  /**
   * @private
   * filters the found from the missing identities so only the
   * missing ones are fetched via the network.
   *
   * @param {Array} ids an array of identity IDs, where each
   * identity ID is itself an array of [identityType, identityName].
   *
   * @returns {Object} has two properties, "found" and "missing"
   * that are arrays of identity IDs.
   */
  _filter: function(ids) {
    var missing = [], found = [];
    for (var i = 0, id; id = ids[i]; i++) {
      var temp = this._idty(id);
      temp ? found.push(temp) : missing.push(id);
    }
 
    return {
      found: found.length ? found : null,
      missing: missing.length ? missing: null      
    }
  },

  _filterByContactMap: function(ids) {
    
  },

  /**
   * @private
   * fetches an identity based on an identity ID, but only if attached
   * to a contact. Tries to use couch info, but for certain services
   * falls back to using the service API associated with the identity.
   *
   * @param {dojo.Deferred} dfd The deferred that should be called
   * with the results.
   *
   * @param {Object} args arguments to pass to the couch calls.
   * 
   * @param {Array} ids an array of identity IDs, where each
   * identity ID is itself an array of [identityType, identityName].
   */
  _contactIdentity: function(dfd, args, ids) {
    //Figure out if we have all the identities we need. If it has not been
    //looked up yet, generate a key for the megaview to fetch it.
    var found = [],
        keys = [],
        map = {};
    for (var i = 0, id; id = ids[i]; i++) {
      var contactId = this._contactMap[id.join(",")];
      var idty = this._idty(id);
      //If contactId is null, it means we previously tried to look up this
      //identity but it was not attached to a contact.
      if ((contactId === null || contactId) && idty) {
        found.push(idty);
      } else {
        keys.push(["rd.core.content", "key-schema_id", [["identity", id], "rd.identity.contacts"]]);
        map[id.join(",")] = 0;
      }
    }

    if (!keys.length) {
      dfd.callback(found);
    } else {
      rd.api().megaview({
        keys: keys,
        reduce: false,
        include_docs: true
      })
      .ok(this, function(json) {
        var idtyIds = [];

        //Loop through identity->contact mapping docs and store results for
        //later.
        for (var i = 0, row, doc; (row = json.rows[i]) && (doc = row.doc); i++) {
          //Mark in the map it was found.
          var idtyId = doc.rd_key[1];
          var idStr = idtyId.join(",");
          map[idStr] = 1;

          //Store the cache of contacts.
          this._contactMap[idStr] = doc.contacts;
          
          //Hold on to the identities that should be fetched.
          idtyIds.push(idtyId);
        }

        //For the identities that were not found associated with a contact, store
        //that info so they are not looked up again.
        var empty = {};
        for (var prop in map) {
          if (!(prop in empty) && prop in map && !map[prop]) {
            this._contactMap[prop] = null;
          }
        }

        //Fetch the identity docs for the found ones, if there are any.
        if (!idtyIds.length) {
          dfd.callback(found);
        } else {
          rd.api().identity({
            ids: idtyIds
          })
          .ok(this, function(identities) {
            dfd.callback(found.concat(identities));
          })
          .error(dfd);
        }
      })
      .error(dfd);
    }
  },

  /**
   * @private
   * fetches an identity based on an identity ID.
   * Tries to use couch info, but for certain services
   * falls back to using the service API associated with the identity.
   *
   * @param {dojo.Deferred} dfd The deferred that should be called
   * with the results.
   *
   * @param {Object} args arguments to pass to the couch calls.
   * 
   * @param {Array} ids an array of identity IDs, where each
   * identity ID is itself an array of [identityType, identityName].
   */
  _identity: function(dfd, args, ids) {
    //Figure out if we have all the identities we need.
    ids = this._filter(ids);

    if (!ids.missing) {
      dfd.callback(ids.found);
    } else {
      var found = ids.found || [];

      //Build a list of keys to use for megaview call.
      //Keep a map of the ids for easy determination of ids that
      //are not found.
      var keys = [],
          map = {};
      for (var i = 0, id; id = ids.missing[i]; i++) {
        keys.push(["rd.core.content", "key-schema_id", [["identity", id], "rd.identity"]]);
        map[id.join(",")] = 0;
      }

      rd.api().megaview({
        keys: keys,
        reduce: false,
        include_docs: true
      })
      .ok(this, function(json) {
        for (var i = 0, row, doc; (row = json.rows[i]) && (doc = row.doc); i++) {
          //Mark in the map it was found.
          map[doc.rd_key[1].join(",")] = 1;

          //Store for future calls.
          this._storeIdty(doc);

          //Add to result set.
          found.push(doc);
        }

        //For IDs that were missed, create fake identities for them
        //to avoid looking them up later.
        var empty = {};
        var unknowns = [];
        for (var prop in map) {
          if (!(prop in empty) && !map[prop]) {
            var id = prop.split(",");
            found.push(dojo.getObject(id[0], true, this)[id[1]] = {
              // it't not clear if we should use a 'real' identity ID here?
              // theoretically all the fields being empty should be enough...
              rd_key: ['identity', id],
              rd_schema: 'rd.identity',
              //Mark this as a fake record
              _isFake: true
            });
          }
        }

        //All done
        dfd.callback(found);
      })
      .error(dfd);
    }
  },

  /**
   * @private
   * creates an identity document for the given a mail message bag.
   *
   * @param {dojo.Deferred} dfd The deferred that should be called
   * with the results.
   *
   * @param {Object} args arguments to pass to the couch calls.
   * 
   * @param {Object} imessageBag the collection of message docs that make up
   * a message.
   */
  _createEmailIdentity: function(dfd, args, messageBag) {
    //summary: creates an identity document for the given a mail message bag.
    //The callback will receive the identity document as the only argument.
    var body = messageBag["rd.msg.body"];
    var from = body.from[1];

    //Generate the new document.
    var idty = {
      name: body.from_display,
      nickname: from,
      rd_key: [
        "identity",
        ["email", from]
      ],
      rd_schema_id: "rd.identity",
      rd_source: [messageBag["rd.msg.email"]._id]
    };

    //Insert the document.
    rd.api().put({
      doc:idty
    })
    .ok(this, function(idty) {
      //Update this data store.
      this._storeIdty(idty);
      dfd.callback(idty);
    })
    .error(dfd);
  },

  /**
   * @private
   * helper function for getting an identity from a service store.
   *
   * @param id {Array} and identity ID
   *
   * @returns {Object}
   */
  _idty: function(id) {
    return dojo.getObject(id[0], true, this)[id[1]];    
  },

  /**
   * @private
   * stores the identity on this object to avoid hitting the
   * database repeatedly for the same info.
   * @param {Object} idty the rd.identity schema doc for an identity.
   */
  _storeIdty: function(idty) {
    var identity_id = idty.rd_key[1];
  
    //Add the identity to the store for that service.
    var svc = dojo.getObject(identity_id[0], true, this);
    var uId = identity_id[1];
    if (!svc[uId] || svc[uId]._isFake) {
      svc[uId] = idty;
    }

    if (idty.image) {
      // Fix up the image URL; a leading '/' means it is a URL in our
      // couch DB.
      if (idty.image[0]=="/") {
        idty.image = rd.dbPath + idty.image.substring(1, idty.image.length);
      }
    }
  }
}

rd.api.extend({
  /**
   * @lends rd.api
   * Loads a set of identities. It will use the previous call's results,
   * or, optionally pass an args.ids which can be an array of identity IDs,
   * where each identity ID is itself an array of [identityType, identityName].
   */
  identity: function(args) {
    if (args && args.ids) {
      rd.api.identity._identity(this._deferred, args, args.ids);
    } else {
      this.addParentCallback(dojo.hitch(rd.api.identity, "_identity", this._deferred, args));
    }
    return this;
  },

  /**
   * @lends rd.api
   * Loads a set of identities but only if they are attached to a contact
   * It will use the previous call's results,
   * or, optionally pass an args.ids which can be an array of identity IDs,
   * where each identity ID is itself an array of [identityType, identityName].
   */
  contactIdentity: function(args) {
    if (args && args.ids) {
      rd.api.identity._contactIdentity(this._deferred, args, args.ids);
    } else {
      this.addParentCallback(dojo.hitch(rd.api.identity, "_contactIdentity", this._deferred, args));
    }
    return this;
  },

  /**
   * @lends rd.api
   * creates an identity document for the given a mail message bag.
   * Returns an rd.identity doc to the ok callbacks.
   *
   * @param {Object} args options for the couchdb calls
   * @param {Object} args.messageBag the collection of
   */
  createEmailIdentity: function(args) {
    if (args && args.messageBag) {
      rd.api.identity._createEmailIdentity(this._deferred, args, args.messageBag);
    } else {
      this._deferred.errback(new Error("rd.api().identity.createEmailIdentity "
                                       + "requires an args.messageBag argument."));
    }
    return this;
  }
});
