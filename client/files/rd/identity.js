dojo.provide("rd.identity");

dojo.require("dojo.io.script");
dojo.require("couch");
dojo.require("rd._api");

//TODO: have try/catches on callbacks commented out so errors show up early and
//have stack traces. However, for release code, want to make sure one callback
//failure does not stop the system from running. Maybe consider a custom event
//solution a la http://dean.edwards.name/weblog/2009/03/callbacks-vs-events/
//to allow the callbacks to error out but allow our code to still keep working.

rd.identity = dojo.delegate(rd._api);

dojo.mixin(rd.identity, {
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
      this._loaded = false;
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
            }),
          });
        },
        error: errback
      });
    }
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

  _load: function(/*Array*/identityIds, /*Function*/callback, /*Function?*/errback) {
    //summary: pulls a few identity records from the couch, starting
    //with the requested one, to hopefully limit how many times we hit
    //the couch.
    if (typeof identityIds[0] == "string")
      identityIds = [identityIds];
    var keys = [];
    for (var i = 0, id; id = identityIds[i]; i++) {
      keys.push(['rd.core.content', 'key-schema_id', [['identity', id], 'rd.identity']]);
    }
    couch.db("raindrop").view("raindrop!content!all/_view/megaview", {
      keys: keys,
      include_docs: true,
      reduce: false,
      success: dojo.hitch(this, function(json) {
        //Save off identity docs in our store for all the identities.
        for (var i = 0, row; row = json.rows[i]; i++) {
          var doc = row.doc;
          var identity_id = doc.rd_key[1];

          //Add the document to the store for that service.
          var svc = dojo.getObject(identity_id[0], true, this);
          var uId = identity_id[1];
          if (!svc[uId]) {
            svc[uId] = doc;
          }
        }

        //See if we have the requested identities.
        var idtys = this._get(identityIds);
        if (idtys.missing) {
          if (idtys.missing.length == 1 && this["_" + idtys.missing[0][0] + "Fetch"]) {
            this["_" + idtys.missing[0][0] + "Fetch"](idtys.missing[0], callback, errback);
            return;
          } else {
            //TODO: may want to rethink this later.
            //Create a dummy identities. This area normally hit
            //by the test_identity which seems malformed, but
            //we might want to account for phantom identities?
            for (var i = 0, idty; idty = idtys.missing[i]; i++) {
              idtys.missing[i] = dojo.getObject(idty[0], true, this)[idty[1]] = {
                // it't not clear if we should use a 'real' identity ID here?
                // theoretically all the fields being empty should be enough...
                rd_key: ['identity', idty],
                rd_schema: 'rd.identity',
              }
            }
          }
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
                data.twitter_screen_name
              ],
              name: data.twitter_name,
              nickname: data.twitter_screen_name,
              url: data.twitter_url,
              image: data.twitter_profile_image_url
            }

            //Save in our store and do callback.
            var idty = dojo.getObject(identityId[0], true, this)[identityId[1]] = doc;

            //TODO: save this info back to the couch?
            callback([idty]);
          }
          this._onload();
      })
    });
  }
});

rd.identity._protectPublic();

