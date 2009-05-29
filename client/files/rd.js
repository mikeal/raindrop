//Main module definition
dojo.provide("rd");

dojo.require("couch");

/*
This file provides some basic environment services running in raindrop.
*/

//Override a function in dojo so that we can cancel publish calls by returning false
//from a listener.
dojo._listener.getDispatcher = function(){
  // following comments pulled out-of-line to prevent cloning them 
  // in the returned function.
  // - indices (i) that are really in the array of listeners (ls) will 
  //   not be in Array.prototype. This is the 'sparse array' trick
  //   that keeps us safe from libs that take liberties with built-in 
  //   objects
  // - listener is invoked with current scope (this)
  return function(){
    var ap=Array.prototype, c=arguments.callee, ls=c._listeners, t=c.target;
    // return value comes from original target function
    var r = t && t.apply(this, arguments);
    // make local copy of listener array so it is immutable during processing
    var lls = [].concat(ls);

    // invoke listeners after target function
    for(var i in lls){
      if(!(i in ap)){
        //RAINDROP change to handle return type.
        if (lls[i].apply(this, arguments) === false){
          break;
        }
      }
    }
    // return value comes from original target function
    return r;
  }
};

(function(){
  dojo.mixin(rd, {
    ready: dojo.addOnLoad,
  
    reduce: function(/*Array*/ a, /*Function*/ f, /*Object*/ z, /*Object?*/ o){
  			// summary: repeatedly applies a binary function to an array from left
  			//	to right using a seed value as a starting point; returns the final
  			//	value. (Taken from dojox.lang.functional.fold.foldl)
  			o = o || dojo.global;
  			var i, n;
  			for(i = 0, n = a.length; i < n; z = f.call(o, z, a[i], i, a), ++i);
  			return z;	// Object
  		},
  
    html: function(/*String*/html, /*DOMNode?*/refNode, /*String?*/position) {
      //summary: converts html string to a DOM node or DocumentFragment. Optionally
      //places that node/fragment relative refNode. "position" values are same as
      //dojo.place: "first" and "last" indicate positions as children of refNode,
      //"replace" replaces refNode, "only" replaces all children.  "before" and "last"
      //indicate sibling positions to refNode. position defaults to "last" if not specified.
      html = dojo._toDom(html);
      if (refNode) {
        return dojo.place(html, refNode, position);
      } else {
        return html;
      }
    },
  
    escapeHtml: function(/*String*/html, /*DOMNode?*/refNode, /*String?*/position) {
      //summary: escapes HTML string so it is safe to embed in the DOM. Optionally
      //places that HTML relative refNode. "position" values are same as
      //dojo.place: "first" and "last" indicate positions as children of refNode,
      //"replace" replaces refNode, "only" replaces all children.  "before" and "last"
      //indicate sibling positions to refNode. position defaults to "last" if not specified.
      html = html && html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      if (refNode) {
        return rd.html(html, refNode, position);
      } else {
        return html;
      }
    },
  
    //Shortcut methods for dojo.publish and subscribe. rd.pub more aesthetically pleasing
    //than dojo.publish because it does not force the parameters to be in an array,
    //but rather as variable number of arguments to rd.pub.
    //Base on plugd versions of the code: http://code.google.com/p/plugd/source/browse/trunk/base.js
    sub: dojo.subscribe,
    unsub: dojo.unsubscribe,
    pub: function(){
      var a = dojo._toArray(arguments);
      return dojo.publish(a.shift(), a);
    },
    
    convertLines: function(text) {
      //Converts line returns to BR tags
      return text && text.replace(/\n/g, "<br>");  
    },
  
    addStyle: function(/*String*/modulePath) {
      //summary: loads a CSS file based on a modulePath. This allows for reskinning
      //by overriding the modulePath via djConfig.modulePaths/dojo.registerModulePath()
      var url = dojo.moduleUrl(modulePath).toString();
      //Adjust URL a bit so we get dojo.require-like behavior
      url = url.substring(0, url.length - 1) + ".css";
      var link = dojo.create("link", {
        type: "text/css",
        rel: "stylesheet",
        "data-rdstylename": modulePath,
        href: url
      });
      dojo.doc.getElementsByTagName("head")[0].appendChild(link);
    },

    removeStyle: function(/*String*/modulePath) {
      //summary: removes the link tag that was associated with the modulePath.
      dojo.query('[data-rdstylename="' + modulePath + '"]').orphan();
    },

    onExtPublish: function() {
      //summary: handles rd.pub calls to extensions for the first time.
      //This function will unregister itself after loading the extension
      //so that this code is only involved with initial loading of an extension.
      var topic = arguments[0];
      
      //Convert arguments to an array and pull off
      //the topic name since real endpoint subscribers in the
      //extensions will not be expecting it.
      var args = dojo._toArray(arguments);
      args.shift();
  
      //Unsubscribe so this function is not called again
      //for this topic
      dojo.unsub(extSubHandles[topic]);
  
      //Run the code to load the extension in a timeout so we can
      //return false from this listener to stop propagating the topic
      //publishing to other listeners. This will help ensure that the loaded
      //code does not get a topic publish twice.
      setTimeout(function(){
        //Load the code
        var modules = extSubs[topic];
        dojo.forEach(modules, dojo.require, dojo);
        dojo.addOnLoad(function() {
          dojo.publish(topic, args);
        });
      }, 20);
  
      //Stop the topic from continuing to notify other listeners
      return false;
    },
  
    onDocClick: function(evt) {
      //summary: Handles doc clicks to see if we need to
      //use rd.pub to send out a protocol- topic.
      var node = evt.target;
      var href = node.href;
      
      if (!href && node.nodeName.toLowerCase() == "img") {
        //Small cheat to handle images that are hyperlinked.
        //May need to revisit this for the long term.
        href = node.parentNode.href;
      }
  
      if (href) {
        href = href.split("#")[1];
        if (href && href.indexOf("rd:") == 0) {
          //Have a valid rd: protocol link.
          href = href.split(":");
          var proto = href[1];
  
          //Strip off rd: and protocol: for the final
          //value to pass to protocol handler.
          href.splice(0, 2);
          var value = href.join(":");
          
          dojo.stopEvent(evt);
  
          rd.pub("rd-protocol-" + proto, value);
        }
      }
    },

    //Types of extension wrapping. Similar to aspected oriented advice.
    _extTypes: ["before", "after", "around", "replace", "add", "addToPrototype"],

    applyExtension: function(/*String|Object*/moduleName, /*Object*/extension) {
      //summary: modifies the module object by attaching an extension to it.
      //ASSUMES the module has already been loaded. Each extension should
      //dojo.require the module it will be extending.
      var module = moduleName;
      if(typeof moduleName == "string") {
        module = dojo.getObject(moduleName);
      }
  
      //For each type of extension wrapping,
      //call the appropriate function to handle them.
      for (var i = 0, type; type = this._extTypes[i]; i++) {
        if(extension[type]) {
          this._extApplyType(moduleName, module, extension[type], type);
        }
      }
    },

    _extApplyType: function(/*String*/moduleName,
                            /*Object*/module,
                            /*Object*/typeExtensions,
                            /*String*/type) {
      //summary: loops through the typeExtensions, calling
      //the right type of function to apply the type of extension.
      var proto = module.prototype;
      var empty = {};
      for (var prop in typeExtensions) {
        if(!(prop in empty)) {
          //Figure out if the extension applies to a module method
          //or a method on the module's prototype.
          var targetObj = module;
          if (type == "addToPrototype") {
            type = "add";
            targetObj = proto;
          } else {
            if (prop in proto) {
              targetObj = proto;
            }
          }

          //Inform developer if there is no match for the extension.
          if (type != "add" && (!(prop in targetObj) || !dojo.isFunction(targetObj[prop]))) {
            console.error("Trying to register a '" + type + "' extension on object "
                          + moduleName
                          + "for non-existent function property: " 
                          + prop);
          } else {
            this["_ext_" + type](prop, targetObj, targetObj[prop], typeExtensions[prop]);
          }
        }
      }
    },

    _ext_before: function(propName, obj, oldValue, newValue) {
      //summary: applies the extension on the named function before the
      //real function on the object. If the before function returns any
      //value, it will be treated as an array of arguments to pass to
      //the original function.
      obj[propName] = function(){
        var args = (newValue.apply(this, arguments) || arguments);
        return oldValue.apply(this, args);
      }
    },

    _ext_after: function(propName, obj, oldValue, newValue) {
      //summary: applies the extension on the named function after the
      //real function on the object. Passes the return value of the original
      //function as "targetReturn" property on the extension function.
      //Extension function can access it via arguments.callee.targetReturn
      obj[propName] = function(){
        var ret = oldValue.apply(this, arguments);
        newValue.targetReturn = ret;
        return newValue.apply(this, arguments);
      }
    },

    _ext_around: function(propName, obj, oldValue, newValue) {
      //summary: applies the extension on the named function around the
      //real function. Attaches the original function as arguments.callee.proceed.
      //The around function has the option to change the arguments passed
      //to arguments.callee.proceed and also to modify the return value. Extension
      //needs to call arguments.callee.proceed.apply(this, arguments) to trigger
      //original function.
      newValue.target = obj[propName];
      obj[propName] = newValue;    
    },

    _ext_replace: function(propName, obj, oldValue, newValue) {
      //summary: Replaces the named property with the new value.
      obj[propName] = newValue;
    },
    
    //Add does the same as replace but sounds better when you are
    //really adding something new, and not replacing.
    _ext_add: function(propName, obj, oldValue, newValue) {
      //summary: Adds the named property with the new value.
      if (propName in obj) {
        console.warn("Warning: adding a method named " + propName + " to an object that already has that property");
      }
      obj[propName] = newValue;
    },

    _extender: null,
    _isExtenderVisible: false,

    showExtender: function() {
      //summary: launches the extension tool.
      if (!this._extender) {
        //Using funky require call syntax to avoid
        //detection by build tools/loader so it is not
        //loaded when the page loads but waits until the
        //extender is shown.
        dojo["require"]("rdw.Extender");
        dojo.addOnLoad(dojo.hitch(this, function(){
          var div = dojo.create("div", {
            "class": "extender"
          }, dojo.body());

          this._extender = new rdw.Extender({}, div);
        }));
      }

      if (!this._isExtenderVisible) {
        rd.addStyle("rd.css.extender");
        if (this._extender) {
          this._extender.domNode.style.display = "block";
        }
        this._isExtenderVisible = true;
      }
    },

    hideExtender: function() {
      //summary: hides the extension tool.
      if (this._isExtenderVisible) {
        rd.removeStyle("rd.css.extender");
        if (this._extender) {
          this._extender.domNode.style.display = "none";
        }
        this._isExtenderVisible = false;
      }
    }
  });

  //Register for the extenstion subscriptions as appropriate
  //These were set in djConfig.rd.subs, but we use dojo.config
  //here in case there is another dojo in the page that overwrites our djConfig.
  var subs = dojo.config.rd.subs;
  var extSubs = {};
  var extSubHandles = {};
  var empty = {};
  for (var i = 0; subs && i < subs.length; i++) {
    for (var topic in subs[i]) {
      //Use empty to weed out stuff added by other JS code to Object.prototype
      if (!empty[topic]) {
        if (!extSubs[topic]) {
          extSubs[topic] = [];
          extSubHandles[topic] = rd.sub(topic, dojo.hitch(rd, "onExtPublish", topic));
        }
        extSubs[topic].push(subs[i][topic]);
      }
    }
  }

  //Change dojo.require to load modules that want to extend
  //the targeted modules
  var reqExts = dojo.config.rd.exts;
  var requireOld = dojo.require;
  dojo.require = function(/*String*/resourceName) {
    //Ask the extensions to be loaded.
    var exts = reqExts[resourceName];
    if (exts) {
      for (var i = 0, ext; ext = exts[i]; i++) {
        dojo["require"](ext);
      }
    }

    //Do the normal dojo.require work.
    var ret = requireOld.apply(dojo, arguments);
    return ret;
  }
})();

//Subscribe to extend topic notification.
rd.subscribe("rd-protocol-extend", rd, "showExtender");

dojo.addOnLoad(function(){
  //Register an onclick handler on the body to handle "#rd:" protocol URLs.
  dojo.connect(document.documentElement, "onclick", rd, "onDocClick");
});

