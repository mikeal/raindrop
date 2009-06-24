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
    while ((cb = this._onloads.shift())) {
      cb();
      //If the callback forced this back to an unloaded
      //state, then do not continue.
      if (!this._loaded) {
        break;
      }
    }
  },

  _protectFunc: function(/*String||Function*/func, /*Number*/errbackPosition) {
    //summary: replaces the func on this instance with a protector
    //function that checks if the data is loaded. Or, if func is a function,
    //assume it is a the function for the main object, the object that
    //holds the other rd._api methods.
    var isFunc = dojo.isFunction(func);

    var oldFunc = isFunc ? func : this[func];
    
    var newFunc = function() {  
      //Save off the callback if we have not loaded our contacts yet.
      var context = isFunc ? newFunc : this;

      if (!context._loaded) {
        context._onloads || (context._onloads = []);
        var args = arguments;
        context._onloads.push(dojo.hitch(context, function(){
          newFunc.apply(context, args);
        }));
        if (!context._fetching) {
          context._fetching = true;
          context._load.apply(context, arguments);
        }
        return;
      }

      //Do not bother with the rest if we had an error loading the identities.
      if (context._error) {
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
        errback && errback(context._error);
        return;
      }

      oldFunc.apply(context, arguments);
    };

    if(isFunc) {
      return newFunc;
    } else {
      return this[func] = newFunc;
    }
  },

  _protectPublic: function() {
    //summary: calls _protectFunc for any public method on the object,
    //where public is defined as a named function that does not
    //start with an underscore.
    var empty = {};
    
    //If this is a function and just an object, protect it.
    if (dojo.isFunction(this)) {
      
    }
    
    for(var prop in this) {
      //Make sure other code did not add to object prototype.
      if (!(prop in empty) && typeof prop == "string" && prop.charAt(0) != "_") {
        this._protectFunc(prop);
      }
    }
  }
};
