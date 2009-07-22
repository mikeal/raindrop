dojo.provide("rd.identity");

dojo.require("dojo.io.script");
dojo.require("couch");
dojo.require("rd._api");
dojo.require("rd.store");

//TODO: have try/catches on callbacks commented out so errors show up early and
//have stack traces. However, for release code, want to make sure one callback
//failure does not stop the system from running. Maybe consider a custom event
//solution a la http://dean.edwards.name/weblog/2009/03/callbacks-vs-events/
//to allow the callbacks to error out but allow our code to still keep working.

rd.identity = dojo.delegate(rd._api);

dojo.mixin(rd.identity, {
  list: function(/*Function*/callback, /*Function?*/errback) {
    //summary: returns a list of all identities to the callback. To get info
    //on an identity inside the callback(identities) function, use
    //identities[identityId[0]][identity[1]]
    callback(this);
  },

  listByType: function(/*String*/type, /*Function*/callback, /*Function?*/errback) {
    //summary: returns a list of identities for a given type. The type field is
    //the first array value in the identity ID that is part of the rd_key.
    //So valid values might be like "email", "twitter" or "skype".
    //The value passed to the callback will be an object, with the properties
    //being ids of the identities, and the values for the properties will
    //be the identity document.
    this.list(dojo.hitch(this, function(idtys) {
      callback(idtys[type]);
    }), errback);
  },

  get: function(/*Array*/identityId, /*Function*/callback, /*Function?*/errback) {
    //summary: fetches an identity based on an identity ID. It accepts either one
    //identityId or an array of identityIds to fetch.
    //Tries to use couch info, but for certain services
    //falls back to using the service API associated with the identity.

    //Figure out if we have all the identities we need.
    var ids = this._get(identityId);
    var isSingle = (typeof identityId[0] == "string");

    if (!ids.missing) {
      callback(isSingle ? ids.found[0] : ids.found);
    } else {
      //Handle requests for identities that we do not have.
      if (ids.missing.length == 1 && this["_" + ids.missing[0][0] + "Fetch"]) {
        //If just one missing and there is a Fetch method on this object
        //that matches the identity type/provider, try that one. Example,
        //is a Fetch method that knows about twitter.
       this["_" + ids.missing[0][0] + "Fetch"](
          ids.missing[0],
          dojo.hitch(this, function(){
            //Retry the get call with the missing data and merge with previously found.
            this.get(ids.missing, function(found) {
              if (ids.found) {
                found = ids.found.concat(found);
              }
              callback(isSingle ? found[0] : found);
            }, errback);
          }),
          errback
        );
      } else {
        //TODO: may want to rethink this later.
        //Create a dummy identities. This area normally hit
        //by the test_identity which seems malformed, but
        //we might want to account for phantom identities?
        for (var i = 0, idty; idty = ids.missing[i]; i++) {
          dojo.getObject(idty[0], true, this)[idty[1]] = {
            // it't not clear if we should use a 'real' identity ID here?
            // theoretically all the fields being empty should be enough...
            rd_key: ['identity', idty],
            rd_schema: 'rd.identity',
            //Mark this as a fake record
            _isFake: true
          };
        }
      }
        
      //Retry the get call with the missing data and merge with previously found.
      this.get(ids.missing, function(found) {
        if (ids.found) {
          found = ids.found.concat(found);
        }
        callback(isSingle ? found[0] : found);
      }, errback);
    }
  },

  byImage: function(/*Function*/callback, /*Function?*/errback) {
    //summary: Fetches identities that have images associated with them.
    //Only retrieves the identityIds, not a full identity doc. Use get()
    //to get the docs.
    if (this._byImage) {
      callback(this._byImage);
    } else {
      couch.db("raindrop").view("raindrop!content!all/_view/megaview", {
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
          couch.db("raindrop").view("raindrop!content!all/_view/megaview", {
            keys: keys,
            group: true,
            success: dojo.hitch(this, function(json) {
              this._byImage = [];
              for (var i = 0, row; row = json.rows[i]; i++) {
                this._byImage.push(row.key[2]);
              }
              callback(this._byImage);
            })
          });
        },
        error: errback
      });
    }
  },

  createEmail: function(/*Object*/messageBag, /*Function*/callback, /*Function?*/errback) {
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
    rd.store.put(idty, dojo.hitch(this, function() {
      //Update this data store.
      this._storeIdty(idty);

      callback(idty);
    }), errback);
  },

  _get: function(/*Array*/identityId) {
    //summary: private method that figures out what identities are already
    //loaded and which ones are missing. identityId can be one ID or an array
    //of IDs.
    var missing = [], found = [];
    if (typeof identityId[0] == "string") {
      identityId = [identityId];
    }
    for (var i = 0, id; id = identityId[i]; i++) {
      var temp = this._idty(id);
      temp ? found.push(temp) : missing.push(id);
    }
 
    return {
      found: found.length ? found : null,
      missing: missing.length ? missing: null      
    }
  },

  _load: function() {
    //summary: pulls in all the identities, since we need them anyway to do
    //things like mark a message a from a known user. This may change if we
    //modify the backend to do more work.
    couch.db("raindrop").view("raindrop!content!all/_view/megaview", {
      key: ["rd.core.content", "schema_id", "rd.identity"],
      reduce: false,
      include_docs: true,
      success: dojo.hitch(this, function(json) {
        //Save off identity docs in our store for all the identities.
        for (var i = 0, row; row = json.rows[i]; i++) {
          this._storeIdty(row.doc);
        }
        this._onload();
      }),
      error: dojo.hitch(this, function(err) {
        this._error = err;
        this._onload();
      })
    });
  },

  _idty: function(/*Array*/identityId) {
    //summary: private helper function for getting an identity from a service store.
    return dojo.getObject(identityId[0], true, this)[identityId[1]];    
  },

  _storeIdty: function(/*Object*/idty) {
    //summary: stores an idtentiy in the data store.
    var identity_id = idty.rd_key[1];
  
    //Add the identity to the store for that service.
    var svc = dojo.getObject(identity_id[0], true, this);
    var uId = identity_id[1];
    if (!svc[uId] || svc[uId]._isFake) {
      svc[uId] = idty;
    }

    //Add to byImage store
    if (!this._byImage) {
      this._byImage = [];
    }

    if (idty.image) {
      this._byImage.push(idty.rd_key);
      // Fix up the image URL; a leading '/' means it is a URL in our
      // couch DB.
      if (idty.image[0]=="/") {
        // all this hard-coding of the DB name can't be good...
        idty.image = "/raindrop" + idty.image;
      }
    }
  },

  _twitterFetch: function(/*Array*/identityId, /*Function*/callback, /*Function?*/errback) {
    //summary: fetches identity information from twitter API. Should not be
    //used directly by code outside of this module -- prefer the standard get()
    //interface on this module.
    dojo.io.script.get({
      url: "http://twitter.com/users/show/" + identityId[1] + ".json",
      callbackParamName: "callback",
      handle: dojo.hitch(this, function(data) {
        //TODO: need to handle errors, and throttle error requests
        //so error does not cascade more error calls.
        if(data instanceof Error) {
          if (errback) {
            errback(data, identityId);
          }
        } else {
          //Normalize twitter data to our data type.
          var doc = {
            identity_id: [
              "twitter",
              data.screen_name
            ],
            name: data.name,
            nickname: data.screen_name,
            url: data.url,
            image: data.profile_image_url
          }

          //Save in our store and do callback.
          var idty = dojo.getObject(identityId[0], true, this)[identityId[1]] = doc;

          //TODO: save this info back to the couch?
          callback([idty]);
        }
      })
    });
  }
});

rd.identity._protectPublic();

