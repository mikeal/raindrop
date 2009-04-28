dojo.provide("rd.identity");

dojo.require("dojo.io.script");
dojo.require("couch");

rd.identity = {
  _loaded: false,
  _onloads: [],

  get: function(/*String*/service, /*String*/userId, /*Function*/callback, /*Function?*/errback){
    //summary: fetches an ID based on the service. Tries to use couch info, but for certain services
    //falls back to using the service API.
    //TODO: maybe ask the couch store for ID doc before going to service API, since
    //we only ask for N number of identities on startup.
    
    //Save off the callback if we have not loaded our contacts yet.
    if(!this._loaded){
      this._onloads.push(dojo.hitch(this, "get", service, userId, callback, errback));
      return;
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

    couch.db("raindrop").view("raindrop!identities!by/_view/by_image", {
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
      }
    });
});
