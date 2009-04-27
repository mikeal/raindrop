dojo.provide("rd.twitter");

dojo.require("dojo.io.script");

rd.twitter = {
  _users: {},

  user: function(/*String*/userId, /*Function*/callback, /*Function?*/errback) {
    //summary: fetches twitter user info based on twitter user ID.
    //Uses a cache to avoid multiple twitter API requests. Calls
    //callback once user info is availble.
    var user = this._users[userId];
    if (!user) {
      dojo.io.script.get({
        url: "http://twitter.com/users/show/" + userId + ".json",
        callbackParamName: "callback",
        handle: dojo.hitch(this, function(response) {
            //TODO: need to handle errors, and throttle error requests
            //so error user does not make a bunch of error calls.
            if(response instanceof Error) {
              if (errback) {
                errback(response, userId);
              }
            } else {
              user = this._users[userId] = response;
              callback(user);
            }
        })
      });
    } else {
      callback(user);
    }
  }
};
