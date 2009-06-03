dojo.provide("rd._api");

//A "base class" for some data APIs. Most of these APIs dynamically
//load their data on the fly, so need to have generic callback.

rd._api = {
  _loaded: false,
  
  //Subclasses can set this to an error object to stop future calls
  //from triggering the _load() function on the subclass.
  _error: null,

  _onload: function() {
    //summary: handles unblocking calls to this API, call waiting functions.
    this._loaded = true;
    this._fetching = false;
    var cb;
    while (cb = this._onloads.shift()) {
      cb();
      //If the callback forced this back to an unloaded
      //state, then do not continue.
      if (!this._loaded) {
        break;
      }
    }
  },

  _protectFunc: function(/*String*/funcName, /*Number*/errbackPosition) {
    //summary: replaces the funcName on this instance with a protector
    //function that checks if the data is loaded.
    var oldFunc = this[funcName];

    this[funcName] = function() {  
      //Save off the callback if we have not loaded our contacts yet.

      if (!this._loaded) {
        this._onloads || (this._onloads = []);
        var args = arguments;
        this._onloads.push(dojo.hitch(this, function(){
          this[funcName].apply(this, args);
        }));
        if (!this._fetching) {
          this._fetching = true;
          this._load.apply(this, arguments);
        }
        return;
      }

      //Do not bother with the rest if we had an error loading the identities.
      if (this._error) {
        //A bit of a hack to determine if we have an errback handler.
        //If last two arguments are functions, then the second one is
        //the errback. Also allow direct specification of the argument
        //via errbackPosition.
        if (errbackPosition) {
          var errback = arguments[errbackPosition];
        } else if (arguments.length > 1 &&
          dojo.isFunction(arguments[arguments.length - 1])
          && dojo.isFunction(arguments[arguments.length - 2])) {
          errback = arguments[arguments.length - 1];
        }
        errback && errback(this._error);
        return;
      }

      oldFunc.apply(this, arguments);
    }
  },

  _protectPublic: function() {
    //summary: calls _protectFunc for any public method on the object,
    //where public is defined as a named function that does not
    //start with an underscore.
    var empty = {};
    for(var prop in this) {
      //Make sure other code did not add to object prototype.
      if (!(prop in empty) && typeof prop == "string" && prop.charAt(0) != "_") {
        this._protectFunc(prop);
      }
    }
  }
};
