dojo.provide("rd.identity");

dojo.require("dojo.io.script");
dojo.require("couch");

rd.identity = {
  _loaded: false,
  _onloads: [],
  error: null,

  all: function(/*String|Array*/services, /*Function*/callback, /*Function?*/errback) {
    //summary: returns all the identities for a given set of services.
    //If more than one service is requested, the results will be merged,
    //into an object indexed by user IDs. So, if there is the same user ID
    //across services, only one will be returned, with twitter favored over
    //other services.

    //Save off the callback if we have not loaded our contacts yet.
    if(!this._loaded){
      this._onloads.push(dojo.hitch(this, "all", services, callback, errback));
      return;
    }

    //Do not bother with the rest if we had an error loading the identities.
    if (this.error) {
      return errback && errback(this.error, services);
    }

    if(!(services instanceof Array)) {
      services = [services];
    }

    var userStores = rd.map(services, function(service){
      return dojo.getObject(service, true, this);
    }, this);

    var empty = {};
    var ret = userStores[0];
    if(userStores.length > 1) {
      //Combine all the store objects into one object.
      ret = rd.reduce(userStores, function(result, obj){
        for (var prop in obj) {
          //Avoid props from other code that modifies prototypes.
          if(!(prop in empty)) {
            if (!(prop in result) || obj[prop].identity_id[0] == "twitter") {
              result[prop] = obj[prop];
            }
          }
        }
      }, {});
    }

    callback(ret);
  },

  get: function(/*String*/service, /*String*/userId, /*Function*/callback, /*Function?*/errback) {
    //summary: fetches an ID based on the service. Tries to use couch info, but for certain services
    //falls back to using the service API.
    //TODO: maybe ask the couch store for ID doc before going to service API, since
    //we only ask for N number of identities on startup.

    //Save off the callback if we have not loaded our contacts yet.
    if(!this._loaded){
      this._onloads.push(dojo.hitch(this, "get", service, userId, callback, errback));
      return;
    }
    
    //Do not bother with the rest if we had an error loading the identities.
    if (this.error) {
      return errback && errback(this.error, userId);
    }

    var service = dojo.getObject(service, true, this);
    var user = service[userId];
    if (user) {
      callback(user);
    } else if (service == "twitter") {
      dojo.io.script.get({
        url: "http://twitter.com/users/show/" + userId + ".json",
        callbackParamName: "callback",
        handle: dojo.hitch(this, function(data) {
            //TODO: need to handle errors, and throttle error requests
            //so error user does not make a bunch of error calls.
            if(data instanceof Error) {
              if (errback) {
                errback(data, userId);
              }
            } else {
              //Normalize twitter data to our IDs.
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
              user = service[userId] = doc;
              callback(user);
            }
        })
      });      
    }
  }
};

dojo.addOnLoad(function(){
    //TODO: may want to make this use a view that just gets all the identies,
    //not just the ones with pictures.
    var id = rd.identity;

    couch.db("raindrop").view("raindrop!identities!all/_view/all", {
      limit: 100,
      include_docs: true,
      success: function(json) {
        this.docs = rd.forEach(json.rows, function(row) {
          var doc = row.doc;
          
          //Add the document to the store for that service.
          var service = dojo.getObject(doc.identity_id[0], true, id);
          service[doc.identity_id[1]] = doc;
        });

        id._loaded = true;
        dojo.forEach(id._onloads, function(callback){
          callback();
        });
      },
      error: function(err) {
        this.error = err;
        dojo.forEach(id._onloads, function(callback){
          callback();
        });
      }
    });
});
