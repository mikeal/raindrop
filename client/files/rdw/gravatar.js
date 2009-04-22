dojo.provide("rdw.gravatar");

dojo.require("dojox.encoding.digests.MD5");

;(function(){
  var digests = dojox.encoding.digests;
  
  rdw.gravatar = {
    _store: {},

    get: function(/*String*/email) {
      //summary: gets the gravatar URL given an email address.
      var digest = this._store[email];
      if (!digest) {
        digest = this._store[email] = digests.MD5(email, digests.outputTypes.Hex);
      }
      return "http://www.gravatar.com/avatar/" + digest;
    }
  };

})();
