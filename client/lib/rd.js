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
    //but rather as variable number of arguments to rd.pub. Also, rd.sub allows for passing
    //in a extension module name, to allow us to disable the subscription extension on demand.
    //Base on plugd versions of the code: http://code.google.com/p/plugd/source/browse/trunk/base.js
    sub: function(/*String?*/moduleName, /*String?*/topic) {
      //summary: allows for extension modules names to be passed to allow dynamic
      //disable of an extension.
      if (typeof topic == "string") {
	//Extension case.
	var extKey = moduleName + ":" + topic;
	//Convert arguments to an array and strip off the first arg,
	//which is the extension module name.
	var ary = dojo._toArray(arguments);
	ary.shift();

	//Store the handle of the subscription to allow disabling.
	//Also store subscription args to allow dynamic subscription
	//if the extension is enabled on the fly.
	var handle = dojo.subscribe.apply(dojo, ary);
	rd._extSubs[extKey] = handle;
	ary.unshift(moduleName);
	rd._extSubArgs[extKey] = ary;
	return handle;
      } else {
	//Normal subscribe.
	return dojo.subscribe.apply(dojo, arguments);
      }
    },
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

    _extDisabled: {},
    _exts: {},
    _extSubs: {},
    _extSubArgs: {},

    _updateExtModule: function(/*String*/extName, /*Array*/targets) {
      //summary: updates an extension module code to the latest code.
      //Also refreshes target instances if they are being used in the page.

      //targets could be an array from another window. In that case, the targets
      //are serialized to json to avoid cross window array goofiness.
      if (typeof targets == "string") {
	targets = dojo.fromJson(targets);
      }

      //If a subscription extension, unsub since reloading the extension
      //will cause a resubscribe.
      for (var i = 0, target; target = targets[i]; i++) {
	var key = extName + ":" + target;
	if (rd._extSubArgs[key]) {
	    rd.unsub(rd._extSubs[key]);
	}
      }

      //Force the module reload by tweaking dojo loader interals.
      delete dojo._hasResource[extName];
      delete dojo._loadedModules[extName];

      var url = dojo._getModuleSymbols(extName).join("/") + '.js';
      url = ((url.charAt(0) == '/' || url.match(/^\w+:/)) ? "" : dojo.baseUrl) + url;
      delete dojo._loadedUrls[url];
      
      dojo["require"](extName);

      dojo.addOnLoad(function() {
	//Update instances of targets as appropriate.
	for (var i = 0, target; target = targets[i]; i++) {
	  rd._updateInstances(target);
	}
      });
    },

    //properties to skip when trying to dynamically recreate an instance
    //(used by _updateInstances
    _skipInstanceProperties: {
      id: 1,
      _connects: 1,
      _subscribes: 1,
      nodeType: 1 //to avoid DOM nodes
    },

    _updateInstances: function(/*String*/moduleName) {
      //summary: if the the module is something that can be instantiated
      //and is being shown in the page, update those instances to the new code.
      var instances;
      if (dijit && dijit.registry
	  && (instances = dijit.registry.byClass(moduleName))
	  && instances.length) {
	var module = dojo.getObject(moduleName);
	var empty = {}, widget = dijit._Widget.prototype;

	//Build a list of default properties.
	var defaultProps = {};
	for (var prop in module.prototype) {
	  if (!(prop in empty)) {
	    defaultProps[prop] = module.prototype[prop];
	  }
	}

	instances.forEach(function(instance) {
	  //Build up a list of instance properties. It is an instance property
	  //if it differs from the defaultProps
	  var initProps = {};
	  for (var prop in instance) {
	    if (!(prop in empty)
		&& (!(prop in defaultProps) || defaultProps[prop] != instance[prop])) {
	      //Do not pick up id values or dom nodes, or default widget properties.
	      if (!(prop in widget) && !(prop in rd._skipInstanceProperties)) {
		initProps[prop] = instance[prop];
	      }
	    }
	  }

	  //Now create a new version of the instance and replace the old one.
	  var refreshed = new module(initProps);
	  var parentNode = instance.domNode.parentNode;
	  parentNode.replaceChild(refreshed.domNode, instance.domNode);
	  instance.destroy();
	});
      }
    },

    extensionEnabled: function(/*String*/extName, /*String*/moduleName,/*Boolean?*/enabled) {
      //summary: marks an extension as enabled or disabled. If no value is
      //passed in, then reads the enabled state.
      var key = extName + ":" + moduleName;
      if (typeof enabled != "undefined") {
	//If a subscription enable/disable as appropriate.
	if (rd._extSubArgs[key]) {
	  if (enabled) {
	    rd.sub.apply(rd, rd._extSubArgs[key]);
	  } else {
	    rd.unsub(rd._extSubs[key]);
	  }
	}

	var ret = rd._extDisabled[key] = !enabled;

	//Update instances of the module.
	rd._updateInstances(moduleName);

	return ret;
      } else {
	return !rd._extDisabled[key];
      }
    },

    applyExtension: function(/*String*/extName, /*String*/moduleName, /*Object*/extension) {
      //summary: modifies the module object by attaching an extension to it.
      //ASSUMES the module has already been loaded. Each extension should
      //dojo.require the module it will be extending.
      var module = dojo.getObject(moduleName);
      var extKey = extName + ":" + moduleName;
      var existing = rd._exts[extKey] || {};
      rd._exts[extKey] = extension;
      var empty = {};
      var proto = module.prototype;

      //Cycle through allowed extension types
      for (var i = 0, type; type = this._extTypes[i]; i++) {
	if (extension[type]) {
	  //For each method for the given extension type, add the extension
	  //function but only if it is not on the existing extension. Filter
	  //out bad code that adds thing to Object.prototype via the empty tests.
	  for (var prop in extension[type]) {
	    if (!(prop in empty) && (!existing[type] || !(prop in existing[type]))) {
	      //Figure out if the extension applies to a module method
	      //or a method on the module's prototype.
	      var targetObj = module;
	      var extType = type;
	      if (type == "addToPrototype") {
		extType = "add";
		targetObj = proto;
	      } else {
		if (prop in proto) {
		  targetObj = proto;
		}
	      }

	      //Inform developer if there is no match for the extension.
	      if (extType != "add" && (!(prop in targetObj) || !dojo.isFunction(targetObj[prop]))) {
		console.error("Trying to register a '" + type + "' extension on object "
			      + moduleName
			      + "for non-existent function property: " 
			      + prop);
	      } else {
		this["_ext_" + extType](extKey, type, targetObj, prop, targetObj[prop]);
	      }
	    }
	  }
	}
      }
    },

    _ext_before: function(extKey, type, obj, prop, oldValue) {
      //summary: applies the extension on the named function before the
      //real function on the object. If the before function returns any
      //value, it will be treated as an array of arguments to pass to
      //the original function.
      obj[prop] = function() {
        var args = arguments;
	var extFunc = rd._exts[extKey] && rd._exts[extKey][type];
	extFunc = extFunc && extFunc[prop];
	if (extFunc && !rd._extDisabled[extKey]) {
	  args = extFunc.apply(this, arguments);
	  if (typeof args == undefined) {
	    args = arguments;
	  }
	}
        return oldValue.apply(this, args);
      }      
    },

    _ext_after: function(extKey, type, obj, prop, oldValue) {
      //summary: applies the extension on the named function after the
      //real function on the object. Passes the return value of the original
      //function as "targetReturn" property on the extension function.
      //Extension function can access it via arguments.callee.targetReturn.
      //If the targetReturn is needed, it should be grabbed as the first operation
      //of the extension function, in case a nested/cyclical call to the same
      //function happens after it starts to operate
      //(in which case the .target property could change)
      obj[prop] = function() {
        var ret = oldValue.apply(this, arguments);

	var extFunc = rd._exts[extKey] && rd._exts[extKey][type];
	extFunc = extFunc && extFunc[prop];
	if (extFunc && !rd._extDisabled[extKey]) {
	  extFunc.targetReturn = ret;
	  ret = extFunc.apply(this, arguments);
	  delete extFunc.targetReturn;
	}
        return ret;	
      }
    },

    _ext_around: function(extKey, type, obj, prop, oldValue) {
      //summary: applies the extension on the named function around the
      //real function. Attaches the original function as arguments.callee.target.
      //The around function has the option to change the arguments passed
      //to arguments.callee.target and also to modify the return value. Extension
      //needs to call arguments.callee.target.apply(this, arguments) to trigger
      //original function. If the target function is needed, it should be grabbed
      //as the first operation of the extension function, in case a
      //nested/cyclical call to the same function happens after it starts to operate
      //(in which case the .target property could change)
      obj[prop] = function() {
	var extFunc = rd._exts[extKey] && rd._exts[extKey][type];
	extFunc = extFunc && extFunc[prop];
	if (extFunc && !rd._extDisabled[extKey]) {
	  extFunc.target = oldValue;
	  var ret = extFunc.apply(this, args);
	  delete extFunc.target;
	  return ret;
	} else {
	  return oldValue.apply(this, arguments);
	}
      }
    },

    _ext_replace: function(extKey, type, obj, prop, oldValue) {
      //summary: Replaces the named property with the new value.
      obj[prop] = function() {
	var extFunc = rd._exts[extKey] && rd._exts[extKey][type];
	extFunc = extFunc && extFunc[prop];
	if (extFunc && !rd._extDisabled[extKey]) {
	  return extFunc.apply(this, args);
	} else {
	  return oldValue.apply(this, arguments);
	}
      }
    },

    _ext_add: function(extKey, type, obj, prop, oldValue) {
      //summary: Adds the named property with the new value.
      obj[prop] = function() {
	var extFunc = rd._exts[extKey] && rd._exts[extKey][type];
	extFunc = extFunc && extFunc[prop];
	if (extFunc && !rd._extDisabled[extKey]) {
	  return extFunc.apply(this, args);
	} else {
	  throw new Error("Invalid 'add' extension point call for property: " + prop);
	}
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
  for (var topic in subs) {
    //Use empty to weed out stuff added by other JS code to Object.prototype
    if (!empty[topic]) {
      if (!extSubs[topic]) {
	extSubs[topic] = [];
	extSubHandles[topic] = rd.sub(topic, dojo.hitch(rd, "onExtPublish", topic));
      }
      extSubs[topic].push(subs[topic]);
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

dojo.addOnLoad(function(){
  //Register an onclick handler on the body to handle "#rd:" protocol URLs.
  dojo.connect(document.documentElement, "onclick", rd, "onDocClick");
});

