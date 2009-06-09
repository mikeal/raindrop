/*
	Copyright (c) 2004-2009, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

/*
	This is a compiled version of Dojo, built for deployment and not for
	development. To get an editable version, please visit:

		http://dojotoolkit.org

	for documentation and information on getting the source.
*/

/*
	Copyright (c) 2004-2009, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

/*
	This is a compiled version of Dojo, built for deployment and not for
	development. To get an editable version, please visit:

		http://dojotoolkit.org

	for documentation and information on getting the source.
*/

;(function(){

	/*
	dojo, dijit, and dojox must always be the first three, and in that order.
	djConfig.scopeMap = [
		["dojo", "fojo"],
		["dijit", "fijit"],
		["dojox", "fojox"]
	
	]
	*/

	/**Build will replace this comment with a scoped djConfig **/

	//The null below can be relaced by a build-time value used instead of djConfig.scopeMap.
	var sMap = null;

	//See if new scopes need to be defined.
	if((sMap || (typeof djConfig != "undefined" && djConfig.scopeMap)) && (typeof window != "undefined")){
		var scopeDef = "", scopePrefix = "", scopeSuffix = "", scopeMap = {}, scopeMapRev = {};
		sMap = sMap || djConfig.scopeMap;
		for(var i = 0; i < sMap.length; i++){
			//Make local variables, then global variables that use the locals.
			var newScope = sMap[i];
			scopeDef += "var " + newScope[0] + " = {}; " + newScope[1] + " = " + newScope[0] + ";" + newScope[1] + "._scopeName = '" + newScope[1] + "';";
			scopePrefix += (i == 0 ? "" : ",") + newScope[0];
			scopeSuffix += (i == 0 ? "" : ",") + newScope[1];
			scopeMap[newScope[0]] = newScope[1];
			scopeMapRev[newScope[1]] = newScope[0];
		}

		eval(scopeDef + "dojo._scopeArgs = [" + scopeSuffix + "];");

		dojo._scopePrefixArgs = scopePrefix;
		dojo._scopePrefix = "(function(" + scopePrefix + "){";
		dojo._scopeSuffix = "})(" + scopeSuffix + ")";
		dojo._scopeMap = scopeMap;
		dojo._scopeMapRev = scopeMapRev;
	}

/*=====
// note:
//		'djConfig' does not exist under 'dojo.*' so that it can be set before the
//		'dojo' variable exists.
// note:
//		Setting any of these variables *after* the library has loaded does
//		nothing at all.

djConfig = {
	// summary:
	//		Application code can set the global 'djConfig' prior to loading
	//		the library to override certain global settings for how dojo works.
	//
	// isDebug: Boolean
	//		Defaults to `false`. If set to `true`, ensures that Dojo provides
	//		extended debugging feedback via Firebug. If Firebug is not available
	//		on your platform, setting `isDebug` to `true` will force Dojo to
	//		pull in (and display) the version of Firebug Lite which is
	//		integrated into the Dojo distribution, thereby always providing a
	//		debugging/logging console when `isDebug` is enabled. Note that
	//		Firebug's `console.*` methods are ALWAYS defined by Dojo. If
	//		`isDebug` is false and you are on a platform without Firebug, these
	//		methods will be defined as no-ops.
	isDebug: false,
	// debugAtAllCosts: Boolean
	//		Defaults to `false`. If set to `true`, this triggers an alternate
	//		mode of the package system in which dependencies are detected and
	//		only then are resources evaluated in dependency order via
	//		`<script>` tag inclusion. This may double-request resources and
	//		cause problems with scripts which expect `dojo.require()` to
	//		preform synchronously. `debugAtAllCosts` can be an invaluable
	//		debugging aid, but when using it, ensure that all code which
	//		depends on Dojo modules is wrapped in `dojo.addOnLoad()` handlers.
	//		Due to the somewhat unpredictable side-effects of using
	//		`debugAtAllCosts`, it is strongly recommended that you enable this
	//		flag as a last resort. `debugAtAllCosts` has no effect when loading
	//		resources across domains. For usage information, see the
	//		[Dojo Book](http://dojotoolkit.org/book/book-dojo/part-4-meta-dojo-making-your-dojo-code-run-faster-and-better/debugging-facilities/deb)
	debugAtAllCosts: false,
	// locale: String
	//		The locale to assume for loading localized resources in this page,
	//		specified according to [RFC 3066](http://www.ietf.org/rfc/rfc3066.txt).
	//		Must be specified entirely in lowercase, e.g. `en-us` and `zh-cn`.
	//		See the documentation for `dojo.i18n` and `dojo.requireLocalization`
	//		for details on loading localized resources. If no locale is specified,
	//		Dojo assumes the locale of the user agent, according to `navigator.userLanguage`
	//		or `navigator.language` properties.
	locale: undefined,
	// extraLocale: Array
	//		No default value. Specifies additional locales whose
	//		resources should also be loaded alongside the default locale when
	//		calls to `dojo.requireLocalization()` are processed.
	extraLocale: undefined,
	// baseUrl: String
	//		The directory in which `dojo.js` is located. Under normal
	//		conditions, Dojo auto-detects the correct location from which it
	//		was loaded. You may need to manually configure `baseUrl` in cases
	//		where you have renamed `dojo.js` or in which `<base>` tags confuse
	//		some browsers (e.g. IE 6). The variable `dojo.baseUrl` is assigned
	//		either the value of `djConfig.baseUrl` if one is provided or the
	//		auto-detected root if not. Other modules are located relative to
	//		this path. The path should end in a slash.
	baseUrl: undefined,
	// modulePaths: Object
	//		A map of module names to paths relative to `dojo.baseUrl`. The
	//		key/value pairs correspond directly to the arguments which
	//		`dojo.registerModulePath` accepts. Specifiying
	//		`djConfig.modulePaths = { "foo": "../../bar" }` is the equivalent
	//		of calling `dojo.registerModulePath("foo", "../../bar");`. Multiple
	//		modules may be configured via `djConfig.modulePaths`.
	modulePaths: {},
	// afterOnLoad: Boolean 
	//		Indicates Dojo was added to the page after the page load. In this case
	//		Dojo will not wait for the page DOMContentLoad/load events and fire
	//		its dojo.addOnLoad callbacks after making sure all outstanding
	//		dojo.required modules have loaded.
	afterOnLoad: false,
	// addOnLoad: Function or Array
	//		Adds a callback via dojo.addOnLoad. Useful when Dojo is added after
	//		the page loads and djConfig.afterOnLoad is true. Supports the same
	//		arguments as dojo.addOnLoad. When using a function reference, use
	//		`djConfig.addOnLoad = function(){};`. For object with function name use
	//		`djConfig.addOnLoad = [myObject, "functionName"];` and for object with
	//		function reference use
	//		`djConfig.addOnLoad = [myObject, function(){}];`
	addOnLoad: null,
	// require: Array
	//		An array of module names to be loaded immediately after dojo.js has been included
	//		in a page. 
	require: [],
	// defaultDuration: Array
	//		Default duration, in milliseconds, for wipe and fade animations within dijits.
	//		Assigned to dijit.defaultDuration.
	defaultDuration: 200,
	// dojoBlankHtmlUrl: String
	//		Used by some modules to configure an empty iframe. Used by dojo.io.iframe and
	//		dojo.back, and dijit popup support in IE where an iframe is needed to make sure native
	//		controls do not bleed through the popups. Normally this configuration variable 
	//		does not need to be set, except when using cross-domain/CDN Dojo builds.
	//		Save dojo/resources/blank.html to your domain and set `djConfig.dojoBlankHtmlUrl` 
	//		to the path on your domain your copy of blank.html.
	dojoBlankHtmlUrl: undefined,
	//	ioPublish: Boolean?
	//		Set this to true to enable publishing of topics for the different phases of
	// 		IO operations. Publishing is done via dojo.publish. See dojo.__IoPublish for a list
	// 		of topics that are published.
	ioPublish: false
}
=====*/

(function(){
	// firebug stubs

	if(typeof this["loadFirebugConsole"] == "function"){
		// for Firebug 1.2
		this["loadFirebugConsole"]();
	}else{
		this.console = this.console || {};

		//	Be careful to leave 'log' always at the end
		var cn = [
			"assert", "count", "debug", "dir", "dirxml", "error", "group",
			"groupEnd", "info", "profile", "profileEnd", "time", "timeEnd",
			"trace", "warn", "log" 
		];
		var i=0, tn;
		while((tn=cn[i++])){
			if(!console[tn]){
				(function(){
					var tcn = tn+"";
					console[tcn] = ('log' in console) ? function(){ 
						var a = Array.apply({}, arguments);
						a.unshift(tcn+":");
						console["log"](a.join(" "));
					} : function(){}
				})();
			}
		}
	}

	//TODOC:  HOW TO DOC THIS?
	// dojo is the root variable of (almost all) our public symbols -- make sure it is defined.
	if(typeof dojo == "undefined"){
		this.dojo = {
			_scopeName: "dojo",
			_scopePrefix: "",
			_scopePrefixArgs: "",
			_scopeSuffix: "",
			_scopeMap: {},
			_scopeMapRev: {}
		};
	}

	var d = dojo;

	//Need placeholders for dijit and dojox for scoping code.
	if(typeof dijit == "undefined"){
		this.dijit = {_scopeName: "dijit"};
	}
	if(typeof dojox == "undefined"){
		this.dojox = {_scopeName: "dojox"};
	}
	
	if(!d._scopeArgs){
		d._scopeArgs = [dojo, dijit, dojox];
	}

/*=====
dojo.global = {
	//	summary:
	//		Alias for the global scope
	//		(e.g. the window object in a browser).
	//	description:
	//		Refer to 'dojo.global' rather than referring to window to ensure your
	//		code runs correctly in contexts other than web browsers (e.g. Rhino on a server).
}
=====*/
	d.global = this;

	d.config =/*===== djConfig = =====*/{
		isDebug: false,
		debugAtAllCosts: false
	};

	if(typeof djConfig != "undefined"){
		for(var opt in djConfig){
			d.config[opt] = djConfig[opt];
		}
	}

/*=====
	// Override locale setting, if specified
	dojo.locale = {
		// summary: the locale as defined by Dojo (read-only)
	};
=====*/
	dojo.locale = d.config.locale;

	var rev = "$Rev: 17473 $".match(/\d+/); 

	dojo.version = {
		// summary: 
		//		version number of dojo
		//	major: Integer
		//		Major version. If total version is "1.2.0beta1", will be 1
		//	minor: Integer
		//		Minor version. If total version is "1.2.0beta1", will be 2
		//	patch: Integer
		//		Patch version. If total version is "1.2.0beta1", will be 0
		//	flag: String
		//		Descriptor flag. If total version is "1.2.0beta1", will be "beta1"
		//	revision: Number
		//		The SVN rev from which dojo was pulled
		major: 0, minor: 0, patch: 0, flag: "dev",
		revision: rev ? +rev[0] : NaN,
		toString: function(){
			with(d.version){
				return major + "." + minor + "." + patch + flag + " (" + revision + ")";	// String
			}
		}
	}

		// Register with the OpenAjax hub
	if(typeof OpenAjax != "undefined"){
		OpenAjax.hub.registerLibrary(dojo._scopeName, "http://dojotoolkit.org", d.version.toString());
	}
	
	var tobj = {};
	dojo._mixin = function(/*Object*/ obj, /*Object*/ props){
		// summary:
		//		Adds all properties and methods of props to obj. This addition
		//		is "prototype extension safe", so that instances of objects
		//		will not pass along prototype defaults.
		for(var x in props){
			// the "tobj" condition avoid copying properties in "props"
			// inherited from Object.prototype.  For example, if obj has a custom
			// toString() method, don't overwrite it with the toString() method
			// that props inherited from Object.prototype
			if(tobj[x] === undefined || tobj[x] != props[x]){
				obj[x] = props[x];
			}
		}
				// IE doesn't recognize custom toStrings in for..in
		if(d.isIE && props){
			var p = props.toString;
			if(typeof p == "function" && p != obj.toString && p != tobj.toString &&
				p != "\nfunction toString() {\n    [native code]\n}\n"){
					obj.toString = props.toString;
			}
		}
				return obj; // Object
	}

	dojo.mixin = function(/*Object*/obj, /*Object...*/props){
		// summary:	
		//		Adds all properties and methods of props to obj and returns the
		//		(now modified) obj.
		//	description:
		//		`dojo.mixin` can mix multiple source objects into a
		//		destionation object which is then returned. Unlike regular
		//		`for...in` iteration, `dojo.mixin` is also smart about avoiding
		//		extensions which other toolkits may unwisely add to the root
		//		object prototype
		//	obj:
		//		The object to mix properties into. Also the return value.
		//	props:
		//		One or more objects whose values are successively copied into
		//		obj. If more than one of these objects contain the same value,
		//		the one specified last in the function call will "win".
		//	example:
		//		make a shallow copy of an object
		//	|	var copy = dojo.mixin({}, source);
		//	example:
		//		many class constructors often take an object which specifies
		//		values to be configured on the object. In this case, it is
		//		often simplest to call `dojo.mixin` on the `this` object:
		//	|	dojo.declare("acme.Base", null, {
		//	|		constructor: function(properties){
		//	|			// property configuration:
		//	|			dojo.mixin(this, properties);
		//	|	
		//	|			console.log(this.quip);
		//	|			//  ...
		//	|		},
		//	|		quip: "I wasn't born yesterday, you know - I've seen movies.",
		//	|		// ...
		//	|	});
		//	|
		//	|	// create an instance of the class and configure it
		//	|	var b = new acme.Base({quip: "That's what it does!" });
		//	example:
		//		copy in properties from multiple objects
		//	|	var flattened = dojo.mixin(
		//	|		{
		//	|			name: "Frylock",
		//	|			braces: true
		//	|		},
		//	|		{
		//	|			name: "Carl Brutanananadilewski"
		//	|		}
		//	|	);
		//	|	
		//	|	// will print "Carl Brutanananadilewski"
		//	|	console.log(flattened.name);
		//	|	// will print "true"
		//	|	console.log(flattened.braces);
		if(!obj){ obj = {}; }
		for(var i=1, l=arguments.length; i<l; i++){
			d._mixin(obj, arguments[i]);
		}
		return obj; // Object
	}

	dojo._getProp = function(/*Array*/parts, /*Boolean*/create, /*Object*/context){
		var obj=context || d.global;
		for(var i=0, p; obj && (p=parts[i]); i++){
			if(i == 0 && this._scopeMap[p]){
				p = this._scopeMap[p];
			}
			obj = (p in obj ? obj[p] : (create ? obj[p]={} : undefined));
		}
		return obj; // mixed
	}

	dojo.setObject = function(/*String*/name, /*Object*/value, /*Object?*/context){
		// summary: 
		//		Set a property from a dot-separated string, such as "A.B.C"
		//	description: 
		//		Useful for longer api chains where you have to test each object in
		//		the chain, or when you have an object reference in string format.
		//		Objects are created as needed along `path`. Returns the passed
		//		value if setting is successful or `undefined` if not.
		//	name: 	
		//		Path to a property, in the form "A.B.C".
		//	context:
		//		Optional. Object to use as root of path. Defaults to
		//		`dojo.global`.
		//	example:
		//		set the value of `foo.bar.baz`, regardless of whether
		//		intermediate objects already exist:
		//	|	dojo.setObject("foo.bar.baz", value);
		//	example:
		//		without `dojo.setObject`, we often see code like this:
		//	|	// ensure that intermediate objects are available
		//	|	if(!obj["parent"]){ obj.parent = {}; }
		//	|	if(!obj.parent["child"]){ obj.parent.child= {}; }
		//	|	// now we can safely set the property
		//	|	obj.parent.child.prop = "some value";
		//		wheras with `dojo.setObject`, we can shorten that to:
		//	|	dojo.setObject("parent.child.prop", "some value", obj);
		var parts=name.split("."), p=parts.pop(), obj=d._getProp(parts, true, context);
		return obj && p ? (obj[p]=value) : undefined; // Object
	}

	dojo.getObject = function(/*String*/name, /*Boolean?*/create, /*Object?*/context){
		// summary: 
		//		Get a property from a dot-separated string, such as "A.B.C"
		//	description: 
		//		Useful for longer api chains where you have to test each object in
		//		the chain, or when you have an object reference in string format.
		//	name: 	
		//		Path to an property, in the form "A.B.C".
		//	create: 
		//		Optional. Defaults to `false`. If `true`, Objects will be
		//		created at any point along the 'path' that is undefined.
		//	context:
		//		Optional. Object to use as root of path. Defaults to
		//		'dojo.global'. Null may be passed.
		return d._getProp(name.split("."), create, context); // Object
	}

	dojo.exists = function(/*String*/name, /*Object?*/obj){
		//	summary: 
		//		determine if an object supports a given method
		//	description: 
		//		useful for longer api chains where you have to test each object in
		//		the chain. Useful only for object and method detection.
		//		Not useful for testing generic properties on an object.
		//		In particular, dojo.exists("foo.bar") when foo.bar = ""
		//		will return false. Use ("bar" in foo) to test for those cases.
		//	name: 	
		//		Path to an object, in the form "A.B.C".
		//	obj:
		//		Object to use as root of path. Defaults to
		//		'dojo.global'. Null may be passed.
		//	example:
		//	|	// define an object
		//	|	var foo = {
		//	|		bar: { }
		//	|	};
		//	|
		//	|	// search the global scope
		//	|	dojo.exists("foo.bar"); // true
		//	|	dojo.exists("foo.bar.baz"); // false
		//	|
		//	|	// search from a particular scope
		//	|	dojo.exists("bar", foo); // true
		//	|	dojo.exists("bar.baz", foo); // false
		return !!d.getObject(name, false, obj); // Boolean
	}


	dojo["eval"] = function(/*String*/ scriptFragment){
		//	summary: 
		//		Perform an evaluation in the global scope. Use this rather than
		//		calling 'eval()' directly.
		//	description: 
		//		Placed in a separate function to minimize size of trapped
		//		exceptions. Calling eval() directly from some other scope may
		//		complicate tracebacks on some platforms.
		//	returns:
		//		The result of the evaluation. Often `undefined`


		// note:
		//	 - JSC eval() takes an optional second argument which can be 'unsafe'.
		//	 - Mozilla/SpiderMonkey eval() takes an optional second argument which is the
		//  	 scope object for new symbols.

		// FIXME: investigate Joseph Smarr's technique for IE:
		//		http://josephsmarr.com/2007/01/31/fixing-eval-to-use-global-scope-in-ie/
		//	see also:
		// 		http://trac.dojotoolkit.org/ticket/744
		return d.global.eval ? d.global.eval(scriptFragment) : eval(scriptFragment); 	// Object
	}

	/*=====
		dojo.deprecated = function(behaviour, extra, removal){
			//	summary: 
			//		Log a debug message to indicate that a behavior has been
			//		deprecated.
			//	behaviour: String
			//		The API or behavior being deprecated. Usually in the form
			//		of "myApp.someFunction()".
			//	extra: String?
			//		Text to append to the message. Often provides advice on a
			//		new function or facility to achieve the same goal during
			//		the deprecation period.
			//	removal: String?
			//		Text to indicate when in the future the behavior will be
			//		removed. Usually a version number.
			//	example:
			//	|	dojo.deprecated("myApp.getTemp()", "use myApp.getLocaleTemp() instead", "1.0");
		}

		dojo.experimental = function(moduleName, extra){
			//	summary: Marks code as experimental.
			//	description: 
			//	 	This can be used to mark a function, file, or module as
			//	 	experimental.  Experimental code is not ready to be used, and the
			//	 	APIs are subject to change without notice.  Experimental code may be
			//	 	completed deleted without going through the normal deprecation
			//	 	process.
			//	moduleName: String
			//	 	The name of a module, or the name of a module file or a specific
			//	 	function
			//	extra: String?
			//	 	some additional message for the user
			//	example:
			//	|	dojo.experimental("dojo.data.Result");
			//	example:
			//	|	dojo.experimental("dojo.weather.toKelvin()", "PENDING approval from NOAA");
		}
	=====*/

	//Real functions declared in dojo._firebug.firebug.
	d.deprecated = d.experimental = function(){};

})();
// vim:ai:ts=4:noet

/*
 * loader.js - A bootstrap module.  Runs before the hostenv_*.js file. Contains
 * all of the package loading methods.
 */

(function(){
	var d = dojo;

	d.mixin(d, {
		_loadedModules: {},
		_inFlightCount: 0,
		_hasResource: {},

		_modulePrefixes: {
			dojo: 	{	name: "dojo", value: "." },
			// dojox: 	{	name: "dojox", value: "../dojox" },
			// dijit: 	{	name: "dijit", value: "../dijit" },
			doh: 	{	name: "doh", value: "../util/doh" },
			tests: 	{	name: "tests", value: "tests" }
		},

		_moduleHasPrefix: function(/*String*/module){
			// summary: checks to see if module has been established
			var mp = this._modulePrefixes;
			return !!(mp[module] && mp[module].value); // Boolean
		},

		_getModulePrefix: function(/*String*/module){
			// summary: gets the prefix associated with module
			var mp = this._modulePrefixes;
			if(this._moduleHasPrefix(module)){
				return mp[module].value; // String
			}
			return module; // String
		},

		_loadedUrls: [],

		//WARNING: 
		//		This variable is referenced by packages outside of bootstrap:
		//		FloatingPane.js and undo/browser.js
		_postLoad: false,
		
		//Egad! Lots of test files push on this directly instead of using dojo.addOnLoad.
		_loaders: [],
		_unloaders: [],
		_loadNotifying: false
	});


		dojo._loadPath = function(/*String*/relpath, /*String?*/module, /*Function?*/cb){
		// 	summary:
		//		Load a Javascript module given a relative path
		//
		//	description:
		//		Loads and interprets the script located at relpath, which is
		//		relative to the script root directory.  If the script is found but
		//		its interpretation causes a runtime exception, that exception is
		//		not caught by us, so the caller will see it.  We return a true
		//		value if and only if the script is found.
		//
		// relpath: 
		//		A relative path to a script (no leading '/', and typically ending
		//		in '.js').
		// module: 
		//		A module whose existance to check for after loading a path.  Can be
		//		used to determine success or failure of the load.
		// cb: 
		//		a callback function to pass the result of evaluating the script

		var uri = ((relpath.charAt(0) == '/' || relpath.match(/^\w+:/)) ? "" : this.baseUrl) + relpath;
		try{
			return !module ? this._loadUri(uri, cb) : this._loadUriAndCheck(uri, module, cb); // Boolean
		}catch(e){
			console.error(e);
			return false; // Boolean
		}
	}

	dojo._loadUri = function(/*String*/uri, /*Function?*/cb){
		//	summary:
		//		Loads JavaScript from a URI
		//	description:
		//		Reads the contents of the URI, and evaluates the contents.  This is
		//		used to load modules as well as resource bundles. Returns true if
		//		it succeeded. Returns false if the URI reading failed.  Throws if
		//		the evaluation throws.
		//	uri: a uri which points at the script to be loaded
		//	cb: 
		//		a callback function to process the result of evaluating the script
		//		as an expression, typically used by the resource bundle loader to
		//		load JSON-style resources

		if(d._loadedUrls[uri]){
			return true; // Boolean
		}
		d._inFlightCount++; // block addOnLoad calls that arrive while we're busy downloading
		var contents = d._getText(uri, true);
		if(contents){ // not 404, et al
			d._loadedUrls[uri] = true;
			d._loadedUrls.push(uri);
			if(cb){
				contents = '('+contents+')';
			}else{
				//Only do the scoping if no callback. If a callback is specified,
				//it is most likely the i18n bundle stuff.
				contents = d._scopePrefix + contents + d._scopeSuffix;
			}
			if(d.isMoz){ contents += "\r\n//@ sourceURL=" + uri; } // debugging assist for Firebug
			var value = d["eval"](contents);
			if(cb){ cb(value); }
		}
		// Check to see if we need to call _callLoaded() due to an addOnLoad() that arrived while we were busy downloading
		if(--d._inFlightCount == 0 && d._postLoad && d._loaders.length){
			// We shouldn't be allowed to get here but Firefox allows an event 
			// (mouse, keybd, async xhrGet) to interrupt a synchronous xhrGet. 
			// If the current script block contains multiple require() statements, then after each
			// require() returns, inFlightCount == 0, but we want to hold the _callLoaded() until
			// all require()s are done since the out-of-sequence addOnLoad() presumably needs them all.
			// setTimeout allows the next require() to start (if needed), and then we check this again.
			setTimeout(function(){ 
				// If inFlightCount > 0, then multiple require()s are running sequentially and 
				// the next require() started after setTimeout() was executed but before we got here.
				if(d._inFlightCount == 0){ 
					d._callLoaded();
				}
			}, 0);
		}
		return !!contents; // Boolean: contents? true : false
	}
	
	// FIXME: probably need to add logging to this method
	dojo._loadUriAndCheck = function(/*String*/uri, /*String*/moduleName, /*Function?*/cb){
		// summary: calls loadUri then findModule and returns true if both succeed
		var ok = false;
		try{
			ok = this._loadUri(uri, cb);
		}catch(e){
			console.error("failed loading " + uri + " with error: " + e);
		}
		return !!(ok && this._loadedModules[moduleName]); // Boolean
	}

	dojo.loaded = function(){
		// summary:
		//		signal fired when initial environment and package loading is
		//		complete. You should use dojo.addOnLoad() instead of doing a 
		//		direct dojo.connect() to this method in order to handle
		//		initialization tasks that require the environment to be
		//		initialized. In a browser host,	declarative widgets will 
		//		be constructed when this function	finishes runing.
		this._loadNotifying = true;
		this._postLoad = true;
		var mll = d._loaders;

		//Clear listeners so new ones can be added
		//For other xdomain package loads after the initial load.
		this._loaders = [];

		for(var x = 0; x < mll.length; x++){
			mll[x]();
		}

		this._loadNotifying = false;
		
		//Make sure nothing else got added to the onload queue
		//after this first run. If something did, and we are not waiting for any
		//more inflight resources, run again.
		if(d._postLoad && d._inFlightCount == 0 && mll.length){
			d._callLoaded();
		}
	}

	dojo.unloaded = function(){
		// summary:
		//		signal fired by impending environment destruction. You should use
		//		dojo.addOnUnload() instead of doing a direct dojo.connect() to this 
		//		method to perform page/application cleanup methods. See 
		//		dojo.addOnUnload for more info.
		var mll = d._unloaders;
		while(mll.length){
			(mll.pop())();
		}
	}

	d._onto = function(arr, obj, fn){
		if(!fn){
			arr.push(obj);
		}else if(fn){
			var func = (typeof fn == "string") ? obj[fn] : fn;
			arr.push(function(){ func.call(obj); });
		}
	}

	dojo.addOnLoad = function(/*Object?*/obj, /*String|Function*/functionName){
		// summary:
		//		Registers a function to be triggered after the DOM has finished
		//		loading and widgets declared in markup have been instantiated.
		//		Images and CSS files may or may not have finished downloading when
		//		the specified function is called.  (Note that widgets' CSS and HTML
		//		code is guaranteed to be downloaded before said widgets are
		//		instantiated.)
		// example:
		//	|	dojo.addOnLoad(functionPointer);
		//	|	dojo.addOnLoad(object, "functionName");
		//	|	dojo.addOnLoad(object, function(){ /* ... */});

		d._onto(d._loaders, obj, functionName);

		//Added for xdomain loading. dojo.addOnLoad is used to
		//indicate callbacks after doing some dojo.require() statements.
		//In the xdomain case, if all the requires are loaded (after initial
		//page load), then immediately call any listeners.
		if(d._postLoad && d._inFlightCount == 0 && !d._loadNotifying){
			d._callLoaded();
		}
	}

	//Support calling dojo.addOnLoad via djConfig.addOnLoad. Support all the
	//call permutations of dojo.addOnLoad. Mainly useful when dojo is added
	//to the page after the page has loaded.
	var dca = d.config.addOnLoad;
	if(dca){
		d.addOnLoad[(dca instanceof Array ? "apply" : "call")](d, dca);
	}

	dojo._modulesLoaded = function(){
		if(d._postLoad){ return; }
		if(d._inFlightCount > 0){ 
			console.warn("files still in flight!");
			return;
		}
		d._callLoaded();
	}

	dojo._callLoaded = function(){

		// The "object" check is for IE, and the other opera check fixes an
		// issue in Opera where it could not find the body element in some
		// widget test cases.  For 0.9, maybe route all browsers through the
		// setTimeout (need protection still for non-browser environments
		// though). This might also help the issue with FF 2.0 and freezing
		// issues where we try to do sync xhr while background css images are
		// being loaded (trac #2572)? Consider for 0.9.
		if(typeof setTimeout == "object" || (dojo.config.useXDomain && d.isOpera)){
			if(dojo.isAIR){
				setTimeout(function(){dojo.loaded();}, 0);
			}else{
				setTimeout(dojo._scopeName + ".loaded();", 0);
			}
		}else{
			d.loaded();
		}
	}

	dojo._getModuleSymbols = function(/*String*/modulename){
		// summary:
		//		Converts a module name in dotted JS notation to an array
		//		representing the path in the source tree
		var syms = modulename.split(".");
		for(var i = syms.length; i>0; i--){
			var parentModule = syms.slice(0, i).join(".");
			if((i==1) && !this._moduleHasPrefix(parentModule)){		
				// Support default module directory (sibling of dojo) for top-level modules 
				syms[0] = "../" + syms[0];
			}else{
				var parentModulePath = this._getModulePrefix(parentModule);
				if(parentModulePath != parentModule){
					syms.splice(0, i, parentModulePath);
					break;
				}
			}
		}
		return syms; // Array
	}

	dojo._global_omit_module_check = false;

	dojo.loadInit = function(/*Function*/init){
		//	summary:
		//		Executes a function that needs to be executed for the loader's dojo.requireIf
		//		resolutions to work. This is needed mostly for the xdomain loader case where
		//		a function needs to be executed to set up the possible values for a dojo.requireIf
		//		call.
		//	init:
		//		a function reference. Executed immediately.
		//	description: This function is mainly a marker for the xdomain loader to know parts of
		//		code that needs be executed outside the function wrappper that is placed around modules.
		//		The init function could be executed more than once, and it should make no assumptions
		//		on what is loaded, or what modules are available. Only the functionality in Dojo Base
		//		is allowed to be used. Avoid using this method. For a valid use case,
		//		see the source for dojox.gfx.
		init();
	}

	dojo._loadModule = dojo.require = function(/*String*/moduleName, /*Boolean?*/omitModuleCheck){
		//	summary:
		//		loads a Javascript module from the appropriate URI
		//	moduleName:
		//		module name to load, using periods for separators,
		//		 e.g. "dojo.date.locale".  Module paths are de-referenced by dojo's
		//		internal mapping of locations to names and are disambiguated by
		//		longest prefix. See `dojo.registerModulePath()` for details on
		//		registering new modules.
		//	omitModuleCheck:
		//		if `true`, omitModuleCheck skips the step of ensuring that the
		//		loaded file actually defines the symbol it is referenced by.
		//		For example if it called as `dojo.require("a.b.c")` and the
		//		file located at `a/b/c.js` does not define an object `a.b.c`,
		//		and exception will be throws whereas no exception is raised
		//		when called as `dojo.require("a.b.c", true)`
		//	description:
		//		`dojo.require("A.B")` first checks to see if symbol A.B is
		//		defined. If it is, it is simply returned (nothing to do).
		//	
		//		If it is not defined, it will look for `A/B.js` in the script root
		//		directory.
		//	
		//		`dojo.require` throws an excpetion if it cannot find a file
		//		to load, or if the symbol `A.B` is not defined after loading.
		//	
		//		It returns the object `A.B`.
		//	
		//		`dojo.require()` does nothing about importing symbols into
		//		the current namespace.  It is presumed that the caller will
		//		take care of that. For example, to import all symbols into a
		//		local block, you might write:
		//	
		//		|	with (dojo.require("A.B")) {
		//		|		...
		//		|	}
		//	
		//		And to import just the leaf symbol to a local variable:
		//	
		//		|	var B = dojo.require("A.B");
		//	   	|	...
		//	returns: the required namespace object
		omitModuleCheck = this._global_omit_module_check || omitModuleCheck;

		//Check if it is already loaded.
		var module = this._loadedModules[moduleName];
		if(module){
			return module;
		}

		// convert periods to slashes
		var relpath = this._getModuleSymbols(moduleName).join("/") + '.js';

		var modArg = (!omitModuleCheck) ? moduleName : null;
		var ok = this._loadPath(relpath, modArg);

		if(!ok && !omitModuleCheck){
			throw new Error("Could not load '" + moduleName + "'; last tried '" + relpath + "'");
		}

		// check that the symbol was defined
		// Don't bother if we're doing xdomain (asynchronous) loading.
		if(!omitModuleCheck && !this._isXDomain){
			// pass in false so we can give better error
			module = this._loadedModules[moduleName];
			if(!module){
				throw new Error("symbol '" + moduleName + "' is not defined after loading '" + relpath + "'"); 
			}
		}

		return module;
	}

	dojo.provide = function(/*String*/ resourceName){
		//	summary:
		//		Each javascript source file must have at least one
		//		`dojo.provide()` call at the top of the file, corresponding to
		//		the file name.  For example, `js/dojo/foo.js` must have
		//		`dojo.provide("dojo.foo");` before any calls to
		//		`dojo.require()` are made.
		//	description:
		//		Each javascript source file is called a resource.  When a
		//		resource is loaded by the browser, `dojo.provide()` registers
		//		that it has been loaded.
		//	
		//		For backwards compatibility reasons, in addition to registering
		//		the resource, `dojo.provide()` also ensures that the javascript
		//		object for the module exists.  For example,
		//		`dojo.provide("dojox.data.FlickrStore")`, in addition to
		//		registering that `FlickrStore.js` is a resource for the
		//		`dojox.data` module, will ensure that the `dojox.data`
		//		javascript object exists, so that calls like 
		//		`dojo.data.foo = function(){ ... }` don't fail.
		//
		//		In the case of a build where multiple javascript source files
		//		are combined into one bigger file (similar to a .lib or .jar
		//		file), that file may contain multiple dojo.provide() calls, to
		//		note that it includes multiple resources.

		//Make sure we have a string.
		resourceName = resourceName + "";
		return (d._loadedModules[resourceName] = d.getObject(resourceName, true)); // Object
	}

	//Start of old bootstrap2:

	dojo.platformRequire = function(/*Object*/modMap){
		//	summary:
		//		require one or more modules based on which host environment
		//		Dojo is currently operating in
		//	description:
		//		This method takes a "map" of arrays which one can use to
		//		optionally load dojo modules. The map is indexed by the
		//		possible dojo.name_ values, with two additional values:
		//		"default" and "common". The items in the "default" array will
		//		be loaded if none of the other items have been choosen based on
		//		dojo.name_, set by your host environment. The items in the
		//		"common" array will *always* be loaded, regardless of which
		//		list is chosen.
		//	example:
		//		|	dojo.platformRequire({
		//		|		browser: [
		//		|			"foo.sample", // simple module
		//		|			"foo.test",
		//		|			["foo.bar.baz", true] // skip object check in _loadModule (dojo.require)
		//		|		],
		//		|		default: [ "foo.sample._base" ],
		//		|		common: [ "important.module.common" ]
		//		|	});

		var common = modMap.common || [];
		var result = common.concat(modMap[d._name] || modMap["default"] || []);

		for(var x=0; x<result.length; x++){
			var curr = result[x];
			if(curr.constructor == Array){
				d._loadModule.apply(d, curr);
			}else{
				d._loadModule(curr);
			}
		}
	}

	dojo.requireIf = function(/*Boolean*/ condition, /*String*/ resourceName){
		// summary:
		//		If the condition is true then call dojo.require() for the specified
		//		resource
		if(condition === true){
			// FIXME: why do we support chained require()'s here? does the build system?
			var args = [];
			for(var i = 1; i < arguments.length; i++){ 
				args.push(arguments[i]);
			}
			d.require.apply(d, args);
		}
	}

	dojo.requireAfterIf = d.requireIf;

	dojo.registerModulePath = function(/*String*/module, /*String*/prefix){
		//	summary: 
		//		maps a module name to a path
		//	description: 
		//		An unregistered module is given the default path of ../[module],
		//		relative to Dojo root. For example, module acme is mapped to
		//		../acme.  If you want to use a different module name, use
		//		dojo.registerModulePath. 
		//	example:
		//		If your dojo.js is located at this location in the web root:
		//	|	/myapp/js/dojo/dojo/dojo.js
		//		and your modules are located at:
		//	|	/myapp/js/foo/bar.js
		//	|	/myapp/js/foo/baz.js
		//	|	/myapp/js/foo/thud/xyzzy.js
		//		Your application can tell Dojo to locate the "foo" namespace by calling:
		//	|	dojo.registerModulePath("foo", "../../foo");
		//		At which point you can then use dojo.require() to load the
		//		modules (assuming they provide() the same things which are
		//		required). The full code might be:
		//	|	<script type="text/javascript" 
		//	|		src="/myapp/js/dojo/dojo/dojo.js"></script>
		//	|	<script type="text/javascript">
		//	|		dojo.registerModulePath("foo", "../../foo");
		//	|		dojo.require("foo.bar");
		//	|		dojo.require("foo.baz");
		//	|		dojo.require("foo.thud.xyzzy");
		//	|	</script>
		d._modulePrefixes[module] = { name: module, value: prefix };
	}

	dojo.requireLocalization = function(/*String*/moduleName, /*String*/bundleName, /*String?*/locale, /*String?*/availableFlatLocales){
		// summary:
		//		Declares translated resources and loads them if necessary, in the
		//		same style as dojo.require.  Contents of the resource bundle are
		//		typically strings, but may be any name/value pair, represented in
		//		JSON format.  See also `dojo.i18n.getLocalization`.
		//
		// description:
		//		Load translated resource bundles provided underneath the "nls"
		//		directory within a package.  Translated resources may be located in
		//		different packages throughout the source tree.  
		//
		//		Each directory is named for a locale as specified by RFC 3066,
		//		(http://www.ietf.org/rfc/rfc3066.txt), normalized in lowercase.
		//		Note that the two bundles in the example do not define all the
		//		same variants.  For a given locale, bundles will be loaded for
		//		that locale and all more general locales above it, including a
		//		fallback at the root directory.  For example, a declaration for
		//		the "de-at" locale will first load `nls/de-at/bundleone.js`,
		//		then `nls/de/bundleone.js` and finally `nls/bundleone.js`.  The
		//		data will be flattened into a single Object so that lookups
		//		will follow this cascading pattern.  An optional build step can
		//		preload the bundles to avoid data redundancy and the multiple
		//		network hits normally required to load these resources.
		//
		// moduleName: 
		//		name of the package containing the "nls" directory in which the
		//		bundle is found
		//
		// bundleName: 
		//		bundle name, i.e. the filename without the '.js' suffix
		//
		// locale: 
		//		the locale to load (optional)  By default, the browser's user
		//		locale as defined by dojo.locale
		//
		// availableFlatLocales: 
		//		A comma-separated list of the available, flattened locales for this
		//		bundle. This argument should only be set by the build process.
		//
		//	example:
		//		A particular widget may define one or more resource bundles,
		//		structured in a program as follows, where moduleName is
		//		mycode.mywidget and bundleNames available include bundleone and
		//		bundletwo:
		//	|		...
		//	|	mycode/
		//	|		mywidget/
		//	|			nls/
		//	|				bundleone.js (the fallback translation, English in this example)
		//	|				bundletwo.js (also a fallback translation)
		//	|				de/
		//	|					bundleone.js
		//	|					bundletwo.js
		//	|				de-at/
		//	|					bundleone.js
		//	|				en/
		//	|					(empty; use the fallback translation)
		//	|				en-us/
		//	|					bundleone.js
		//	|				en-gb/
		//	|					bundleone.js
		//	|				es/
		//	|					bundleone.js
		//	|					bundletwo.js
		//	|				  ...etc
		//	|				...
		//

		d.require("dojo.i18n");
		d.i18n._requireLocalization.apply(d.hostenv, arguments);
	};


	var ore = new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?$");
	var ire = new RegExp("^((([^\\[:]+):)?([^@]+)@)?(\\[([^\\]]+)\\]|([^\\[:]*))(:([0-9]+))?$");

	dojo._Url = function(/*dojo._Url||String...*/){
		// summary: 
		//		Constructor to create an object representing a URL.
		//		It is marked as private, since we might consider removing
		//		or simplifying it.
		// description: 
		//		Each argument is evaluated in order relative to the next until
		//		a canonical uri is produced. To get an absolute Uri relative to
		//		the current document use:
		//      	new dojo._Url(document.baseURI, url)

		var n = null;

		var _a = arguments;
		var uri = [_a[0]];
		// resolve uri components relative to each other
		for(var i = 1; i<_a.length; i++){
			if(!_a[i]){ continue; }

			// Safari doesn't support this.constructor so we have to be explicit
			// FIXME: Tracked (and fixed) in Webkit bug 3537.
			//		http://bugs.webkit.org/show_bug.cgi?id=3537
			var relobj = new d._Url(_a[i]+"");
			var uriobj = new d._Url(uri[0]+"");

			if(
				relobj.path == "" &&
				!relobj.scheme &&
				!relobj.authority &&
				!relobj.query
			){
				if(relobj.fragment != n){
					uriobj.fragment = relobj.fragment;
				}
				relobj = uriobj;
			}else if(!relobj.scheme){
				relobj.scheme = uriobj.scheme;

				if(!relobj.authority){
					relobj.authority = uriobj.authority;

					if(relobj.path.charAt(0) != "/"){
						var path = uriobj.path.substring(0,
							uriobj.path.lastIndexOf("/") + 1) + relobj.path;

						var segs = path.split("/");
						for(var j = 0; j < segs.length; j++){
							if(segs[j] == "."){
								// flatten "./" references
								if(j == segs.length - 1){
									segs[j] = "";
								}else{
									segs.splice(j, 1);
									j--;
								}
							}else if(j > 0 && !(j == 1 && segs[0] == "") &&
								segs[j] == ".." && segs[j-1] != ".."){
								// flatten "../" references
								if(j == (segs.length - 1)){
									segs.splice(j, 1);
									segs[j - 1] = "";
								}else{
									segs.splice(j - 1, 2);
									j -= 2;
								}
							}
						}
						relobj.path = segs.join("/");
					}
				}
			}

			uri = [];
			if(relobj.scheme){ 
				uri.push(relobj.scheme, ":");
			}
			if(relobj.authority){
				uri.push("//", relobj.authority);
			}
			uri.push(relobj.path);
			if(relobj.query){
				uri.push("?", relobj.query);
			}
			if(relobj.fragment){
				uri.push("#", relobj.fragment);
			}
		}

		this.uri = uri.join("");

		// break the uri into its main components
		var r = this.uri.match(ore);

		this.scheme = r[2] || (r[1] ? "" : n);
		this.authority = r[4] || (r[3] ? "" : n);
		this.path = r[5]; // can never be undefined
		this.query = r[7] || (r[6] ? "" : n);
		this.fragment  = r[9] || (r[8] ? "" : n);

		if(this.authority != n){
			// server based naming authority
			r = this.authority.match(ire);

			this.user = r[3] || n;
			this.password = r[4] || n;
			this.host = r[6] || r[7]; // ipv6 || ipv4
			this.port = r[9] || n;
		}
	}

	dojo._Url.prototype.toString = function(){ return this.uri; };

	dojo.moduleUrl = function(/*String*/module, /*dojo._Url||String*/url){
		//	summary: 
		//		Returns a `dojo._Url` object relative to a module.
		//	example:
		//	|	var pngPath = dojo.moduleUrl("acme","images/small.png");
		//	|	console.dir(pngPath); // list the object properties
		//	|	// create an image and set it's source to pngPath's value:
		//	|	var img = document.createElement("img");
		// 	|	// NOTE: we assign the string representation of the url object
		//	|	img.src = pngPath.toString(); 
		//	|	// add our image to the document
		//	|	dojo.body().appendChild(img);
		//	example: 
		//		you may de-reference as far as you like down the package
		//		hierarchy.  This is sometimes handy to avoid lenghty relative
		//		urls or for building portable sub-packages. In this example,
		//		the `acme.widget` and `acme.util` directories may be located
		//		under different roots (see `dojo.registerModulePath`) but the
		//		the modules which reference them can be unaware of their
		//		relative locations on the filesystem:
		//	|	// somewhere in a configuration block
		//	|	dojo.registerModulePath("acme.widget", "../../acme/widget");
		//	|	dojo.registerModulePath("acme.util", "../../util");
		//	|	
		//	|	// ...
		//	|	
		//	|	// code in a module using acme resources
		//	|	var tmpltPath = dojo.moduleUrl("acme.widget","templates/template.html");
		//	|	var dataPath = dojo.moduleUrl("acme.util","resources/data.json");

		var loc = d._getModuleSymbols(module).join('/');
		if(!loc){ return null; }
		if(loc.lastIndexOf("/") != loc.length-1){
			loc += "/";
		}
		
		//If the path is an absolute path (starts with a / or is on another
		//domain/xdomain) then don't add the baseUrl.
		var colonIndex = loc.indexOf(":");
		if(loc.charAt(0) != "/" && (colonIndex == -1 || colonIndex > loc.indexOf("/"))){
			loc = d.baseUrl + loc;
		}

		return new d._Url(loc, url); // String
	}
})();

/*=====
dojo.isBrowser = {
	//	example:
	//	|	if(dojo.isBrowser){ ... }
};

dojo.isFF = {
	//	example:
	//	|	if(dojo.isFF > 1){ ... }
};

dojo.isIE = {
	// example:
	//	|	if(dojo.isIE > 6){
	//	|		// we are IE7
	// 	|	}
};

dojo.isSafari = {
	//	example:
	//	|	if(dojo.isSafari){ ... }
	//	example: 
	//		Detect iPhone:
	//	|	if(dojo.isSafari && navigator.userAgent.indexOf("iPhone") != -1){ 
	//	|		// we are iPhone. Note, iPod touch reports "iPod" above and fails this test.
	//	|	}
};

dojo = {
	// isBrowser: Boolean
	//		True if the client is a web-browser
	isBrowser: true,
	//	isFF: Number | undefined
	//		Version as a Number if client is FireFox. undefined otherwise. Corresponds to
	//		major detected FireFox version (1.5, 2, 3, etc.)
	isFF: 2,
	//	isIE: Number | undefined
	//		Version as a Number if client is MSIE(PC). undefined otherwise. Corresponds to
	//		major detected IE version (6, 7, 8, etc.)
	isIE: 6,
	//	isKhtml: Number | undefined
	//		Version as a Number if client is a KHTML browser. undefined otherwise. Corresponds to major
	//		detected version.
	isKhtml: 0,
	//	isWebKit: Number | undefined
	//		Version as a Number if client is a WebKit-derived browser (Konqueror,
	//		Safari, Chrome, etc.). undefined otherwise.
	isWebKit: 0,
	//	isMozilla: Number | undefined
	//		Version as a Number if client is a Mozilla-based browser (Firefox,
	//		SeaMonkey). undefined otherwise. Corresponds to major detected version.
	isMozilla: 0,
	//	isOpera: Number | undefined
	//		Version as a Number if client is Opera. undefined otherwise. Corresponds to
	//		major detected version.
	isOpera: 0,
	//	isSafari: Number | undefined
	//		Version as a Number if client is Safari or iPhone. undefined otherwise.
	isSafari: 0,
	//	isChrome: Number | undefined
	//		Version as a Number if client is Chrome browser. undefined otherwise.
	isChrome: 0
}
=====*/

if(typeof window != 'undefined'){
	dojo.isBrowser = true;
	dojo._name = "browser";


	// attempt to figure out the path to dojo if it isn't set in the config
	(function(){
		var d = dojo;

		// this is a scope protection closure. We set browser versions and grab
		// the URL we were loaded from here.

		// grab the node we were loaded from
		if(document && document.getElementsByTagName){
			var scripts = document.getElementsByTagName("script");
			var rePkg = /dojo(\.xd)?\.js(\W|$)/i;
			for(var i = 0; i < scripts.length; i++){
				var src = scripts[i].getAttribute("src");
				if(!src){ continue; }
				var m = src.match(rePkg);
				if(m){
					// find out where we came from
					if(!d.config.baseUrl){
						d.config.baseUrl = src.substring(0, m.index);
					}
					// and find out if we need to modify our behavior
					var cfg = scripts[i].getAttribute("djConfig");
					if(cfg){
						var cfgo = eval("({ "+cfg+" })");
						for(var x in cfgo){
							dojo.config[x] = cfgo[x];
						}
					}
					break; // "first Dojo wins"
				}
			}
		}
		d.baseUrl = d.config.baseUrl;

		// fill in the rendering support information in dojo.render.*
		var n = navigator;
		var dua = n.userAgent,
			dav = n.appVersion,
			tv = parseFloat(dav);

		if(dua.indexOf("Opera") >= 0){ d.isOpera = tv; }
		if(dua.indexOf("AdobeAIR") >= 0){ d.isAIR = 1; }
		d.isKhtml = (dav.indexOf("Konqueror") >= 0) ? tv : 0;
		d.isWebKit = parseFloat(dua.split("WebKit/")[1]) || undefined;
		d.isChrome = parseFloat(dua.split("Chrome/")[1]) || undefined;

		// safari detection derived from:
		//		http://developer.apple.com/internet/safari/faq.html#anchor2
		//		http://developer.apple.com/internet/safari/uamatrix.html
		var index = Math.max(dav.indexOf("WebKit"), dav.indexOf("Safari"), 0);
		if(index && !dojo.isChrome){
			// try to grab the explicit Safari version first. If we don't get
			// one, look for less than 419.3 as the indication that we're on something
			// "Safari 2-ish".
			d.isSafari = parseFloat(dav.split("Version/")[1]);
			if(!d.isSafari || parseFloat(dav.substr(index + 7)) <= 419.3){
				d.isSafari = 2;
			}
		}

				if(dua.indexOf("Gecko") >= 0 && !d.isKhtml && !d.isWebKit){ d.isMozilla = d.isMoz = tv; }
		if(d.isMoz){
			//We really need to get away from this. Consider a sane isGecko approach for the future.
			d.isFF = parseFloat(dua.split("Firefox/")[1] || dua.split("Minefield/")[1] || dua.split("Shiretoko/")[1]) || undefined;
		}
		if(document.all && !d.isOpera){
			d.isIE = parseFloat(dav.split("MSIE ")[1]) || undefined;
			//In cases where the page has an HTTP header or META tag with
			//X-UA-Compatible, then it is in emulation mode, for a previous
			//version. Make sure isIE reflects the desired version.
			//document.documentMode of 5 means quirks mode.
			if(d.isIE >= 8 && document.documentMode != 5){
				d.isIE = document.documentMode;
			}
		}

		//Workaround to get local file loads of dojo to work on IE 7
		//by forcing to not use native xhr.
		if(dojo.isIE && window.location.protocol === "file:"){
			dojo.config.ieForceActiveXXhr=true;
		}
		
		var cm = document.compatMode;
		d.isQuirks = cm == "BackCompat" || cm == "QuirksMode" || d.isIE < 6;

		// TODO: is the HTML LANG attribute relevant?
		d.locale = dojo.config.locale || (d.isIE ? n.userLanguage : n.language).toLowerCase();

		// These are in order of decreasing likelihood; this will change in time.
				d._XMLHTTP_PROGIDS = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'];
		
		d._xhrObj = function(){
			// summary: 
			//		does the work of portably generating a new XMLHTTPRequest object.
			var http, last_e;
						if(!dojo.isIE || !dojo.config.ieForceActiveXXhr){
							try{ http = new XMLHttpRequest(); }catch(e){}
						}
			if(!http){
				for(var i=0; i<3; ++i){
					var progid = d._XMLHTTP_PROGIDS[i];
					try{
						http = new ActiveXObject(progid);
					}catch(e){
						last_e = e;
					}

					if(http){
						d._XMLHTTP_PROGIDS = [progid];  // so faster next time
						break;
					}
				}
			}
			
			if(!http){
				throw new Error("XMLHTTP not available: "+last_e);
			}

			return http; // XMLHTTPRequest instance
		}

		d._isDocumentOk = function(http){
			var stat = http.status || 0;
			return (stat >= 200 && stat < 300) || 	// Boolean
				stat == 304 || 						// allow any 2XX response code
				stat == 1223 || 						// get it out of the cache
				(!stat && (location.protocol=="file:" || location.protocol=="chrome:") ); // Internet Explorer mangled the status code
		}

		//See if base tag is in use.
		//This is to fix http://trac.dojotoolkit.org/ticket/3973,
		//but really, we need to find out how to get rid of the dojo._Url reference
		//below and still have DOH work with the dojo.i18n test following some other
		//test that uses the test frame to load a document (trac #2757).
		//Opera still has problems, but perhaps a larger issue of base tag support
		//with XHR requests (hasBase is true, but the request is still made to document
		//path, not base path).
		var owloc = window.location+"";
		var base = document.getElementsByTagName("base");
		var hasBase = (base && base.length > 0);

		d._getText = function(/*URI*/ uri, /*Boolean*/ fail_ok){
			// summary: Read the contents of the specified uri and return those contents.
			// uri:
			//		A relative or absolute uri. If absolute, it still must be in
			//		the same "domain" as we are.
			// fail_ok:
			//		Default false. If fail_ok and loading fails, return null
			//		instead of throwing.
			// returns: The response text. null is returned when there is a
			//		failure and failure is okay (an exception otherwise)

			// NOTE: must be declared before scope switches ie. this._xhrObj()
			var http = this._xhrObj();

			if(!hasBase && dojo._Url){
				uri = (new dojo._Url(owloc, uri)).toString();
			}

			if(d.config.cacheBust){
				//Make sure we have a string before string methods are used on uri
				uri += "";
				uri += (uri.indexOf("?") == -1 ? "?" : "&") + String(d.config.cacheBust).replace(/\W+/g,"");
			}

			http.open('GET', uri, false);
			try{
				http.send(null);
				if(!d._isDocumentOk(http)){
					var err = Error("Unable to load "+uri+" status:"+ http.status);
					err.status = http.status;
					err.responseText = http.responseText;
					throw err;
				}
			}catch(e){
				if(fail_ok){ return null; } // null
				// rethrow the exception
				throw e;
			}
			return http.responseText; // String
		}
		

		var _w = window;
		var _handleNodeEvent = function(/*String*/evtName, /*Function*/fp){
			// summary:
			//		non-destructively adds the specified function to the node's
			//		evtName handler.
			// evtName: should be in the form "onclick" for "onclick" handlers.
			// Make sure you pass in the "on" part.
			var oldHandler = _w[evtName] || function(){};
			_w[evtName] = function(){
				fp.apply(_w, arguments);
				oldHandler.apply(_w, arguments);
			};
		};


		d._windowUnloaders = [];
		
		d.windowUnloaded = function(){
			// summary:
			//		signal fired by impending window destruction. You may use
			//		dojo.addOnWindowUnload() to register a listener for this
			//		event. NOTE: if you wish to dojo.connect() to this method
			//		to perform page/application cleanup, be aware that this
			//		event WILL NOT fire if no handler has been registered with
			//		dojo.addOnWindowUnload. This behavior started in Dojo 1.3.
			//		Previous versions always triggered dojo.windowUnloaded. See
			//		dojo.addOnWindowUnload for more info.
			var mll = d._windowUnloaders;
			while(mll.length){
				(mll.pop())();
			}
		};

		var _onWindowUnloadAttached = 0;
		d.addOnWindowUnload = function(/*Object?|Function?*/obj, /*String|Function?*/functionName){
			// summary:
			//		registers a function to be triggered when window.onunload
			//		fires. 
			//	description:
			//		The first time that addOnWindowUnload is called Dojo
			//		will register a page listener to trigger your unload
			//		handler with. Note that registering these handlers may
			//		destory "fastback" page caching in browsers that support
			//		it. Be careful trying to modify the DOM or access
			//		JavaScript properties during this phase of page unloading:
			//		they may not always be available. Consider
			//		dojo.addOnUnload() if you need to modify the DOM or do
			//		heavy JavaScript work since it fires at the eqivalent of
			//		the page's "onbeforeunload" event.
			// example:
			//	|	dojo.addOnWindowUnload(functionPointer)
			//	|	dojo.addOnWindowUnload(object, "functionName");
			//	|	dojo.addOnWindowUnload(object, function(){ /* ... */});

			d._onto(d._windowUnloaders, obj, functionName);
			if(!_onWindowUnloadAttached){
				_onWindowUnloadAttached = 1;
				_handleNodeEvent("onunload", d.windowUnloaded);
			}
		};

		var _onUnloadAttached = 0;
		d.addOnUnload = function(/*Object?|Function?*/obj, /*String|Function?*/functionName){
			// summary:
			//		registers a function to be triggered when the page unloads.
			//	description:
			//		The first time that addOnUnload is called Dojo will
			//		register a page listener to trigger your unload handler
			//		with. 
			//
			//		In a browser enviroment, the functions will be triggered
			//		during the window.onbeforeunload event. Be careful of doing
			//		too much work in an unload handler. onbeforeunload can be
			//		triggered if a link to download a file is clicked, or if
			//		the link is a javascript: link. In these cases, the
			//		onbeforeunload event fires, but the document is not
			//		actually destroyed. So be careful about doing destructive
			//		operations in a dojo.addOnUnload callback.
			//
			//		Further note that calling dojo.addOnUnload will prevent
			//		browsers from using a "fast back" cache to make page
			//		loading via back button instantaneous. 
			// example:
			//	|	dojo.addOnUnload(functionPointer)
			//	|	dojo.addOnUnload(object, "functionName")
			//	|	dojo.addOnUnload(object, function(){ /* ... */});

			d._onto(d._unloaders, obj, functionName);
			if(!_onUnloadAttached){
				_onUnloadAttached = 1;
				_handleNodeEvent("onbeforeunload", dojo.unloaded);
			}
		};

	})();

	dojo._initFired = false;
	//	BEGIN DOMContentLoaded, from Dean Edwards (http://dean.edwards.name/weblog/2006/06/again/)
	dojo._loadInit = function(e){
		dojo._initFired = true;
		// allow multiple calls, only first one will take effect
		// A bug in khtml calls events callbacks for document for event which isnt supported
		// for example a created contextmenu event calls DOMContentLoaded, workaround
		var type = e && e.type ? e.type.toLowerCase() : "load";
		if(arguments.callee.initialized || (type != "domcontentloaded" && type != "load")){ return; }
		arguments.callee.initialized = true;
		if("_khtmlTimer" in dojo){
			clearInterval(dojo._khtmlTimer);
			delete dojo._khtmlTimer;
		}

		if(dojo._inFlightCount == 0){
			dojo._modulesLoaded();
		}
	}

	if(!dojo.config.afterOnLoad){
		//	START DOMContentLoaded
		// Mozilla and Opera 9 expose the event we could use
				if(document.addEventListener){
			// NOTE: 
			//		due to a threading issue in Firefox 2.0, we can't enable
			//		DOMContentLoaded on that platform. For more information, see:
			//		http://trac.dojotoolkit.org/ticket/1704
			if(dojo.isWebKit > 525 || dojo.isOpera || dojo.isFF >= 3 || (dojo.isMoz && dojo.config.enableMozDomContentLoaded === true)){
						document.addEventListener("DOMContentLoaded", dojo._loadInit, null);
					}
	
			//	mainly for Opera 8.5, won't be fired if DOMContentLoaded fired already.
			//  also used for Mozilla because of trac #1640
			window.addEventListener("load", dojo._loadInit, null);
		}
			
				if(dojo.isAIR){
			window.addEventListener("load", dojo._loadInit, null);
		}else if((dojo.isWebKit < 525) || dojo.isKhtml){
			dojo._khtmlTimer = setInterval(function(){
				if(/loaded|complete/.test(document.readyState)){
					dojo._loadInit(); // call the onload handler
				}
			}, 10);
		}
				//	END DOMContentLoaded
	}

		if(dojo.isIE){
		// 	for Internet Explorer. readyState will not be achieved on init
		// 	call, but dojo doesn't need it however, we'll include it
		// 	because we don't know if there are other functions added that
		// 	might.  Note that this has changed because the build process
		// 	strips all comments -- including conditional ones.
		if(!dojo.config.afterOnLoad){
			document.write('<scr'+'ipt defer src="//:" '
				+ 'onreadystatechange="if(this.readyState==\'complete\'){' + dojo._scopeName + '._loadInit();}">'
				+ '</scr'+'ipt>'
			);
		}

		try{
			document.namespaces.add("v","urn:schemas-microsoft-com:vml");
			document.createStyleSheet().addRule("v\\:*", "behavior:url(#default#VML);  display:inline-block");
		}catch(e){}
	}
	

	/*
	OpenAjax.subscribe("OpenAjax", "onload", function(){
		if(dojo._inFlightCount == 0){
			dojo._modulesLoaded();
		}
	});

	OpenAjax.subscribe("OpenAjax", "onunload", function(){
		dojo.unloaded();
	});
	*/
} //if (typeof window != 'undefined')

//Register any module paths set up in djConfig. Need to do this
//in the hostenvs since hostenv_browser can read djConfig from a
//script tag's attribute.
(function(){
	var mp = dojo.config["modulePaths"];
	if(mp){
		for(var param in mp){
			dojo.registerModulePath(param, mp[param]);
		}
	}
})();

//Load debug code if necessary.
if(dojo.config.isDebug){
	dojo.require("dojo._firebug.firebug");
}

if(dojo.config.debugAtAllCosts){
	dojo.config.useXDomain = true;
	dojo.require("dojo._base._loader.loader_xd");
	dojo.require("dojo._base._loader.loader_debug");
	dojo.require("dojo.i18n");
}

if(!dojo._hasResource["dojo._base.lang"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo._base.lang"] = true;
dojo.provide("dojo._base.lang");

// Crockford (ish) functions

dojo.isString = function(/*anything*/ it){
	//	summary:
	//		Return true if it is a String
	return (typeof it == "string" || it instanceof String); // Boolean
}

dojo.isArray = function(/*anything*/ it){
	//	summary:
	//		Return true if it is an Array
	return it && (it instanceof Array || typeof it == "array"); // Boolean
}

/*=====
dojo.isFunction = function(it){
	// summary: Return true if it is a Function
	// it: anything
	return; // Boolean
}
=====*/

dojo.isFunction = (function(){
	var _isFunction = function(/*anything*/ it){
		var t = typeof it; // must evaluate separately due to bizarre Opera bug. See #8937 
		return it && (t == "function" || it instanceof Function); // Boolean
	};

	return dojo.isSafari ?
		// only slow this down w/ gratuitious casting in Safari (not WebKit)
		function(/*anything*/ it){
			if(typeof it == "function" && it == "[object NodeList]"){ return false; }
			return _isFunction(it); // Boolean
		} : _isFunction;
})();

dojo.isObject = function(/*anything*/ it){
	// summary: 
	//		Returns true if it is a JavaScript object (or an Array, a Function
	//		or null)
	return it !== undefined &&
		(it === null || typeof it == "object" || dojo.isArray(it) || dojo.isFunction(it)); // Boolean
}

dojo.isArrayLike = function(/*anything*/ it){
	//	summary:
	//		similar to dojo.isArray() but more permissive
	//	description:
	//		Doesn't strongly test for "arrayness".  Instead, settles for "isn't
	//		a string or number and has a length property". Arguments objects
	//		and DOM collections will return true when passed to
	//		dojo.isArrayLike(), but will return false when passed to
	//		dojo.isArray().
	//	returns:
	//		If it walks like a duck and quacks like a duck, return `true`
	var d = dojo;
	return it && it !== undefined && // Boolean
		// keep out built-in constructors (Number, String, ...) which have length
		// properties
		!d.isString(it) && !d.isFunction(it) &&
		!(it.tagName && it.tagName.toLowerCase() == 'form') &&
		(d.isArray(it) || isFinite(it.length));
}

dojo.isAlien = function(/*anything*/ it){
	// summary: 
	//		Returns true if it is a built-in function or some other kind of
	//		oddball that *should* report as a function but doesn't
	return it && !dojo.isFunction(it) && /\{\s*\[native code\]\s*\}/.test(String(it)); // Boolean
}

dojo.extend = function(/*Object*/ constructor, /*Object...*/ props){
	// summary:
	//		Adds all properties and methods of props to constructor's
	//		prototype, making them available to all instances created with
	//		constructor.
	for(var i=1, l=arguments.length; i<l; i++){
		dojo._mixin(constructor.prototype, arguments[i]);
	}
	return constructor; // Object
}

dojo._hitchArgs = function(scope, method /*,...*/){
	var pre = dojo._toArray(arguments, 2);
	var named = dojo.isString(method);
	return function(){
		// arrayify arguments
		var args = dojo._toArray(arguments);
		// locate our method
		var f = named ? (scope||dojo.global)[method] : method;
		// invoke with collected args
		return f && f.apply(scope || this, pre.concat(args)); // mixed
 	} // Function
}

dojo.hitch = function(/*Object*/scope, /*Function|String*/method /*,...*/){
	//	summary: 
	//		Returns a function that will only ever execute in the a given scope. 
	//		This allows for easy use of object member functions
	//		in callbacks and other places in which the "this" keyword may
	//		otherwise not reference the expected scope. 
	//		Any number of default positional arguments may be passed as parameters 
	//		beyond "method".
	//		Each of these values will be used to "placehold" (similar to curry)
	//		for the hitched function. 
	//	scope: 
	//		The scope to use when method executes. If method is a string, 
	//		scope is also the object containing method.
	//	method:
	//		A function to be hitched to scope, or the name of the method in
	//		scope to be hitched.
	//	example:
	//	|	dojo.hitch(foo, "bar")(); 
	//		runs foo.bar() in the scope of foo
	//	example:
	//	|	dojo.hitch(foo, myFunction);
	//		returns a function that runs myFunction in the scope of foo
	if(arguments.length > 2){
		return dojo._hitchArgs.apply(dojo, arguments); // Function
	}
	if(!method){
		method = scope;
		scope = null;
	}
	if(dojo.isString(method)){
		scope = scope || dojo.global;
		if(!scope[method]){ throw(['dojo.hitch: scope["', method, '"] is null (scope="', scope, '")'].join('')); }
		return function(){ return scope[method].apply(scope, arguments || []); }; // Function
	}
	return !scope ? method : function(){ return method.apply(scope, arguments || []); }; // Function
}

/*=====
dojo.delegate = function(obj, props){
	//	summary:
	//		Returns a new object which "looks" to obj for properties which it
	//		does not have a value for. Optionally takes a bag of properties to
	//		seed the returned object with initially. 
	//	description:
	//		This is a small implementaton of the Boodman/Crockford delegation
	//		pattern in JavaScript. An intermediate object constructor mediates
	//		the prototype chain for the returned object, using it to delegate
	//		down to obj for property lookup when object-local lookup fails.
	//		This can be thought of similarly to ES4's "wrap", save that it does
	//		not act on types but rather on pure objects.
	//	obj:
	//		The object to delegate to for properties not found directly on the
	//		return object or in props.
	//	props:
	//		an object containing properties to assign to the returned object
	//	returns:
	//		an Object of anonymous type
	//	example:
	//	|	var foo = { bar: "baz" };
	//	|	var thinger = dojo.delegate(foo, { thud: "xyzzy"});
	//	|	thinger.bar == "baz"; // delegated to foo
	//	|	foo.thud == undefined; // by definition
	//	|	thinger.thud == "xyzzy"; // mixed in from props
	//	|	foo.bar = "thonk";
	//	|	thinger.bar == "thonk"; // still delegated to foo's bar
}
=====*/

dojo.delegate = dojo._delegate = (function(){
	// boodman/crockford delegation w/ cornford optimization
	function TMP(){}
	return function(obj, props){
		TMP.prototype = obj;
		var tmp = new TMP();
		if(props){
			dojo._mixin(tmp, props);
		}
		return tmp; // Object
	}
})();

/*=====
dojo._toArray = function(obj, offset, startWith){
	//	summary:
	//		Converts an array-like object (i.e. arguments, DOMCollection) to an
	//		array. Returns a new Array with the elements of obj.
	//	obj: Object
	//		the object to "arrayify". We expect the object to have, at a
	//		minimum, a length property which corresponds to integer-indexed
	//		properties.
	//	offset: Number?
	//		the location in obj to start iterating from. Defaults to 0.
	//		Optional.
	//	startWith: Array?
	//		An array to pack with the properties of obj. If provided,
	//		properties in obj are appended at the end of startWith and
	//		startWith is the returned array.
}
=====*/

(function(){
	var efficient = function(obj, offset, startWith){
		return (startWith||[]).concat(Array.prototype.slice.call(obj, offset||0));
	};

		var slow = function(obj, offset, startWith){
		var arr = startWith||[]; 
		for(var x = offset || 0; x < obj.length; x++){ 
			arr.push(obj[x]); 
		} 
		return arr;
	};
	
	dojo._toArray = 
				dojo.isIE ?  function(obj){
			return ((obj.item) ? slow : efficient).apply(this, arguments);
		} : 
				efficient;

})();

dojo.partial = function(/*Function|String*/method /*, ...*/){
	//	summary:
	//		similar to hitch() except that the scope object is left to be
	//		whatever the execution context eventually becomes.
	//	description:
	//		Calling dojo.partial is the functional equivalent of calling:
	//		|	dojo.hitch(null, funcName, ...);
	var arr = [ null ];
	return dojo.hitch.apply(dojo, arr.concat(dojo._toArray(arguments))); // Function
}

dojo.clone = function(/*anything*/ o){
	// summary:
	//		Clones objects (including DOM nodes) and all children.
	//		Warning: do not clone cyclic structures.
	if(!o){ return o; }
	if(dojo.isArray(o)){
		var r = [];
		for(var i = 0; i < o.length; ++i){
			r.push(dojo.clone(o[i]));
		}
		return r; // Array
	}
	if(!dojo.isObject(o)){
		return o;	/*anything*/
	}
	if(o.nodeType && o.cloneNode){ // isNode
		return o.cloneNode(true); // Node
	}
	if(o instanceof Date){
		return new Date(o.getTime());	// Date
	}
	// Generic objects
	r = new o.constructor(); // specific to dojo.declare()'d classes!
	for(i in o){
		if(!(i in r) || r[i] != o[i]){
			r[i] = dojo.clone(o[i]);
		}
	}
	return r; // Object
}

/*=====
dojo.trim = function(str){
	//	summary:
	//		Trims whitespace from both sides of the string
	//	str: String
	//		String to be trimmed
	//	returns: String
	//		Returns the trimmed string
	//	description:
	//		This version of trim() was selected for inclusion into the base due
	//		to its compact size and relatively good performance
	//		(see [Steven Levithan's blog](http://blog.stevenlevithan.com/archives/faster-trim-javascript)
	//		Uses String.prototype.trim instead, if available.
	//		The fastest but longest version of this function is located at
	//		dojo.string.trim()
	return "";	// String
}
=====*/

dojo.trim = String.prototype.trim ?
	function(str){ return str.trim(); } :
	function(str){ return str.replace(/^\s\s*/, '').replace(/\s\s*$/, ''); };

}

if(!dojo._hasResource["dojo._base.declare"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo._base.declare"] = true;
dojo.provide("dojo._base.declare");


// this file courtesy of the TurboAjax Group, licensed under a Dojo CLA

dojo.declare = function(/*String*/ className, /*Function|Function[]*/ superclass, /*Object*/ props){
	//	summary: 
	//		Create a feature-rich constructor from compact notation
	//
	//	description:
	//		Create a feature-rich constructor from compact notation
	//
	//	className:
	//		The name of the constructor (loosely, a "class")
	//		stored in the "declaredClass" property in the created prototype
	//	superclass:
	//		May be null, a Function, or an Array of Functions. If an array, 
	//		the first element is used as the prototypical ancestor and
	//		any following Functions become mixin ancestors.
	//	props:
	//		An object whose properties are copied to the
	//		created prototype.
	//		Add an instance-initialization function by making it a property 
	//		named "constructor".
	//	description:
	//		Create a constructor using a compact notation for inheritance and
	//		prototype extension. 
	//
	//		All superclasses (including mixins) must be Functions (not simple Objects).
	//
	//		Mixin ancestors provide a type of multiple inheritance. Prototypes of mixin 
	//		ancestors are copied to the new class: changes to mixin prototypes will
	//		not affect classes to which they have been mixed in.
	//
	//		"className" is cached in "declaredClass" property of the new class.
	//
	//	example:
	//		Declare a class with no ancestors.
	//	|	dojo.declare("my.ClassyThing", null, {
	//	|		aProperty:"string",
	//	|		constructor: function(args){
	//	|			dojo.mixin(this, args);	
	//	|		}
	//	|	});
	//
	//	example:
	//		Declare a class inheriting from my.classed.Foo
	//	|	dojo.declare("my.classes.Bar", my.classes.Foo, {
	//	|		// properties to be added to the class prototype
	//	|		someValue: 2,
	//	|		// initialization function
	//	|		constructor: function(){
	//	|			this.myComplicatedObject = new ReallyComplicatedObject(); 
	//	|		},
	//	|		// other functions
	//	|		someMethod: function(){ 
	//	|			doStuff(); 
	//	|		}
	//	|	);
	//
	//	example:
	//		Declare a class inherting from two mixins, handling multiple constructor args
	//	|	dojo.declare("my.ComplexMix", [my.BaseClass, my.MixedClass],{
	//	|		constructor: function(a, b){
	//	|			// someone called `new my.ComplexMix("something", "maybesomething");`
	//	|		}
	//	|	});

	// process superclass argument
	var dd = arguments.callee, mixins;
	if(dojo.isArray(superclass)){
		mixins = superclass;
		superclass = mixins.shift();
	}
	// construct intermediate classes for mixins
	if(mixins){
		dojo.forEach(mixins, function(m, i){
			if(!m){ throw(className + ": mixin #" + i + " is null"); } // It's likely a required module is not loaded
			superclass = dd._delegate(superclass, m);
		});
	}
	// create constructor
	var ctor = dd._delegate(superclass);
	// extend with "props"
	props = props || {};
	ctor.extend(props);
	// more prototype decoration
	dojo.extend(ctor, { declaredClass: className, _constructor: props.constructor/*, preamble: null*/ });
	// special help for IE
	ctor.prototype.constructor = ctor;
	// create named reference
	return dojo.setObject(className, ctor); // Function
};

dojo.mixin(dojo.declare, {
	_delegate: function(base, mixin){
		var bp = (base || 0).prototype, mp = (mixin || 0).prototype, dd = dojo.declare;
		// fresh constructor, fresh prototype
		var ctor = dd._makeCtor();
		// cache ancestry
		dojo.mixin(ctor, { superclass: bp, mixin: mp, extend: dd._extend });
		// chain prototypes
		if(base){ ctor.prototype = dojo._delegate(bp); }
		// add mixin and core
		dojo.extend(ctor, dd._core, mp || 0, { _constructor: null, preamble: null });
		// special help for IE
		ctor.prototype.constructor = ctor;
		// name this class for debugging
		ctor.prototype.declaredClass = (bp || 0).declaredClass + '_' + (mp || 0).declaredClass;
		return ctor;
	},
	_extend: function(props){
		var i, fn;
		for(i in props){ if(dojo.isFunction(fn=props[i]) && !0[i]){fn.nom=i;fn.ctor=this;} }
		dojo.extend(this, props);
	},
	_makeCtor: function(){
		// we have to make a function, but don't want to close over anything
		return function(){ this._construct(arguments); };
	},
	_core: { 
		_construct: function(args){
			var c = args.callee, s = c.superclass, ct = s && s.constructor, 
				m = c.mixin, mct = m && m.constructor, a = args, ii, fn;
			// side-effect of = used on purpose here, lint may complain, don't try this at home
			if(a[0]){ 
				// FIXME: preambles for each mixin should be allowed
				// FIXME: 
				//		should we allow the preamble here NOT to modify the
				//		default args, but instead to act on each mixin
				//		independently of the class instance being constructed
				//		(for impedence matching)?

				// allow any first argument w/ a "preamble" property to act as a
				// class preamble (not exclusive of the prototype preamble)
				if(/*dojo.isFunction*/((fn = a[0].preamble))){ 
					a = fn.apply(this, a) || a; 
				}
			} 
			// prototype preamble
			if((fn = c.prototype.preamble)){ a = fn.apply(this, a) || a; }
			// FIXME: 
			//		need to provide an optional prototype-settable
			//		"_explicitSuper" property which disables this
			// initialize superclass
			if(ct && ct.apply){ ct.apply(this, a); }
			// initialize mixin
			if(mct && mct.apply){ mct.apply(this, a); }
			// initialize self
			if((ii = c.prototype._constructor)){ ii.apply(this, args); }
			// post construction
			if(this.constructor.prototype == c.prototype && (ct = this.postscript)){ ct.apply(this, args); }
		},
		_findMixin: function(mixin){
			var c = this.constructor, p, m;
			while(c){
				p = c.superclass;
				m = c.mixin;
				if(m == mixin || (m instanceof mixin.constructor)){ return p; }
				if(m && m._findMixin && (m = m._findMixin(mixin))){ return m; }
				c = p && p.constructor;
			}
		},
		_findMethod: function(name, method, ptype, has){
			// consciously trading readability for bytes and speed in this low-level method
			var p=ptype, c, m, f;
			do{
				c = p.constructor;
				m = c.mixin;
				// find method by name in our mixin ancestor
				if(m && (m = this._findMethod(name, method, m, has))){ return m; }
				// if we found a named method that either exactly-is or exactly-is-not 'method'
				if((f = p[name]) && (has == (f == method))){ return p; }
				// ascend chain
				p = c.superclass;
			}while(p);
			// if we couldn't find an ancestor in our primary chain, try a mixin chain
			return !has && (p = this._findMixin(ptype)) && this._findMethod(name, method, p, has);
		},
		inherited: function(name, args, newArgs){
			// summary: 
			//		Call an inherited member function of this declared class.
			//
			// description:
			//		Call an inherited member function of this declared class, allowing advanced
			//		manipulation of passed arguments to inherited functions.
			//		Explicitly cannot handle the case of intending to pass no `newArgs`, though
			//		hoping the use in conjuction with `dojo.hitch`. Calling an inherited 
			//		function directly via hitch() is not supported.
			//
			// name: String? 
			//		The name of the method to call. If omitted, the special `arguments` passed is
			//		used to determine the inherited function. All subsequent positional arguments
			//		are shifted left if `name` has been omitted. (eg: args becomes name)
			//
			// args: Object
			//		An `arguments` object to pass along to the inherited function. Can be in the
			//		`name` position if `name` has been omitted. This is a literal JavaScript `arguments`
			//		object, and must be passed.
			//
			// newArgs: Array?
			//		An Array of argument values to pass to the inherited function. If omitted, 
			//		the original arguments are passed (determined from the `args` variable)
			// 
			// example:
			//		Simply call an inherited function with the same signature.
			//	|	this.inherited(arguments);
			// example:
			//		Call an inherited method, replacing the arguments passed with "replacement" and "args"
			//	|	this.inherited(arguments, [replacement, args]);
			// example:
			//		Call an inherited method, passing an explicit name.
			//	|	this.inherited("method", arguments);
			// example:
			//		Call an inherited method by name, replacing the arguments:
			//	|	this.inherited("method", arguments, [replacement, args]);

			var a = arguments;
			// some magic crap that alters `arguments` to shift in the case of missing `name`
			if(!dojo.isString(a[0])){ newArgs = args; args = name; name = args.callee.nom; }
			a = newArgs || args; // WARNING: hitch()ed functions may pass a newArgs you aren't expecting.
			var c = args.callee, p = this.constructor.prototype, fn, mp;
			// if not an instance override
			if(this[name] != c || p[name] == c){
				// start from memoized prototype, or
				// find a prototype that has property 'name' == 'c'
				mp = (c.ctor || 0).superclass || this._findMethod(name, c, p, true);
				if(!mp){ throw(this.declaredClass + ': inherited method "' + name + '" mismatch'); }
				// find a prototype that has property 'name' != 'c'
				p = this._findMethod(name, c, mp, false);
			}
			// we expect 'name' to be in prototype 'p'
			fn = p && p[name];
			if(!fn){ throw( mp.declaredClass + ': inherited method "' + name + '" not found'); }
			// if the function exists, invoke it in our scope
			return fn.apply(this, a);
		}
	}
});

}

if(!dojo._hasResource["dojo._base.connect"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo._base.connect"] = true;
dojo.provide("dojo._base.connect");


// this file courtesy of the TurboAjax Group, licensed under a Dojo CLA

// low-level delegation machinery
dojo._listener = {
	// create a dispatcher function
	getDispatcher: function(){
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
			var lls;
											lls = [].concat(ls);
							
			// invoke listeners after target function
			for(var i in lls){
				if(!(i in ap)){
					lls[i].apply(this, arguments);
				}
			}
			// return value comes from original target function
			return r;
		}
	},
	// add a listener to an object
	add: function(/*Object*/ source, /*String*/ method, /*Function*/ listener){
		// Whenever 'method' is invoked, 'listener' will have the same scope.
		// Trying to supporting a context object for the listener led to 
		// complexity. 
		// Non trivial to provide 'once' functionality here
		// because listener could be the result of a dojo.hitch call,
		// in which case two references to the same hitch target would not
		// be equivalent. 
		source = source || dojo.global;
		// The source method is either null, a dispatcher, or some other function
		var f = source[method];
		// Ensure a dispatcher
		if(!f||!f._listeners){
			var d = dojo._listener.getDispatcher();
			// original target function is special
			d.target = f;
			// dispatcher holds a list of listeners
			d._listeners = []; 
			// redirect source to dispatcher
			f = source[method] = d;
		}
		// The contract is that a handle is returned that can 
		// identify this listener for disconnect. 
		//
		// The type of the handle is private. Here is it implemented as Integer. 
		// DOM event code has this same contract but handle is Function 
		// in non-IE browsers.
		//
		// We could have separate lists of before and after listeners.
		return f._listeners.push(listener) ; /*Handle*/
	},
	// remove a listener from an object
	remove: function(/*Object*/ source, /*String*/ method, /*Handle*/ handle){
		var f = (source||dojo.global)[method];
		// remember that handle is the index+1 (0 is not a valid handle)
		if(f && f._listeners && handle--){
			delete f._listeners[handle];
		}
	}
};

// Multiple delegation for arbitrary methods.

// This unit knows nothing about DOM, 
// but we include DOM aware 
// documentation and dontFix
// argument here to help the autodocs.
// Actual DOM aware code is in event.js.

dojo.connect = function(/*Object|null*/ obj, 
						/*String*/ event, 
						/*Object|null*/ context, 
						/*String|Function*/ method,
						/*Boolean*/ dontFix){
	// summary:
	//		Create a link that calls one function when another executes. 
	//
	// description:
	//		Connects method to event, so that after event fires, method
	//		does too. All connected functions are passed the same arguments as
	//		the event function was initially called with. You may connect as
	//		many methods to event as needed.
	//
	//		event must be a string. If obj is null, dojo.global is used.
	//
	//		null arguments may simply be omitted.
	//
	//		obj[event] can resolve to a function or undefined (null). 
	//		If obj[event] is null, it is assigned a function.
	//
	//		The return value is a handle that is needed to 
	//		remove this connection with dojo.disconnect.
	//
	// obj: 
	//		The source object for the event function. 
	//		Defaults to dojo.global if null.
	//		If obj is a DOM node, the connection is delegated 
	//		to the DOM event manager (unless dontFix is true).
	//
	// event:
	//		String name of the event function in obj. 
	//		I.e. identifies a property obj[event].
	//
	// context: 
	//		The object that method will receive as "this".
	//
	//		If context is null and method is a function, then method
	//		inherits the context of event.
	//	
	//		If method is a string then context must be the source 
	//		object object for method (context[method]). If context is null,
	//		dojo.global is used.
	//
	// method:
	//		A function reference, or name of a function in context. 
	//		The function identified by method fires after event does. 
	//		method receives the same arguments as the event.
	//		See context argument comments for information on method's scope.
	//
	// dontFix:
	//		If obj is a DOM node, set dontFix to true to prevent delegation 
	//		of this connection to the DOM event manager. 
	//
	// example:
	//		When obj.onchange(), do ui.update():
	//	|	dojo.connect(obj, "onchange", ui, "update");
	//	|	dojo.connect(obj, "onchange", ui, ui.update); // same
	//
	// example:
	//		Using return value for disconnect:
	//	|	var link = dojo.connect(obj, "onchange", ui, "update");
	//	|	...
	//	|	dojo.disconnect(link);
	//
	// example:
	//		When onglobalevent executes, watcher.handler is invoked:
	//	|	dojo.connect(null, "onglobalevent", watcher, "handler");
	//
	// example:
	//		When ob.onCustomEvent executes, customEventHandler is invoked:
	//	|	dojo.connect(ob, "onCustomEvent", null, "customEventHandler");
	//	|	dojo.connect(ob, "onCustomEvent", "customEventHandler"); // same
	//
	// example:
	//		When ob.onCustomEvent executes, customEventHandler is invoked
	//		with the same scope (this):
	//	|	dojo.connect(ob, "onCustomEvent", null, customEventHandler);
	//	|	dojo.connect(ob, "onCustomEvent", customEventHandler); // same
	//
	// example:
	//		When globalEvent executes, globalHandler is invoked
	//		with the same scope (this):
	//	|	dojo.connect(null, "globalEvent", null, globalHandler);
	//	|	dojo.connect("globalEvent", globalHandler); // same

	// normalize arguments
	var a=arguments, args=[], i=0;
	// if a[0] is a String, obj was ommited
	args.push(dojo.isString(a[0]) ? null : a[i++], a[i++]);
	// if the arg-after-next is a String or Function, context was NOT omitted
	var a1 = a[i+1];
	args.push(dojo.isString(a1)||dojo.isFunction(a1) ? a[i++] : null, a[i++]);
	// absorb any additional arguments
	for(var l=a.length; i<l; i++){	args.push(a[i]); }
	// do the actual work
	return dojo._connect.apply(this, args); /*Handle*/
}

// used by non-browser hostenvs. always overriden by event.js
dojo._connect = function(obj, event, context, method){
	var l=dojo._listener, h=l.add(obj, event, dojo.hitch(context, method)); 
	return [obj, event, h, l]; // Handle
}

dojo.disconnect = function(/*Handle*/ handle){
	// summary:
	//		Remove a link created by dojo.connect.
	// description:
	//		Removes the connection between event and the method referenced by handle.
	// handle:
	//		the return value of the dojo.connect call that created the connection.
	if(handle && handle[0] !== undefined){
		dojo._disconnect.apply(this, handle);
		// let's not keep this reference
		delete handle[0];
	}
}

dojo._disconnect = function(obj, event, handle, listener){
	listener.remove(obj, event, handle);
}

// topic publish/subscribe

dojo._topics = {};

dojo.subscribe = function(/*String*/ topic, /*Object|null*/ context, /*String|Function*/ method){
	//	summary:
	//		Attach a listener to a named topic. The listener function is invoked whenever the
	//		named topic is published (see: dojo.publish).
	//		Returns a handle which is needed to unsubscribe this listener.
	//	context:
	//		Scope in which method will be invoked, or null for default scope.
	//	method:
	//		The name of a function in context, or a function reference. This is the function that
	//		is invoked when topic is published.
	//	example:
	//	|	dojo.subscribe("alerts", null, function(caption, message){ alert(caption + "\n" + message); });
	//	|	dojo.publish("alerts", [ "read this", "hello world" ]);																	

	// support for 2 argument invocation (omitting context) depends on hitch
	return [topic, dojo._listener.add(dojo._topics, topic, dojo.hitch(context, method))]; /*Handle*/
}

dojo.unsubscribe = function(/*Handle*/ handle){
	//	summary:
	//	 	Remove a topic listener. 
	//	handle:
	//	 	The handle returned from a call to subscribe.
	//	example:
	//	|	var alerter = dojo.subscribe("alerts", null, function(caption, message){ alert(caption + "\n" + message); };
	//	|	...
	//	|	dojo.unsubscribe(alerter);
	if(handle){
		dojo._listener.remove(dojo._topics, handle[0], handle[1]);
	}
}

dojo.publish = function(/*String*/ topic, /*Array*/ args){
	//	summary:
	//	 	Invoke all listener method subscribed to topic.
	//	topic:
	//	 	The name of the topic to publish.
	//	args:
	//	 	An array of arguments. The arguments will be applied 
	//	 	to each topic subscriber (as first class parameters, via apply).
	//	example:
	//	|	dojo.subscribe("alerts", null, function(caption, message){ alert(caption + "\n" + message); };
	//	|	dojo.publish("alerts", [ "read this", "hello world" ]);	

	// Note that args is an array, which is more efficient vs variable length
	// argument list.  Ideally, var args would be implemented via Array
	// throughout the APIs.
	var f = dojo._topics[topic];
	if(f){
		f.apply(this, args||[]);
	}
}

dojo.connectPublisher = function(	/*String*/ topic, 
									/*Object|null*/ obj, 
									/*String*/ event){
	//	summary:
	//	 	Ensure that everytime obj.event() is called, a message is published
	//	 	on the topic. Returns a handle which can be passed to
	//	 	dojo.disconnect() to disable subsequent automatic publication on
	//	 	the topic.
	//	topic:
	//	 	The name of the topic to publish.
	//	obj: 
	//	 	The source object for the event function. Defaults to dojo.global
	//	 	if null.
	//	event:
	//	 	The name of the event function in obj. 
	//	 	I.e. identifies a property obj[event].
	//	example:
	//	|	dojo.connectPublisher("/ajax/start", dojo, "xhrGet");
	var pf = function(){ dojo.publish(topic, arguments); }
	return (event) ? dojo.connect(obj, event, pf) : dojo.connect(obj, pf); //Handle
};

}

if(!dojo._hasResource["dojo._base.Deferred"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo._base.Deferred"] = true;
dojo.provide("dojo._base.Deferred");


dojo.Deferred = function(/*Function?*/ canceller){
	// summary:
	//		Encapsulates a sequence of callbacks in response to a value that
	//		may not yet be available.  This is modeled after the Deferred class
	//		from Twisted <http://twistedmatrix.com>.
	// description:
	//		JavaScript has no threads, and even if it did, threads are hard.
	//		Deferreds are a way of abstracting non-blocking events, such as the
	//		final response to an XMLHttpRequest. Deferreds create a promise to
	//		return a response a some point in the future and an easy way to
	//		register your interest in receiving that response.
	//
	//		The most important methods for Deffered users are:
	//
	//			* addCallback(handler)
	//			* addErrback(handler)
	//			* callback(result)
	//			* errback(result)
	//
	//		In general, when a function returns a Deferred, users then "fill
	//		in" the second half of the contract by registering callbacks and
	//		error handlers. You may register as many callback and errback
	//		handlers as you like and they will be executed in the order
	//		registered when a result is provided. Usually this result is
	//		provided as the result of an asynchronous operation. The code
	//		"managing" the Deferred (the code that made the promise to provide
	//		an answer later) will use the callback() and errback() methods to
	//		communicate with registered listeners about the result of the
	//		operation. At this time, all registered result handlers are called
	//		*with the most recent result value*.
	//
	//		Deferred callback handlers are treated as a chain, and each item in
	//		the chain is required to return a value that will be fed into
	//		successive handlers. The most minimal callback may be registered
	//		like this:
	//
	//		|	var d = new dojo.Deferred();
	//		|	d.addCallback(function(result){ return result; });
	//
	//		Perhaps the most common mistake when first using Deferreds is to
	//		forget to return a value (in most cases, the value you were
	//		passed).
	//
	//		The sequence of callbacks is internally represented as a list of
	//		2-tuples containing the callback/errback pair.  For example, the
	//		following call sequence:
	//		
	//		|	var d = new dojo.Deferred();
	//		|	d.addCallback(myCallback);
	//		|	d.addErrback(myErrback);
	//		|	d.addBoth(myBoth);
	//		|	d.addCallbacks(myCallback, myErrback);
	//
	//		is translated into a Deferred with the following internal
	//		representation:
	//
	//		|	[
	//		|		[myCallback, null],
	//		|		[null, myErrback],
	//		|		[myBoth, myBoth],
	//		|		[myCallback, myErrback]
	//		|	]
	//
	//		The Deferred also keeps track of its current status (fired).  Its
	//		status may be one of three things:
	//
	//			* -1: no value yet (initial condition)
	//			* 0: success
	//			* 1: error
	//	
	//		A Deferred will be in the error state if one of the following three
	//		conditions are met:
	//
	//			1. The result given to callback or errback is "instanceof" Error
	//			2. The previous callback or errback raised an exception while
	//			   executing
	//			3. The previous callback or errback returned a value
	//			   "instanceof" Error
	//
	//		Otherwise, the Deferred will be in the success state. The state of
	//		the Deferred determines the next element in the callback sequence
	//		to run.
	//
	//		When a callback or errback occurs with the example deferred chain,
	//		something equivalent to the following will happen (imagine
	//		that exceptions are caught and returned):
	//
	//		|	// d.callback(result) or d.errback(result)
	//		|	if(!(result instanceof Error)){
	//		|		result = myCallback(result);
	//		|	}
	//		|	if(result instanceof Error){
	//		|		result = myErrback(result);
	//		|	}
	//		|	result = myBoth(result);
	//		|	if(result instanceof Error){
	//		|		result = myErrback(result);
	//		|	}else{
	//		|		result = myCallback(result);
	//		|	}
	//
	//		The result is then stored away in case another step is added to the
	//		callback sequence.	Since the Deferred already has a value
	//		available, any new callbacks added will be called immediately.
	//
	//		There are two other "advanced" details about this implementation
	//		that are useful:
	//
	//		Callbacks are allowed to return Deferred instances themselves, so
	//		you can build complicated sequences of events with ease.
	//
	//		The creator of the Deferred may specify a canceller.  The canceller
	//		is a function that will be called if Deferred.cancel is called
	//		before the Deferred fires. You can use this to implement clean
	//		aborting of an XMLHttpRequest, etc. Note that cancel will fire the
	//		deferred with a CancelledError (unless your canceller returns
	//		another kind of error), so the errbacks should be prepared to
	//		handle that error for cancellable Deferreds.
	// example:
	//	|	var deferred = new dojo.Deferred();
	//	|	setTimeout(function(){ deferred.callback({success: true}); }, 1000);
	//	|	return deferred;
	// example:
	//		Deferred objects are often used when making code asynchronous. It
	//		may be easiest to write functions in a synchronous manner and then
	//		split code using a deferred to trigger a response to a long-lived
	//		operation. For example, instead of register a callback function to
	//		denote when a rendering operation completes, the function can
	//		simply return a deferred:
	//
	//		|	// callback style:
	//		|	function renderLotsOfData(data, callback){
	//		|		var success = false
	//		|		try{
	//		|			for(var x in data){
	//		|				renderDataitem(data[x]);
	//		|			}
	//		|			success = true;
	//		|		}catch(e){ }
	//		|		if(callback){
	//		|			callback(success);
	//		|		}
	//		|	}
	//
	//		|	// using callback style
	//		|	renderLotsOfData(someDataObj, function(success){
	//		|		// handles success or failure
	//		|		if(!success){
	//		|			promptUserToRecover();
	//		|		}
	//		|	});
	//		|	// NOTE: no way to add another callback here!!
	// example:
	//		Using a Deferred doesn't simplify the sending code any, but it
	//		provides a standard interface for callers and senders alike,
	//		providing both with a simple way to service multiple callbacks for
	//		an operation and freeing both sides from worrying about details
	//		such as "did this get called already?". With Deferreds, new
	//		callbacks can be added at any time.
	//
	//		|	// Deferred style:
	//		|	function renderLotsOfData(data){
	//		|		var d = new dojo.Deferred();
	//		|		try{
	//		|			for(var x in data){
	//		|				renderDataitem(data[x]);
	//		|			}
	//		|			d.callback(true);
	//		|		}catch(e){ 
	//		|			d.errback(new Error("rendering failed"));
	//		|		}
	//		|		return d;
	//		|	}
	//
	//		|	// using Deferred style
	//		|	renderLotsOfData(someDataObj).addErrback(function(){
	//		|		promptUserToRecover();
	//		|	});
	//		|	// NOTE: addErrback and addCallback both return the Deferred
	//		|	// again, so we could chain adding callbacks or save the
	//		|	// deferred for later should we need to be notified again.
	// example:
	//		In this example, renderLotsOfData is syncrhonous and so both
	//		versions are pretty artificial. Putting the data display on a
	//		timeout helps show why Deferreds rock:
	//
	//		|	// Deferred style and async func
	//		|	function renderLotsOfData(data){
	//		|		var d = new dojo.Deferred();
	//		|		setTimeout(function(){
	//		|			try{
	//		|				for(var x in data){
	//		|					renderDataitem(data[x]);
	//		|				}
	//		|				d.callback(true);
	//		|			}catch(e){ 
	//		|				d.errback(new Error("rendering failed"));
	//		|			}
	//		|		}, 100);
	//		|		return d;
	//		|	}
	//
	//		|	// using Deferred style
	//		|	renderLotsOfData(someDataObj).addErrback(function(){
	//		|		promptUserToRecover();
	//		|	});
	//
	//		Note that the caller doesn't have to change his code at all to
	//		handle the asynchronous case.

	this.chain = [];
	this.id = this._nextId();
	this.fired = -1;
	this.paused = 0;
	this.results = [null, null];
	this.canceller = canceller;
	this.silentlyCancelled = false;
};

dojo.extend(dojo.Deferred, {
	/*
	makeCalled: function(){
		// summary:
		//		returns a new, empty deferred, which is already in the called
		//		state. Calling callback() or errback() on this deferred will
		//		yeild an error and adding new handlers to it will result in
		//		them being called immediately.
		var deferred = new dojo.Deferred();
		deferred.callback();
		return deferred;
	},

	toString: function(){
		var state;
		if(this.fired == -1){
			state = 'unfired';
		}else{
			state = this.fired ? 'success' : 'error';
		}
		return 'Deferred(' + this.id + ', ' + state + ')';
	},
	*/

	_nextId: (function(){
		var n = 1;
		return function(){ return n++; };
	})(),

	cancel: function(){
		// summary:	
		//		Cancels a Deferred that has not yet received a value, or is
		//		waiting on another Deferred as its value.
		// description:
		//		If a canceller is defined, the canceller is called. If the
		//		canceller did not return an error, or there was no canceller,
		//		then the errback chain is started.
		var err;
		if(this.fired == -1){
			if(this.canceller){
				err = this.canceller(this);
			}else{
				this.silentlyCancelled = true;
			}
			if(this.fired == -1){
				if(!(err instanceof Error)){
					var res = err;
					var msg = "Deferred Cancelled";
					if(err && err.toString){
						msg += ": " + err.toString();
					}
					err = new Error(msg);
					err.dojoType = "cancel";
					err.cancelResult = res;
				}
				this.errback(err);
			}
		}else if(	(this.fired == 0) &&
					(this.results[0] instanceof dojo.Deferred)
		){
			this.results[0].cancel();
		}
	},
			

	_resback: function(res){
		// summary:
		//		The private primitive that means either callback or errback
		this.fired = ((res instanceof Error) ? 1 : 0);
		this.results[this.fired] = res;
		this._fire();
	},

	_check: function(){
		if(this.fired != -1){
			if(!this.silentlyCancelled){
				throw new Error("already called!");
			}
			this.silentlyCancelled = false;
			return;
		}
	},

	callback: function(res){
		//	summary:	
		//		Begin the callback sequence with a non-error value.
		
		/*
		callback or errback should only be called once on a given
		Deferred.
		*/
		this._check();
		this._resback(res);
	},

	errback: function(/*Error*/res){
		//	summary: 
		//		Begin the callback sequence with an error result.
		this._check();
		if(!(res instanceof Error)){
			res = new Error(res);
		}
		this._resback(res);
	},

	addBoth: function(/*Function|Object*/cb, /*String?*/cbfn){
		//	summary:
		//		Add the same function as both a callback and an errback as the
		//		next element on the callback sequence.This is useful for code
		//		that you want to guarantee to run, e.g. a finalizer.
		var enclosed = dojo.hitch.apply(dojo, arguments);
		return this.addCallbacks(enclosed, enclosed); // dojo.Deferred
	},

	addCallback: function(/*Function|Object*/cb, /*String?*/cbfn /*...*/){
		//	summary: 
		//		Add a single callback to the end of the callback sequence.
		return this.addCallbacks(dojo.hitch.apply(dojo, arguments)); // dojo.Deferred
	},

	addErrback: function(cb, cbfn){
		//	summary: 
		//		Add a single callback to the end of the callback sequence.
		return this.addCallbacks(null, dojo.hitch.apply(dojo, arguments)); // dojo.Deferred
	},

	addCallbacks: function(cb, eb){
		// summary: 
		//		Add separate callback and errback to the end of the callback
		//		sequence.
		this.chain.push([cb, eb])
		if(this.fired >= 0){
			this._fire();
		}
		return this; // dojo.Deferred
	},

	_fire: function(){
		// summary: 
		//		Used internally to exhaust the callback sequence when a result
		//		is available.
		var chain = this.chain;
		var fired = this.fired;
		var res = this.results[fired];
		var self = this;
		var cb = null;
		while(
			(chain.length > 0) &&
			(this.paused == 0)
		){
			// Array
			var f = chain.shift()[fired];
			if(!f){ continue; }
			var func = function(){
				var ret = f(res);
				//If no response, then use previous response.
				if(typeof ret != "undefined"){
					res = ret;
				}
				fired = ((res instanceof Error) ? 1 : 0);
				if(res instanceof dojo.Deferred){
					cb = function(res){
						self._resback(res);
						// inlined from _pause()
						self.paused--;
						if(
							(self.paused == 0) && 
							(self.fired >= 0)
						){
							self._fire();
						}
					}
					// inlined from _unpause
					this.paused++;
				}
			};
			if(dojo.config.debugAtAllCosts){
				func.call(this);
			}else{
				try{
					func.call(this);
				}catch(err){
					fired = 1;
					res = err;
				}
			}
		}
		this.fired = fired;
		this.results[fired] = res;
		if((cb)&&(this.paused)){
			// this is for "tail recursion" in case the dependent
			// deferred is already fired
			res.addBoth(cb);
		}
	}
});

}

if(!dojo._hasResource["dojo._base.json"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo._base.json"] = true;
dojo.provide("dojo._base.json");

dojo.fromJson = function(/*String*/ json){
	// summary:
	// 		Parses a [JSON](http://json.org) string to return a JavaScript object.  Throws for invalid JSON strings.
	// json: 
	//		a string literal of a JSON item, for instance:
	//			`'{ "foo": [ "bar", 1, { "baz": "thud" } ] }'`

	return eval("(" + json + ")"); // Object
}

dojo._escapeString = function(/*String*/str){
	//summary:
	//		Adds escape sequences for non-visual characters, double quote and
	//		backslash and surrounds with double quotes to form a valid string
	//		literal.
	return ('"' + str.replace(/(["\\])/g, '\\$1') + '"').
		replace(/[\f]/g, "\\f").replace(/[\b]/g, "\\b").replace(/[\n]/g, "\\n").
		replace(/[\t]/g, "\\t").replace(/[\r]/g, "\\r"); // string
}

dojo.toJsonIndentStr = "\t";
dojo.toJson = function(/*Object*/ it, /*Boolean?*/ prettyPrint, /*String?*/ _indentStr){
	// summary:
	//		Returns a [JSON](http://json.org) serialization of an object.
	//
	// description:
	//		Returns a [JSON](http://json.org) serialization of an object.
	//		Note that this doesn't check for infinite recursion, so don't do that!
	//
	// it:
	//		an object to be serialized. Objects may define their own
	//		serialization via a special "__json__" or "json" function
	//		property. If a specialized serializer has been defined, it will
	//		be used as a fallback.
	//
	// prettyPrint:
	//		if true, we indent objects and arrays to make the output prettier.
	//		The variable dojo.toJsonIndentStr is used as the indent string 
	//		-- to use something other than the default (tab), 
	//		change that variable before calling dojo.toJson().
	//
	// _indentStr:
	//		private variable for recursive calls when pretty printing, do not use.

	if(it === undefined){
		return "undefined";
	}
	var objtype = typeof it;
	if(objtype == "number" || objtype == "boolean"){
		return it + "";
	}
	if(it === null){
		return "null";
	}
	if(dojo.isString(it)){ 
		return dojo._escapeString(it); 
	}
	// recurse
	var recurse = arguments.callee;
	// short-circuit for objects that support "json" serialization
	// if they return "self" then just pass-through...
	var newObj;
	_indentStr = _indentStr || "";
	var nextIndent = prettyPrint ? _indentStr + dojo.toJsonIndentStr : "";
	var tf = it.__json__||it.json;
	if(dojo.isFunction(tf)){
		newObj = tf.call(it);
		if(it !== newObj){
			return recurse(newObj, prettyPrint, nextIndent);
		}
	}
	if(it.nodeType && it.cloneNode){ // isNode
		// we can't seriailize DOM nodes as regular objects because they have cycles
		// DOM nodes could be serialized with something like outerHTML, but
		// that can be provided by users in the form of .json or .__json__ function.
		throw new Error("Can't serialize DOM nodes");
	}

	var sep = prettyPrint ? " " : "";
	var newLine = prettyPrint ? "\n" : "";

	// array
	if(dojo.isArray(it)){
		var res = dojo.map(it, function(obj){
			var val = recurse(obj, prettyPrint, nextIndent);
			if(typeof val != "string"){
				val = "undefined";
			}
			return newLine + nextIndent + val;
		});
		return "[" + res.join("," + sep) + newLine + _indentStr + "]";
	}
	/*
	// look in the registry
	try {
		window.o = it;
		newObj = dojo.json.jsonRegistry.match(it);
		return recurse(newObj, prettyPrint, nextIndent);
	}catch(e){
		// console.log(e);
	}
	// it's a function with no adapter, skip it
	*/
	if(objtype == "function"){
		return null; // null
	}
	// generic object code path
	var output = [], key;
	for(key in it){
		var keyStr, val;
		if(typeof key == "number"){
			keyStr = '"' + key + '"';
		}else if(typeof key == "string"){
			keyStr = dojo._escapeString(key);
		}else{
			// skip non-string or number keys
			continue;
		}
		val = recurse(it[key], prettyPrint, nextIndent);
		if(typeof val != "string"){
			// skip non-serializable values
			continue;
		}
		// FIXME: use += on Moz!!
		//	 MOW NOTE: using += is a pain because you have to account for the dangling comma...
		output.push(newLine + nextIndent + keyStr + ":" + sep + val);
	}
	return "{" + output.join("," + sep) + newLine + _indentStr + "}"; // String
}

}

if(!dojo._hasResource["dojo._base.array"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo._base.array"] = true;

dojo.provide("dojo._base.array");

(function(){
	var _getParts = function(arr, obj, cb){
		return [ 
			dojo.isString(arr) ? arr.split("") : arr, 
			obj || dojo.global,
			// FIXME: cache the anonymous functions we create here?
			dojo.isString(cb) ? new Function("item", "index", "array", cb) : cb
		];
	};

	dojo.mixin(dojo, {
		indexOf: function(	/*Array*/		array, 
							/*Object*/		value,
							/*Integer?*/	fromIndex,
							/*Boolean?*/	findLast){
			// summary:
			//		locates the first index of the provided value in the
			//		passed array. If the value is not found, -1 is returned.
			// description:
			//		For details on this method, see:
			// 			http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Array:indexOf

			var step = 1, end = array.length || 0, i = 0;
			if(findLast){
				i = end - 1;
				step = end = -1;
			}
			if(fromIndex != undefined){ i = fromIndex; }
			if((findLast && i > end) || i < end){
				for(; i != end; i += step){
					if(array[i] == value){ return i; }
				}
			}
			return -1;	// Number
		},

		lastIndexOf: function(/*Array*/array, /*Object*/value, /*Integer?*/fromIndex){
			// summary:
			//		locates the last index of the provided value in the passed
			//		array. If the value is not found, -1 is returned.
			// description:
			//		For details on this method, see:
			// 			http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Array:lastIndexOf
			return dojo.indexOf(array, value, fromIndex, true); // Number
		},

		forEach: function(/*Array|String*/arr, /*Function|String*/callback, /*Object?*/thisObject){
			//	summary:
			//		for every item in arr, callback is invoked. Return values are ignored.
			//	arr:
			//		the array to iterate over. If a string, operates on individual characters.
			//	callback:
			//		a function is invoked with three arguments: item, index, and array
			//	thisObject:
			//		may be used to scope the call to callback
			//	description:
			//		This function corresponds to the JavaScript 1.6
			//		Array.forEach() method. For more details, see:
			//			http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Array:forEach
			//	example:
			//	|	// log out all members of the array:
			//	|	dojo.forEach(
			//	|		[ "thinger", "blah", "howdy", 10 ],
			//	|		function(item){
			//	|			console.log(item);
			//	|		}
			//	|	);
			//	example:
			//	|	// log out the members and their indexes
			//	|	dojo.forEach(
			//	|		[ "thinger", "blah", "howdy", 10 ],
			//	|		function(item, idx, arr){
			//	|			console.log(item, "at index:", idx);
			//	|		}
			//	|	);
			//	example:
			//	|	// use a scoped object member as the callback
			//	|	
			//	|	var obj = {
			//	|		prefix: "logged via obj.callback:", 
			//	|		callback: function(item){
			//	|			console.log(this.prefix, item);
			//	|		}
			//	|	};
			//	|	
			//	|	// specifying the scope function executes the callback in that scope
			//	|	dojo.forEach(
			//	|		[ "thinger", "blah", "howdy", 10 ],
			//	|		obj.callback,
			//	|		obj
			//	|	);
			//	|	
			//	|	// alternately, we can accomplish the same thing with dojo.hitch()
			//	|	dojo.forEach(
			//	|		[ "thinger", "blah", "howdy", 10 ],
			//	|		dojo.hitch(obj, "callback")
			//	|	);

			// match the behavior of the built-in forEach WRT empty arrs
			if(!arr || !arr.length){ return; }

			// FIXME: there are several ways of handilng thisObject. Is
			// dojo.global always the default context?
			var _p = _getParts(arr, thisObject, callback); arr = _p[0];
			for(var i=0,l=arr.length; i<l; ++i){ 
				_p[2].call(_p[1], arr[i], i, arr);
			}
		},

		_everyOrSome: function(/*Boolean*/every, /*Array|String*/arr, /*Function|String*/callback, /*Object?*/thisObject){
			var _p = _getParts(arr, thisObject, callback); arr = _p[0];
			for(var i=0,l=arr.length; i<l; ++i){
				var result = !!_p[2].call(_p[1], arr[i], i, arr);
				if(every ^ result){
					return result; // Boolean
				}
			}
			return every; // Boolean
		},

		every: function(/*Array|String*/arr, /*Function|String*/callback, /*Object?*/thisObject){
			// summary:
			//		Determines whether or not every item in arr satisfies the
			//		condition implemented by callback.
			// arr:
			//		the array to iterate on. If a string, operates on individual characters.
			// callback:
			//		a function is invoked with three arguments: item, index,
			//		and array and returns true if the condition is met.
			// thisObject:
			//		may be used to scope the call to callback
			// description:
			//		This function corresponds to the JavaScript 1.6
			//		Array.every() method. For more details, see:
			//			http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Array:every
			// example:
			//	|	// returns false
			//	|	dojo.every([1, 2, 3, 4], function(item){ return item>1; });
			// example:
			//	|	// returns true 
			//	|	dojo.every([1, 2, 3, 4], function(item){ return item>0; });
			return this._everyOrSome(true, arr, callback, thisObject); // Boolean
		},

		some: function(/*Array|String*/arr, /*Function|String*/callback, /*Object?*/thisObject){
			// summary:
			//		Determines whether or not any item in arr satisfies the
			//		condition implemented by callback.
			// arr:
			//		the array to iterate over. If a string, operates on individual characters.
			// callback:
			//		a function is invoked with three arguments: item, index,
			//		and array and returns true if the condition is met.
			// thisObject:
			//		may be used to scope the call to callback
			// description:
			//		This function corresponds to the JavaScript 1.6
			//		Array.some() method. For more details, see:
			//			http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Array:some
			// example:
			//	|	// is true
			//	|	dojo.some([1, 2, 3, 4], function(item){ return item>1; });
			// example:
			//	|	// is false
			//	|	dojo.some([1, 2, 3, 4], function(item){ return item<1; });
			return this._everyOrSome(false, arr, callback, thisObject); // Boolean
		},

		map: function(/*Array|String*/arr, /*Function|String*/callback, /*Function?*/thisObject){
			// summary:
			//		applies callback to each element of arr and returns
			//		an Array with the results
			// arr:
			//		the array to iterate on. If a string, operates on
			//		individual characters.
			// callback:
			//		a function is invoked with three arguments, (item, index,
			//		array),  and returns a value
			// thisObject:
			//		may be used to scope the call to callback
			// description:
			//		This function corresponds to the JavaScript 1.6 Array.map()
			//		method. For more details, see:
			//			http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Array:map
			// example:
			//	|	// returns [2, 3, 4, 5]
			//	|	dojo.map([1, 2, 3, 4], function(item){ return item+1 });

			var _p = _getParts(arr, thisObject, callback); arr = _p[0];
			var outArr = (arguments[3] ? (new arguments[3]()) : []);
			for(var i=0,l=arr.length; i<l; ++i){
				outArr.push(_p[2].call(_p[1], arr[i], i, arr));
			}
			return outArr; // Array
		},

		filter: function(/*Array*/arr, /*Function|String*/callback, /*Object?*/thisObject){
			// summary:
			//		Returns a new Array with those items from arr that match the
			//		condition implemented by callback.
			// arr:
			//		the array to iterate over.
			// callback:
			//		a function that is invoked with three arguments (item,
			//		index, array). The return of this function is expected to
			//		be a boolean which determines whether the passed-in item
			//		will be included in the returned array.
			// thisObject:
			//		may be used to scope the call to callback
			// description:
			//		This function corresponds to the JavaScript 1.6
			//		Array.filter() method. For more details, see:
			//			http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Array:filter
			// example:
			//	|	// returns [2, 3, 4]
			//	|	dojo.filter([1, 2, 3, 4], function(item){ return item>1; });

			var _p = _getParts(arr, thisObject, callback); arr = _p[0];
			var outArr = [];
			for(var i=0,l=arr.length; i<l; ++i){
				if(_p[2].call(_p[1], arr[i], i, arr)){
					outArr.push(arr[i]);
				}
			}
			return outArr; // Array
		}
	});
})();
/*
*/

}

if(!dojo._hasResource["dojo._base.Color"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo._base.Color"] = true;
dojo.provide("dojo._base.Color");



(function(){
	
	var d = dojo;
		
	dojo.Color = function(/*Array|String|Object*/ color){
		// summary:
		//	 	Takes a named string, hex string, array of rgb or rgba values,
		//	 	an object with r, g, b, and a properties, or another `dojo.Color` object
		//	 	and creates a new Color instance to work from.
		//	
		// example:
		//		Work with a Color instance:
		//	 | var c = new dojo.Color(); 
		//	 | c.setColor([0,0,0]); // black
		//	 | var hex = c.toHex(); // #000000
		//	
		// example:
		//		Work with a node's color:
		//	 | var color = dojo.style("someNode", "backgroundColor");
		//	 | var n = new dojo.Color(color);
		//	 | // adjust the color some
		//	 | n.r *= .5; 
		//	 | console.log(n.toString()); // rgb(128, 255, 255);
		if(color){ this.setColor(color); }
	};

	// FIXME:
	// 	there's got to be a more space-efficient way to encode or discover
	// 	these!!  Use hex?
	dojo.Color.named = {
		black:      [0,0,0],
		silver:     [192,192,192],
		gray:       [128,128,128],
		white:      [255,255,255],
		maroon:		[128,0,0],
		red:        [255,0,0],
		purple:		[128,0,128],
		fuchsia:	[255,0,255],
		green:	    [0,128,0],
		lime:	    [0,255,0],
		olive:		[128,128,0],
		yellow:		[255,255,0],
		navy:       [0,0,128],
		blue:       [0,0,255],
		teal:		[0,128,128],
		aqua:		[0,255,255]
	};

	dojo.extend(dojo.Color, {
		r: 255, g: 255, b: 255, a: 1,
		_set: function(r, g, b, a){
			var t = this; t.r = r; t.g = g; t.b = b; t.a = a;
		},
		setColor: function(/*Array|String|Object*/ color){
			// summary:
			//		Takes a named string, hex string, array of rgb or rgba values,
			//		an object with r, g, b, and a properties, or another `dojo.Color` object
			//		and sets this color instance to that value. 
			// 
			// example:
			//	|	var c = new dojo.Color(); // no color
			//	|	c.setColor("#ededed"); // greyish
			if(d.isString(color)){
				d.colorFromString(color, this);
			}else if(d.isArray(color)){
				d.colorFromArray(color, this);
			}else{
				this._set(color.r, color.g, color.b, color.a);
				if(!(color instanceof d.Color)){ this.sanitize(); }
			}
			return this;	// dojo.Color
		},
		sanitize: function(){
			// summary:
			//		makes sure that the object has correct attributes
			// description: 
			//		the default implementation does nothing, include dojo.colors to
			//		augment it to real checks
			return this;	// dojo.Color
		},
		toRgb: function(){
			// summary:
			//		Returns 3 component array of rgb values
			// example:
			//	|	var c = new dojo.Color("#000000"); 
			//	| 	console.log(c.toRgb()); // [0,0,0] 
			var t = this;
			return [t.r, t.g, t.b];	// Array
		},
		toRgba: function(){
			// summary:
			//		Returns a 4 component array of rgba values
			var t = this;
			return [t.r, t.g, t.b, t.a];	// Array
		},
		toHex: function(){
			// summary:
			//		Returns a css color string in hexadecimal representation
			// example: 
			//	| 	console.log(new dojo.Color([0,0,0]).toHex()); // #000000
			var arr = d.map(["r", "g", "b"], function(x){
				var s = this[x].toString(16);
				return s.length < 2 ? "0" + s : s;
			}, this);
			return "#" + arr.join("");	// String
		},
		toCss: function(/*Boolean?*/ includeAlpha){
			// summary:
			//		Returns a css color string in rgb(a) representation
			// example:
			//	|	var c = new dojo.Color("#FFF").toCss();
			//	|	console.log(c); // rgb('255','255','255')
			var t = this, rgb = t.r + ", " + t.g + ", " + t.b;
			return (includeAlpha ? "rgba(" + rgb + ", " + t.a : "rgb(" + rgb) + ")";	// String
		},
		toString: function(){
			// summary:
			//		Returns a visual representation of the color
			return this.toCss(true); // String
		}
	});

	dojo.blendColors = function(
		/*dojo.Color*/ start, 
		/*dojo.Color*/ end, 
		/*Number*/ weight,
		/*dojo.Color?*/ obj
	){
		// summary: 
		//		Blend colors end and start with weight from 0 to 1, 0.5 being a 50/50 blend,
		//		can reuse a previously allocated dojo.Color object for the result
		var t = obj || new d.Color();
		d.forEach(["r", "g", "b", "a"], function(x){
			t[x] = start[x] + (end[x] - start[x]) * weight;
			if(x != "a"){ t[x] = Math.round(t[x]); }
		});
		return t.sanitize();	// dojo.Color
	};

	dojo.colorFromRgb = function(/*String*/ color, /*dojo.Color?*/ obj){
		// summary:
		//		Get rgb(a) array from css-style color declarations
		var m = color.toLowerCase().match(/^rgba?\(([\s\.,0-9]+)\)/);
		return m && dojo.colorFromArray(m[1].split(/\s*,\s*/), obj);	// dojo.Color
	};

	dojo.colorFromHex = function(/*String*/ color, /*dojo.Color?*/ obj){
		// summary:
		//		converts a hex string with a '#' prefix to a color object.
		//		Supports 12-bit #rgb shorthand.
		//	
		// example:
		//	 | var thing = dojo.colorFromHex("#ededed"); // grey, longhand
		//	
		// example:
		//	| var thing = dojo.colorFromHex("#000"); // black, shorthand
		var t = obj || new d.Color(),
			bits = (color.length == 4) ? 4 : 8,
			mask = (1 << bits) - 1;
		color = Number("0x" + color.substr(1));
		if(isNaN(color)){
			return null; // dojo.Color
		}
		d.forEach(["b", "g", "r"], function(x){
			var c = color & mask;
			color >>= bits;
			t[x] = bits == 4 ? 17 * c : c;
		});
		t.a = 1;
		return t;	// dojo.Color
	};

	dojo.colorFromArray = function(/*Array*/ a, /*dojo.Color?*/ obj){
		// summary:
		//		builds a color from 1, 2, 3, or 4 element array
		var t = obj || new d.Color();
		t._set(Number(a[0]), Number(a[1]), Number(a[2]), Number(a[3]));
		if(isNaN(t.a)){ t.a = 1; }
		return t.sanitize();	// dojo.Color
	};

	dojo.colorFromString = function(/*String*/ str, /*dojo.Color?*/ obj){
		// summary:
		//		parses str for a color value.
		// description:
		//		Acceptable input values for str may include arrays of any form
		//		accepted by dojo.colorFromArray, hex strings such as "#aaaaaa", or
		//		rgb or rgba strings such as "rgb(133, 200, 16)" or "rgba(10, 10,
		//		10, 50)"
		// returns:
		//		a dojo.Color object. If obj is passed, it will be the return value.
		var a = d.Color.named[str];
		return a && d.colorFromArray(a, obj) || d.colorFromRgb(str, obj) || d.colorFromHex(str, obj);
	};

})();

}

if(!dojo._hasResource["dojo._base"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo._base"] = true;
dojo.provide("dojo._base");









}

if(!dojo._hasResource["dojo._base.window"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo._base.window"] = true;
dojo.provide("dojo._base.window");

/*=====
dojo.doc = {
	// summary:
	//		Alias for the current document. 'dojo.doc' can be modified
	//		for temporary context shifting. Also see dojo.withDoc().
	// description:
	//    Refer to dojo.doc rather
	//    than referring to 'window.document' to ensure your code runs
	//    correctly in managed contexts.
	// example:
	// 	|	n.appendChild(dojo.doc.createElement('div'));
}
=====*/
dojo.doc = window["document"] || null;

dojo.body = function(){
	// summary:
	//		Return the body element of the document
	//		return the body object associated with dojo.doc
	// example:
	// 	|	dojo.body().appendChild(dojo.doc.createElement('div'));

	// Note: document.body is not defined for a strict xhtml document
	// Would like to memoize this, but dojo.doc can change vi dojo.withDoc().
	return dojo.doc.body || dojo.doc.getElementsByTagName("body")[0]; // Node
}

dojo.setContext = function(/*Object*/globalObject, /*DocumentElement*/globalDocument){
	// summary:
	//		changes the behavior of many core Dojo functions that deal with
	//		namespace and DOM lookup, changing them to work in a new global
	//		context (e.g., an iframe). The varibles dojo.global and dojo.doc
	//		are modified as a result of calling this function and the result of
	//		`dojo.body()` likewise differs.
	dojo.global = globalObject;
	dojo.doc = globalDocument;
};

dojo.withGlobal = function(	/*Object*/globalObject, 
							/*Function*/callback, 
							/*Object?*/thisObject, 
							/*Array?*/cbArguments){
	// summary:
	//		Invoke callback with globalObject as dojo.global and
	//		globalObject.document as dojo.doc.
	// description:
	//		Invoke callback with globalObject as dojo.global and
	//		globalObject.document as dojo.doc. If provided, globalObject
	//		will be executed in the context of object thisObject
	//		When callback() returns or throws an error, the dojo.global
	//		and dojo.doc will be restored to its previous state.

	var oldGlob = dojo.global;
	try{
		dojo.global = globalObject;
		return dojo.withDoc.call(null, globalObject.document, callback, thisObject, cbArguments);
	}finally{
		dojo.global = oldGlob;
	}
}

dojo.withDoc = function(	/*DocumentElement*/documentObject, 
							/*Function*/callback, 
							/*Object?*/thisObject, 
							/*Array?*/cbArguments){
	// summary:
	//		Invoke callback with documentObject as dojo.doc.
	// description:
	//		Invoke callback with documentObject as dojo.doc. If provided,
	//		callback will be executed in the context of object thisObject
	//		When callback() returns or throws an error, the dojo.doc will
	//		be restored to its previous state.

	var oldDoc = dojo.doc,
		oldLtr = dojo._bodyLtr;

	try{
		dojo.doc = documentObject;
		delete dojo._bodyLtr; // uncache

		if(thisObject && dojo.isString(callback)){
			callback = thisObject[callback];
		}

		return callback.apply(thisObject, cbArguments || []);
	}finally{
		dojo.doc = oldDoc;
		if(oldLtr !== undefined){ dojo._bodyLtr = oldLtr; }
	}
};
	

}

if(!dojo._hasResource["dojo._base.event"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo._base.event"] = true;
dojo.provide("dojo._base.event");


// this file courtesy of the TurboAjax Group, licensed under a Dojo CLA

(function(){
	// DOM event listener machinery
	var del = (dojo._event_listener = {
		add: function(/*DOMNode*/node, /*String*/name, /*Function*/fp){
			if(!node){return;} 
			name = del._normalizeEventName(name);
			fp = del._fixCallback(name, fp);
			var oname = name;
			if(
								!dojo.isIE && 
								(name == "mouseenter" || name == "mouseleave")
			){
				var ofp = fp;
				//oname = name;
				name = (name == "mouseenter") ? "mouseover" : "mouseout";
				fp = function(e){		
					if(dojo.isFF <= 2) {
						// check tagName to fix a FF2 bug with invalid nodes (hidden child DIV of INPUT)
						// which causes isDescendant to return false which causes
						// spurious, and more importantly, incorrect mouse events to fire.
						// TODO: remove tagName check when Firefox 2 is no longer supported
						try{ e.relatedTarget.tagName; }catch(e2){ return; }
					}
					if(!dojo.isDescendant(e.relatedTarget, node)){
						// e.type = oname; // FIXME: doesn't take? SJM: event.type is generally immutable.
						return ofp.call(this, e); 
					}
				}
			}
			node.addEventListener(name, fp, false);
			return fp; /*Handle*/
		},
		remove: function(/*DOMNode*/node, /*String*/event, /*Handle*/handle){
			// summary:
			//		clobbers the listener from the node
			// node:
			//		DOM node to attach the event to
			// event:
			//		the name of the handler to remove the function from
			// handle:
			//		the handle returned from add
			if(node){
				event = del._normalizeEventName(event);
				if(!dojo.isIE && (event == "mouseenter" || event == "mouseleave")){
					event = (event == "mouseenter") ? "mouseover" : "mouseout";
				}

				node.removeEventListener(event, handle, false);
			}
		},
		_normalizeEventName: function(/*String*/name){
			// Generally, name should be lower case, unless it is special
			// somehow (e.g. a Mozilla DOM event).
			// Remove 'on'.
			return name.slice(0,2) =="on" ? name.slice(2) : name;
		},
		_fixCallback: function(/*String*/name, fp){
			// By default, we only invoke _fixEvent for 'keypress'
			// If code is added to _fixEvent for other events, we have
			// to revisit this optimization.
			// This also applies to _fixEvent overrides for Safari and Opera
			// below.
			return name != "keypress" ? fp : function(e){ return fp.call(this, del._fixEvent(e, this)); };
		},
		_fixEvent: function(evt, sender){
			// _fixCallback only attaches us to keypress.
			// Switch on evt.type anyway because we might 
			// be called directly from dojo.fixEvent.
			switch(evt.type){
				case "keypress":
					del._setKeyChar(evt);
					break;
			}
			return evt;
		},
		_setKeyChar: function(evt){
			evt.keyChar = evt.charCode ? String.fromCharCode(evt.charCode) : '';
			evt.charOrCode = evt.keyChar || evt.keyCode;
		},
		// For IE and Safari: some ctrl-key combinations (mostly w/punctuation) do not emit a char code in IE
		// we map those virtual key codes to ascii here
		// not valid for all (non-US) keyboards, so maybe we shouldn't bother
		_punctMap: { 
			106:42, 
			111:47, 
			186:59, 
			187:43, 
			188:44, 
			189:45, 
			190:46, 
			191:47, 
			192:96, 
			219:91, 
			220:92, 
			221:93, 
			222:39 
		}
	});

	// DOM events
	
	dojo.fixEvent = function(/*Event*/evt, /*DOMNode*/sender){
		// summary:
		//		normalizes properties on the event object including event
		//		bubbling methods, keystroke normalization, and x/y positions
		// evt: Event
		//		native event object
		// sender: DOMNode
		//		node to treat as "currentTarget"
		return del._fixEvent(evt, sender);
	}

	dojo.stopEvent = function(/*Event*/evt){
		// summary:
		//		prevents propagation and clobbers the default action of the
		//		passed event
		// evt: Event
		//		The event object. If omitted, window.event is used on IE.
		evt.preventDefault();
		evt.stopPropagation();
		// NOTE: below, this method is overridden for IE
	}

	// the default listener to use on dontFix nodes, overriden for IE
	var node_listener = dojo._listener;
	
	// Unify connect and event listeners
	dojo._connect = function(obj, event, context, method, dontFix){
		// FIXME: need a more strict test
		var isNode = obj && (obj.nodeType||obj.attachEvent||obj.addEventListener);
		// choose one of three listener options: raw (connect.js), DOM event on a Node, custom event on a Node
		// we need the third option to provide leak prevention on broken browsers (IE)
		var lid = isNode ? (dontFix ? 2 : 1) : 0, l = [dojo._listener, del, node_listener][lid];
		// create a listener
		var h = l.add(obj, event, dojo.hitch(context, method));
		// formerly, the disconnect package contained "l" directly, but if client code
		// leaks the disconnect package (by connecting it to a node), referencing "l" 
		// compounds the problem.
		// instead we return a listener id, which requires custom _disconnect below.
		// return disconnect package
		return [ obj, event, h, lid ];
	}

	dojo._disconnect = function(obj, event, handle, listener){
		([dojo._listener, del, node_listener][listener]).remove(obj, event, handle);
	}

	// Constants

	// Public: client code should test
	// keyCode against these named constants, as the
	// actual codes can vary by browser.
	dojo.keys = {
		// summary: definitions for common key values
		BACKSPACE: 8,
		TAB: 9,
		CLEAR: 12,
		ENTER: 13,
		SHIFT: 16,
		CTRL: 17,
		ALT: 18,
		PAUSE: 19,
		CAPS_LOCK: 20,
		ESCAPE: 27,
		SPACE: 32,
		PAGE_UP: 33,
		PAGE_DOWN: 34,
		END: 35,
		HOME: 36,
		LEFT_ARROW: 37,
		UP_ARROW: 38,
		RIGHT_ARROW: 39,
		DOWN_ARROW: 40,
		INSERT: 45,
		DELETE: 46,
		HELP: 47,
		LEFT_WINDOW: 91,
		RIGHT_WINDOW: 92,
		SELECT: 93,
		NUMPAD_0: 96,
		NUMPAD_1: 97,
		NUMPAD_2: 98,
		NUMPAD_3: 99,
		NUMPAD_4: 100,
		NUMPAD_5: 101,
		NUMPAD_6: 102,
		NUMPAD_7: 103,
		NUMPAD_8: 104,
		NUMPAD_9: 105,
		NUMPAD_MULTIPLY: 106,
		NUMPAD_PLUS: 107,
		NUMPAD_ENTER: 108,
		NUMPAD_MINUS: 109,
		NUMPAD_PERIOD: 110,
		NUMPAD_DIVIDE: 111,
		F1: 112,
		F2: 113,
		F3: 114,
		F4: 115,
		F5: 116,
		F6: 117,
		F7: 118,
		F8: 119,
		F9: 120,
		F10: 121,
		F11: 122,
		F12: 123,
		F13: 124,
		F14: 125,
		F15: 126,
		NUM_LOCK: 144,
		SCROLL_LOCK: 145
	};
	
		// IE event normalization
	if(dojo.isIE){ 
		var _trySetKeyCode = function(e, code){
			try{
				// squelch errors when keyCode is read-only
				// (e.g. if keyCode is ctrl or shift)
				return (e.keyCode = code);
			}catch(e){
				return 0;
			}
		}

		// by default, use the standard listener
		var iel = dojo._listener;
		var listenersName = (dojo._ieListenersName = "_" + dojo._scopeName + "_listeners");
		// dispatcher tracking property
		if(!dojo.config._allow_leaks){
			// custom listener that handles leak protection for DOM events
			node_listener = iel = dojo._ie_listener = {
				// support handler indirection: event handler functions are 
				// referenced here. Event dispatchers hold only indices.
				handlers: [],
				// add a listener to an object
				add: function(/*Object*/ source, /*String*/ method, /*Function*/ listener){
					source = source || dojo.global;
					var f = source[method];
					if(!f||!f[listenersName]){
						var d = dojo._getIeDispatcher();
						// original target function is special
						d.target = f && (ieh.push(f) - 1);
						// dispatcher holds a list of indices into handlers table
						d[listenersName] = [];
						// redirect source to dispatcher
						f = source[method] = d;
					}
					return f[listenersName].push(ieh.push(listener) - 1) ; /*Handle*/
				},
				// remove a listener from an object
				remove: function(/*Object*/ source, /*String*/ method, /*Handle*/ handle){
					var f = (source||dojo.global)[method], l = f && f[listenersName];
					if(f && l && handle--){
						delete ieh[l[handle]];
						delete l[handle];
					}
				}
			};
			// alias used above
			var ieh = iel.handlers;
		}

		dojo.mixin(del, {
			add: function(/*DOMNode*/node, /*String*/event, /*Function*/fp){
				if(!node){return;} // undefined
				event = del._normalizeEventName(event);
				if(event=="onkeypress"){
					// we need to listen to onkeydown to synthesize
					// keypress events that otherwise won't fire
					// on IE
					var kd = node.onkeydown;
					if(!kd || !kd[listenersName] || !kd._stealthKeydownHandle){
						var h = del.add(node, "onkeydown", del._stealthKeyDown);
						kd = node.onkeydown;
						kd._stealthKeydownHandle = h;
						kd._stealthKeydownRefs = 1;
					}else{
						kd._stealthKeydownRefs++;
					}
				}
				return iel.add(node, event, del._fixCallback(fp));
			},
			remove: function(/*DOMNode*/node, /*String*/event, /*Handle*/handle){
				event = del._normalizeEventName(event);
				iel.remove(node, event, handle); 
				if(event=="onkeypress"){
					var kd = node.onkeydown;
					if(--kd._stealthKeydownRefs <= 0){
						iel.remove(node, "onkeydown", kd._stealthKeydownHandle);
						delete kd._stealthKeydownHandle;
					}
				}
			},
			_normalizeEventName: function(/*String*/eventName){
				// Generally, eventName should be lower case, unless it is
				// special somehow (e.g. a Mozilla event)
				// ensure 'on'
				return eventName.slice(0,2) != "on" ? "on" + eventName : eventName;
			},
			_nop: function(){},
			_fixEvent: function(/*Event*/evt, /*DOMNode*/sender){
				// summary:
				//		normalizes properties on the event object including event
				//		bubbling methods, keystroke normalization, and x/y positions
				// evt: native event object
				// sender: node to treat as "currentTarget"
				if(!evt){
					var w = sender && (sender.ownerDocument || sender.document || sender).parentWindow || window;
					evt = w.event; 
				}
				if(!evt){return(evt);}
				evt.target = evt.srcElement; 
				evt.currentTarget = (sender || evt.srcElement); 
				evt.layerX = evt.offsetX;
				evt.layerY = evt.offsetY;
				// FIXME: scroll position query is duped from dojo.html to
				// avoid dependency on that entire module. Now that HTML is in
				// Base, we should convert back to something similar there.
				var se = evt.srcElement, doc = (se && se.ownerDocument) || document;
				// DO NOT replace the following to use dojo.body(), in IE, document.documentElement should be used
				// here rather than document.body
				var docBody = ((dojo.isIE < 6) || (doc["compatMode"] == "BackCompat")) ? doc.body : doc.documentElement;
				var offset = dojo._getIeDocumentElementOffset();
				evt.pageX = evt.clientX + dojo._fixIeBiDiScrollLeft(docBody.scrollLeft || 0) - offset.x;
				evt.pageY = evt.clientY + (docBody.scrollTop || 0) - offset.y;
				if(evt.type == "mouseover"){ 
					evt.relatedTarget = evt.fromElement;
				}
				if(evt.type == "mouseout"){ 
					evt.relatedTarget = evt.toElement;
				}
				evt.stopPropagation = del._stopPropagation;
				evt.preventDefault = del._preventDefault;
				return del._fixKeys(evt);
			},
			_fixKeys: function(evt){
				switch(evt.type){
					case "keypress":
						var c = ("charCode" in evt ? evt.charCode : evt.keyCode);
						if (c==10){
							// CTRL-ENTER is CTRL-ASCII(10) on IE, but CTRL-ENTER on Mozilla
							c=0;
							evt.keyCode = 13;
						}else if(c==13||c==27){
							c=0; // Mozilla considers ENTER and ESC non-printable
						}else if(c==3){
							c=99; // Mozilla maps CTRL-BREAK to CTRL-c
						}
						// Mozilla sets keyCode to 0 when there is a charCode
						// but that stops the event on IE.
						evt.charCode = c;
						del._setKeyChar(evt);
						break;
				}
				return evt;
			},
			_stealthKeyDown: function(evt){
				// IE doesn't fire keypress for most non-printable characters.
				// other browsers do, we simulate it here.
				var kp = evt.currentTarget.onkeypress;
				// only works if kp exists and is a dispatcher
				if(!kp || !kp[listenersName]){ return; }
				// munge key/charCode
				var k=evt.keyCode;
				// These are Windows Virtual Key Codes
				// http://msdn.microsoft.com/library/default.asp?url=/library/en-us/winui/WinUI/WindowsUserInterface/UserInput/VirtualKeyCodes.asp
				var unprintable = k!=13 && k!=32 && k!=27 && (k<48||k>90) && (k<96||k>111) && (k<186||k>192) && (k<219||k>222);
				// synthesize keypress for most unprintables and CTRL-keys
				if(unprintable||evt.ctrlKey){
					var c = unprintable ? 0 : k;
					if(evt.ctrlKey){
						if(k==3 || k==13){
							return; // IE will post CTRL-BREAK, CTRL-ENTER as keypress natively 
						}else if(c>95 && c<106){ 
							c -= 48; // map CTRL-[numpad 0-9] to ASCII
						}else if((!evt.shiftKey)&&(c>=65&&c<=90)){ 
							c += 32; // map CTRL-[A-Z] to lowercase
						}else{ 
							c = del._punctMap[c] || c; // map other problematic CTRL combinations to ASCII
						}
					}
					// simulate a keypress event
					var faux = del._synthesizeEvent(evt, {type: 'keypress', faux: true, charCode: c});
					kp.call(evt.currentTarget, faux);
					evt.cancelBubble = faux.cancelBubble;
					evt.returnValue = faux.returnValue;
					_trySetKeyCode(evt, faux.keyCode);
				}
			},
			// Called in Event scope
			_stopPropagation: function(){
				this.cancelBubble = true; 
			},
			_preventDefault: function(){
				// Setting keyCode to 0 is the only way to prevent certain keypresses (namely
				// ctrl-combinations that correspond to menu accelerator keys).
				// Otoh, it prevents upstream listeners from getting this information
				// Try to split the difference here by clobbering keyCode only for ctrl 
				// combinations. If you still need to access the key upstream, bubbledKeyCode is
				// provided as a workaround.
				this.bubbledKeyCode = this.keyCode;
				if(this.ctrlKey){_trySetKeyCode(this, 0);}
				this.returnValue = false;
			}
		});
				
		// override stopEvent for IE
		dojo.stopEvent = function(evt){
			evt = evt || window.event;
			del._stopPropagation.call(evt);
			del._preventDefault.call(evt);
		}
	}
	
	del._synthesizeEvent = function(evt, props){
			var faux = dojo.mixin({}, evt, props);
			del._setKeyChar(faux);
			// FIXME: would prefer to use dojo.hitch: dojo.hitch(evt, evt.preventDefault); 
			// but it throws an error when preventDefault is invoked on Safari
			// does Event.preventDefault not support "apply" on Safari?
			faux.preventDefault = function(){ evt.preventDefault(); }; 
			faux.stopPropagation = function(){ evt.stopPropagation(); }; 
			return faux;
	}
	
		// Opera event normalization
	if(dojo.isOpera){
		dojo.mixin(del, {
			_fixEvent: function(evt, sender){
				switch(evt.type){
					case "keypress":
						var c = evt.which;
						if(c==3){
							c=99; // Mozilla maps CTRL-BREAK to CTRL-c
						}
						// can't trap some keys at all, like INSERT and DELETE
						// there is no differentiating info between DELETE and ".", or INSERT and "-"
						c = c<41 && !evt.shiftKey ? 0 : c;
						if(evt.ctrlKey && !evt.shiftKey && c>=65 && c<=90){
							// lowercase CTRL-[A-Z] keys
							c += 32;
						}
						return del._synthesizeEvent(evt, { charCode: c });
				}
				return evt;
			}
		});
	}
	
		// Webkit event normalization
	if(dojo.isWebKit){
				del._add = del.add;
		del._remove = del.remove;

		dojo.mixin(del, {
			add: function(/*DOMNode*/node, /*String*/event, /*Function*/fp){
				if(!node){return;} // undefined
				var handle = del._add(node, event, fp);
				if(del._normalizeEventName(event) == "keypress"){
					// we need to listen to onkeydown to synthesize
					// keypress events that otherwise won't fire
					// in Safari 3.1+: https://lists.webkit.org/pipermail/webkit-dev/2007-December/002992.html
					handle._stealthKeyDownHandle = del._add(node, "keydown", function(evt){
						//A variation on the IE _stealthKeydown function
						//Synthesize an onkeypress event, but only for unprintable characters.
						var k=evt.keyCode;
						// These are Windows Virtual Key Codes
						// http://msdn.microsoft.com/library/default.asp?url=/library/en-us/winui/WinUI/WindowsUserInterface/UserInput/VirtualKeyCodes.asp
						var unprintable = k!=13 && k!=32 && k!=27 && (k<48 || k>90) && (k<96 || k>111) && (k<186 || k>192) && (k<219 || k>222);
						// synthesize keypress for most unprintables and CTRL-keys
						if(unprintable || evt.ctrlKey){
							var c = unprintable ? 0 : k;
							if(evt.ctrlKey){
								if(k==3 || k==13){
									return; // IE will post CTRL-BREAK, CTRL-ENTER as keypress natively 
								}else if(c>95 && c<106){ 
									c -= 48; // map CTRL-[numpad 0-9] to ASCII
								}else if(!evt.shiftKey && c>=65 && c<=90){ 
									c += 32; // map CTRL-[A-Z] to lowercase
								}else{ 
									c = del._punctMap[c] || c; // map other problematic CTRL combinations to ASCII
								}
							}
							// simulate a keypress event
							var faux = del._synthesizeEvent(evt, {type: 'keypress', faux: true, charCode: c});
							fp.call(evt.currentTarget, faux);
						}
					});
				}
				return handle; /*Handle*/
			},

			remove: function(/*DOMNode*/node, /*String*/event, /*Handle*/handle){
				if(node){
					if(handle._stealthKeyDownHandle){
						del._remove(node, "keydown", handle._stealthKeyDownHandle);
					}
					del._remove(node, event, handle);
				}
			},
			_fixEvent: function(evt, sender){
				switch(evt.type){
					case "keypress":
						if(evt.faux){ return evt; }
						var c = evt.charCode;
						c = c>=32 ? c : 0;
						return del._synthesizeEvent(evt, {charCode: c, faux: true});
				}
				return evt;
			}
		});
		}
	})();

if(dojo.isIE){
	// keep this out of the closure
	// closing over 'iel' or 'ieh' b0rks leak prevention
	// ls[i] is an index into the master handler array
	dojo._ieDispatcher = function(args, sender){
		var ap = Array.prototype,
			h = dojo._ie_listener.handlers,
			c = args.callee,
			ls = c[dojo._ieListenersName],
			t = h[c.target];
		// return value comes from original target function
		var r = t && t.apply(sender, args);
		// make local copy of listener array so it's immutable during processing
		var lls = [].concat(ls);
		// invoke listeners after target function
		for(var i in lls){
			var f = h[lls[i]];
			if(!(i in ap) && f){
				f.apply(sender, args);
			}
		}
		return r;
	}
	dojo._getIeDispatcher = function(){
		// ensure the returned function closes over nothing ("new Function" apparently doesn't close)
		return new Function(dojo._scopeName + "._ieDispatcher(arguments, this)"); // function
	}
	// keep this out of the closure to reduce RAM allocation
	dojo._event_listener._fixCallback = function(fp){
		var f = dojo._event_listener._fixEvent;
		return function(e){ return fp.call(this, f(e, this)); };
	}
}

}

if(!dojo._hasResource["dojo._base.html"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo._base.html"] = true;

dojo.provide("dojo._base.html");

// FIXME: need to add unit tests for all the semi-public methods

try{
	document.execCommand("BackgroundImageCache", false, true);
}catch(e){
	// sane browsers don't have cache "issues"
}

// =============================
// DOM Functions
// =============================

/*=====
dojo.byId = function(id, doc){
	//	summary:
	//		Returns DOM node with matching `id` attribute or `null` 
	//		if not found, similar to "$" function in another library.
	//		If `id` is a DomNode, this function is a no-op.
	//
	//	id: String|DOMNode
	//	 	A string to match an HTML id attribute or a reference to a DOM Node
	//
	//	doc: Document?
	//		Document to work in. Defaults to the current value of
	//		dojo.doc.  Can be used to retrieve
	//		node references from other documents.
	// 
	//	example:
	//	Look up a node by ID:
	//	| var n = dojo.byId("foo");
	//
	//	example:
	//	Check if a node exists.
	//	|	if(dojo.byId("bar")){ ... }
	//
	//	example:
	//	Allow string or DomNode references to be passed to a custom function:
	//	| var foo = function(nodeOrId){ 
	//	|	nodeOrId = dojo.byId(nodeOrId); 
	//	|	// ... more stuff
	//	| }
=====*/

if(dojo.isIE || dojo.isOpera){
	dojo.byId = function(id, doc){
		if(!id || id.nodeType){
			return id;
		}
		var _d = doc || dojo.doc;
		var te = _d.getElementById(id);
		// attributes.id.value is better than just id in case the 
		// user has a name=id inside a form
		if(te && (te.attributes.id.value == id || te.id == id)){
			return te;
		}else{
			var eles = _d.all[id];
			if(!eles || eles.nodeName){
				eles = [eles];
			}
			// if more than 1, choose first with the correct id
			var i=0;
			while((te=eles[i++])){
				if((te.attributes && te.attributes.id && te.attributes.id.value == id)
					|| te.id == id){
					return te;
				}
			}
		}
	};
}else{
	dojo.byId = function(id, doc){
		return dojo.isString(id) ? (doc || dojo.doc).getElementById(id) : id; // DomNode
	};
}
/*=====
};
=====*/

(function(){
	var d = dojo;
	var byId = d.byId;
	var isString = d.isString;

	var _destroyContainer = null;
		d.addOnWindowUnload(function(){
		_destroyContainer = null; //prevent IE leak
	});
	
/*=====
	dojo._destroyElement = function(node){
		// summary:
		// 		Existing alias for `dojo.destroy`. Deprecated, will be removed
		// 		in 2.0
	}
=====*/
	dojo._destroyElement = dojo.destroy = function(/*String|DomNode*/node){
		//	summary:
		//		Removes a node from its parent, clobbering it and all of its
		//		children.
		//
		//	description:
		//		Removes a node from its parent, clobbering it and all of its
		//		children. Function only works with DomNodes, and returns nothing.
		//		
		//	node:
		//		A String ID or DomNode reference of the element to be destroyed
		//
		//	example:
		//	Destroy a node byId:
		//	| dojo.destroy("someId");
		//
		//	example:
		//	Destroy all nodes in a list by reference:
		//	| dojo.query(".someNode").forEach(dojo.destroy);
		
		node = byId(node);
		try{
			if(!_destroyContainer || _destroyContainer.ownerDocument != node.ownerDocument){
				_destroyContainer = node.ownerDocument.createElement("div");
			}
			_destroyContainer.appendChild(node.parentNode ? node.parentNode.removeChild(node) : node);
			// NOTE: see http://trac.dojotoolkit.org/ticket/2931. This may be a bug and not a feature
			_destroyContainer.innerHTML = ""; 
		}catch(e){
			/* squelch */
		}
	};

	dojo.isDescendant = function(/*DomNode|String*/node, /*DomNode|String*/ancestor){
		//	summary:
		//		Returns true if node is a descendant of ancestor
		//	node: string id or node reference to test
		//	ancestor: string id or node reference of potential parent to test against
		try{
			node = byId(node);
			ancestor = byId(ancestor);
			while(node){
				if(node === ancestor){
					return true; // Boolean
				}
				node = node.parentNode;
			}
		}catch(e){ /* squelch, return false */ }
		return false; // Boolean
	};

	dojo.setSelectable = function(/*DomNode|String*/node, /*Boolean*/selectable){
		//	summary: enable or disable selection on a node
		//	node:
		//		id or reference to node
		//	selectable:
		//		state to put the node in. false indicates unselectable, true 
		//		allows selection.
		node = byId(node);
				if(d.isMozilla){
			node.style.MozUserSelect = selectable ? "" : "none";
		}else if(d.isKhtml || d.isWebKit){
					node.style.KhtmlUserSelect = selectable ? "auto" : "none";
				}else if(d.isIE){
			var v = (node.unselectable = selectable ? "" : "on");
			d.query("*", node).forEach("item.unselectable = '"+v+"'");
		}
				//FIXME: else?  Opera?
	};

	var _insertBefore = function(/*DomNode*/node, /*DomNode*/ref){
		var parent = ref.parentNode;
		if(parent){
			parent.insertBefore(node, ref);
		}
	};

	var _insertAfter = function(/*DomNode*/node, /*DomNode*/ref){
		//	summary:
		//		Try to insert node after ref
		var parent = ref.parentNode;
		if(parent){
			if(parent.lastChild == ref){
				parent.appendChild(node);
			}else{
				parent.insertBefore(node, ref.nextSibling);
			}
		}
	};

	dojo.place = function(node, refNode, position){
		//	summary:
		//		Attempt to insert node into the DOM, choosing from various positioning options.
		//		Returns the first argument resolved to a DOM node.
		//
		//	node: String|DomNode
		//		id or node reference, or HTML fragment starting with "<" to place relative to refNode
		//
		//	refNode: String|DomNode
		//		id or node reference to use as basis for placement
		//
		//	position: String|Number?
		//		string noting the position of node relative to refNode or a
		//		number indicating the location in the childNodes collection of refNode. 
		//		Accepted string values are:
		//	|	* before
		//	|	* after
		//	|	* replace
		//	|	* only
		//	|	* first
		//	|	* last
		//		"first" and "last" indicate positions as children of refNode, "replace" replaces refNode,
		//		"only" replaces all children.  position defaults to "last" if not specified
		//
		//	returns: DomNode
		//		Returned values is the first argument resolved to a DOM node.
		//
		//		.place() is also a method of `dojo.NodeList`, allowing `dojo.query` node lookups.
		// 
		// example:
		//		Place a node by string id as the last child of another node by string id:
		// | 	dojo.place("someNode", "anotherNode");
		//
		// example:
		//		Place a node by string id before another node by string id
		// | 	dojo.place("someNode", "anotherNode", "before");
		//
		// example:
		//		Create a Node, and place it in the body element (last child):
		// | 	dojo.place(dojo.create('div'), dojo.body());
		//
		// example:
		//		Put a new LI as the first child of a list by id:
		// | 	dojo.place(dojo.create('li'), "someUl", "first");

		refNode = byId(refNode);
		if(isString(node)){
			node = node.charAt(0) == "<" ? d._toDom(node, refNode.ownerDocument) : byId(node);
		}
		if(typeof position == "number"){
			var cn = refNode.childNodes;
			if(!cn.length || cn.length <= position){
				refNode.appendChild(node);
			}else{
				_insertBefore(node, cn[position < 0 ? 0 : position]);
			}
		}else{
			switch(position){
				case "before":
					_insertBefore(node, refNode);
					break;
				case "after":
					_insertAfter(node, refNode);
					break;
				case "replace":
					refNode.parentNode.replaceChild(node, refNode);
					break; 
				case "only":
					d.empty(refNode);
					refNode.appendChild(node);
					break;
				case "first":
					if(refNode.firstChild){
						_insertBefore(node, refNode.firstChild);
						break;
					}
					// else fallthrough...
				default: // aka: last
					refNode.appendChild(node);
			}
		}
		return node; // DomNode
	}

	// Box functions will assume this model.
	// On IE/Opera, BORDER_BOX will be set if the primary document is in quirks mode.
	// Can be set to change behavior of box setters.
	
	// can be either:
	//	"border-box"
	//	"content-box" (default)
	dojo.boxModel = "content-box";
	
	// We punt per-node box mode testing completely.
	// If anybody cares, we can provide an additional (optional) unit 
	// that overrides existing code to include per-node box sensitivity.

	// Opera documentation claims that Opera 9 uses border-box in BackCompat mode.
	// but experiments (Opera 9.10.8679 on Windows Vista) indicate that it actually continues to use content-box.
	// IIRC, earlier versions of Opera did in fact use border-box.
	// Opera guys, this is really confusing. Opera being broken in quirks mode is not our fault.

		if(d.isIE /*|| dojo.isOpera*/){
		var _dcm = document.compatMode;
		// client code may have to adjust if compatMode varies across iframes
		d.boxModel = _dcm == "BackCompat" || _dcm == "QuirksMode" || d.isIE < 6 ? "border-box" : "content-box"; // FIXME: remove IE < 6 support?
	}
	
	// =============================
	// Style Functions
	// =============================
	
	// getComputedStyle drives most of the style code.
	// Wherever possible, reuse the returned object.
	//
	// API functions below that need to access computed styles accept an 
	// optional computedStyle parameter.
	// If this parameter is omitted, the functions will call getComputedStyle themselves.
	// This way, calling code can access computedStyle once, and then pass the reference to 
	// multiple API functions. 

/*=====
	dojo.getComputedStyle = function(node){
		//	summary:
		//		Returns a "computed style" object.
		//
		//	description:
		//		Gets a "computed style" object which can be used to gather
		//		information about the current state of the rendered node. 
		//
		//		Note that this may behave differently on different browsers.
		//		Values may have different formats and value encodings across
		//		browsers.
		//
		//		Note also that this method is expensive.  Wherever possible,
		//		reuse the returned object.
		//
		//		Use the dojo.style() method for more consistent (pixelized)
		//		return values.
		//
		//	node: DOMNode
		//		A reference to a DOM node. Does NOT support taking an
		//		ID string for speed reasons.
		//	example:
		//	|	dojo.getComputedStyle(dojo.byId('foo')).borderWidth;
		//
		//	example:
		//	Reusing the returned object, avoiding multiple lookups:
		//	|	var cs = dojo.getComputedStyle(dojo.byId("someNode"));
		//	|	var w = cs.width, h = cs.height;
		return; // CSS2Properties
	}
=====*/

	// Although we normally eschew argument validation at this
	// level, here we test argument 'node' for (duck)type,
	// by testing nodeType, ecause 'document' is the 'parentNode' of 'body'
	// it is frequently sent to this function even 
	// though it is not Element.
	var gcs;
		if(d.isWebKit){
			gcs = function(/*DomNode*/node){
			var s;
			if(node.nodeType == 1){
				var dv = node.ownerDocument.defaultView;
				s = dv.getComputedStyle(node, null);
				if(!s && node.style){ 
					node.style.display = ""; 
					s = dv.getComputedStyle(node, null);
				}
			}
			return s || {};
		}; 
		}else if(d.isIE){
		gcs = function(node){
			// IE (as of 7) doesn't expose Element like sane browsers
			return node.nodeType == 1 /* ELEMENT_NODE*/ ? node.currentStyle : {};
		};
	}else{
		gcs = function(node){
			return node.nodeType == 1 ? 
				node.ownerDocument.defaultView.getComputedStyle(node, null) : {};
		};
	}
		dojo.getComputedStyle = gcs;

		if(!d.isIE){
			d._toPixelValue = function(element, value){
			// style values can be floats, client code may want
			// to round for integer pixels.
			return parseFloat(value) || 0; 
		};
		}else{
		d._toPixelValue = function(element, avalue){
			if(!avalue){ return 0; }
			// on IE7, medium is usually 4 pixels
			if(avalue == "medium"){ return 4; }
			// style values can be floats, client code may
			// want to round this value for integer pixels.
			if(avalue.slice && avalue.slice(-2) == 'px'){ return parseFloat(avalue); }
			with(element){
				var sLeft = style.left;
				var rsLeft = runtimeStyle.left;
				runtimeStyle.left = currentStyle.left;
				try{
					// 'avalue' may be incompatible with style.left, which can cause IE to throw
					// this has been observed for border widths using "thin", "medium", "thick" constants
					// those particular constants could be trapped by a lookup
					// but perhaps there are more
					style.left = avalue;
					avalue = style.pixelLeft;
				}catch(e){
					avalue = 0;
				}
				style.left = sLeft;
				runtimeStyle.left = rsLeft;
			}
			return avalue;
		}
	}
		var px = d._toPixelValue;

	// FIXME: there opacity quirks on FF that we haven't ported over. Hrm.
	/*=====
	dojo._getOpacity = function(node){
			//	summary:
			//		Returns the current opacity of the passed node as a
			//		floating-point value between 0 and 1.
			//	node: DomNode
			//		a reference to a DOM node. Does NOT support taking an
			//		ID string for speed reasons.
			//	returns: Number between 0 and 1
			return; // Number
	}
	=====*/

		var astr = "DXImageTransform.Microsoft.Alpha";
	var af = function(n, f){ 
		try{
			return n.filters.item(astr);
		}catch(e){
			return f ? {} : null;
		}
	};

		dojo._getOpacity = 
			d.isIE ? function(node){
			try{
				return af(node).Opacity / 100; // Number
			}catch(e){
				return 1; // Number
			}
		} : 
			function(node){
			return gcs(node).opacity;
		};

	/*=====
	dojo._setOpacity = function(node, opacity){
			//	summary:
			//		set the opacity of the passed node portably. Returns the
			//		new opacity of the node.
			//	node: DOMNode
			//		a reference to a DOM node. Does NOT support taking an
			//		ID string for performance reasons.
			//	opacity: Number
			//		A Number between 0 and 1. 0 specifies transparent.
			//	returns: Number between 0 and 1
			return; // Number
	}
	=====*/

	dojo._setOpacity = 
				d.isIE ? function(/*DomNode*/node, /*Number*/opacity){
			var ov = opacity * 100;
			node.style.zoom = 1.0;

			// on IE7 Alpha(Filter opacity=100) makes text look fuzzy so disable it altogether (bug #2661),
			//but still update the opacity value so we can get a correct reading if it is read later.
			af(node, 1).Enabled = !(opacity == 1);

			if(!af(node)){
				node.style.filter += " progid:" + astr + "(Opacity=" + ov + ")";
			}else{
				af(node, 1).Opacity = ov;
			}

			if(node.nodeName.toLowerCase() == "tr"){
				d.query("> td", node).forEach(function(i){
					d._setOpacity(i, opacity);
				});
			}
			return opacity;
		} : 
				function(node, opacity){
			return node.style.opacity = opacity;
		};

	var _pixelNamesCache = {
		left: true, top: true
	};
	var _pixelRegExp = /margin|padding|width|height|max|min|offset/;  // |border
	var _toStyleValue = function(node, type, value){
		type = type.toLowerCase(); // FIXME: should we really be doing string case conversion here? Should we cache it? Need to profile!
				if(d.isIE){
			if(value == "auto"){
				if(type == "height"){ return node.offsetHeight; }
				if(type == "width"){ return node.offsetWidth; }
			}
			if(type == "fontweight"){
				switch(value){
					case 700: return "bold";
					case 400:
					default: return "normal";
				}
			}
		}
				if(!(type in _pixelNamesCache)){
			_pixelNamesCache[type] = _pixelRegExp.test(type);
		}
		return _pixelNamesCache[type] ? px(node, value) : value;
	};

	var _floatStyle = d.isIE ? "styleFloat" : "cssFloat",
		_floatAliases = { "cssFloat": _floatStyle, "styleFloat": _floatStyle, "float": _floatStyle }
	;
	
	// public API
	
	dojo.style = function(	/*DomNode|String*/ node, 
							/*String?|Object?*/ style, 
							/*String?*/ value){
		//	summary:
		//		Accesses styles on a node. If 2 arguments are
		//		passed, acts as a getter. If 3 arguments are passed, acts
		//		as a setter.
		//	description:
		//		Getting the style value uses the computed style for the node, so the value
		//		will be a calculated value, not just the immediate node.style value.
		//		Also when getting values, use specific style names,
		//		like "borderBottomWidth" instead of "border" since compound values like
		//		"border" are not necessarily reflected as expected.
		//		If you want to get node dimensions, use dojo.marginBox() or
		//		dojo.contentBox(). 
		//	node:
		//		id or reference to node to get/set style for
		//	style:
		//		the style property to set in DOM-accessor format
		//		("borderWidth", not "border-width") or an object with key/value
		//		pairs suitable for setting each property.
		//	value:
		//		If passed, sets value on the node for style, handling
		//		cross-browser concerns.  When setting a pixel value,
		//		be sure to include "px" in the value. For instance, top: "200px".
		//		Otherwise, in some cases, some browsers will not apply the style.
		//	example:
		//		Passing only an ID or node returns the computed style object of
		//		the node:
		//	|	dojo.style("thinger");
		//	example:
		//		Passing a node and a style property returns the current
		//		normalized, computed value for that property:
		//	|	dojo.style("thinger", "opacity"); // 1 by default
		//
		//	example:
		//		Passing a node, a style property, and a value changes the
		//		current display of the node and returns the new computed value
		//	|	dojo.style("thinger", "opacity", 0.5); // == 0.5
		//
		//	example:
		//		Passing a node, an object-style style property sets each of the values in turn and returns the computed style object of the node:
		//	|	dojo.style("thinger", {
		//	|		"opacity": 0.5,
		//	|		"border": "3px solid black",
		//	|		"height": "300px"
		//	|	});
		//
		// 	example:
		//		When the CSS style property is hyphenated, the JavaScript property is camelCased.
		//		font-size becomes fontSize, and so on.
		//	|	dojo.style("thinger",{
		//	|		fontSize:"14pt",
		//	|		letterSpacing:"1.2em"
		//	|	});
		//
		//	example:
		//		dojo.NodeList implements .style() using the same syntax, omitting the "node" parameter, calling
		//		dojo.style() on every element of the list. See: dojo.query and dojo.NodeList
		//	|	dojo.query(".someClassName").style("visibility","hidden");
		//	|	// or
		//	|	dojo.query("#baz > div").style({
		//	|		opacity:0.75,
		//	|		fontSize:"13pt"
		//	|	});

		var n = byId(node), args = arguments.length, op = (style == "opacity");
		style = _floatAliases[style] || style;
		if(args == 3){
			return op ? d._setOpacity(n, value) : n.style[style] = value; /*Number*/
		}
		if(args == 2 && op){
			return d._getOpacity(n);
		}
		var s = gcs(n);
		if(args == 2 && !isString(style)){
			for(var x in style){
				d.style(node, x, style[x]);
			}
			return s;
		}
		return (args == 1) ? s : _toStyleValue(n, style, s[style] || n.style[style]); /* CSS2Properties||String||Number */
	}

	// =============================
	// Box Functions
	// =============================

	dojo._getPadExtents = function(/*DomNode*/n, /*Object*/computedStyle){
		//	summary:
		// 		Returns object with special values specifically useful for node
		// 		fitting.
		//	description:
		//		Returns an object with `w`, `h`, `l`, `t` properties:
		//	|		l/t = left/top padding (respectively)
		//	|		w = the total of the left and right padding 
		//	|		h = the total of the top and bottom padding
		//		If 'node' has position, l/t forms the origin for child nodes. 
		//		The w/h are used for calculating boxes.
		//		Normally application code will not need to invoke this
		//		directly, and will use the ...box... functions instead.
		var 
			s = computedStyle||gcs(n), 
			l = px(n, s.paddingLeft), 
			t = px(n, s.paddingTop);
		return { 
			l: l,
			t: t,
			w: l+px(n, s.paddingRight),
			h: t+px(n, s.paddingBottom)
		};
	}

	dojo._getBorderExtents = function(/*DomNode*/n, /*Object*/computedStyle){
		//	summary:
		//		returns an object with properties useful for noting the border
		//		dimensions.
		//	description:
		// 		* l/t = the sum of left/top border (respectively)
		//		* w = the sum of the left and right border
		//		* h = the sum of the top and bottom border
		//
		//		The w/h are used for calculating boxes.
		//		Normally application code will not need to invoke this
		//		directly, and will use the ...box... functions instead.
		var 
			ne = "none",
			s = computedStyle||gcs(n), 
			bl = (s.borderLeftStyle != ne ? px(n, s.borderLeftWidth) : 0),
			bt = (s.borderTopStyle != ne ? px(n, s.borderTopWidth) : 0);
		return { 
			l: bl,
			t: bt,
			w: bl + (s.borderRightStyle!=ne ? px(n, s.borderRightWidth) : 0),
			h: bt + (s.borderBottomStyle!=ne ? px(n, s.borderBottomWidth) : 0)
		};
	}

	dojo._getPadBorderExtents = function(/*DomNode*/n, /*Object*/computedStyle){
		//	summary:
		//		Returns object with properties useful for box fitting with
		//		regards to padding.
		// description:
		//		* l/t = the sum of left/top padding and left/top border (respectively)
		//		* w = the sum of the left and right padding and border
		//		* h = the sum of the top and bottom padding and border
		//
		//		The w/h are used for calculating boxes.
		//		Normally application code will not need to invoke this
		//		directly, and will use the ...box... functions instead.
		var 
			s = computedStyle||gcs(n), 
			p = d._getPadExtents(n, s),
			b = d._getBorderExtents(n, s);
		return { 
			l: p.l + b.l,
			t: p.t + b.t,
			w: p.w + b.w,
			h: p.h + b.h
		};
	}

	dojo._getMarginExtents = function(n, computedStyle){
		//	summary:
		//		returns object with properties useful for box fitting with
		//		regards to box margins (i.e., the outer-box).
		//
		//		* l/t = marginLeft, marginTop, respectively
		//		* w = total width, margin inclusive
		//		* h = total height, margin inclusive
		//
		//		The w/h are used for calculating boxes.
		//		Normally application code will not need to invoke this
		//		directly, and will use the ...box... functions instead.
		var 
			s = computedStyle||gcs(n), 
			l = px(n, s.marginLeft),
			t = px(n, s.marginTop),
			r = px(n, s.marginRight),
			b = px(n, s.marginBottom);
		if(d.isWebKit && (s.position != "absolute")){
			// FIXME: Safari's version of the computed right margin
			// is the space between our right edge and the right edge 
			// of our offsetParent. 
			// What we are looking for is the actual margin value as 
			// determined by CSS.
			// Hack solution is to assume left/right margins are the same.
			r = l;
		}
		return { 
			l: l,
			t: t,
			w: l+r,
			h: t+b
		};
	}

	// Box getters work in any box context because offsetWidth/clientWidth
	// are invariant wrt box context
	//
	// They do *not* work for display: inline objects that have padding styles
	// because the user agent ignores padding (it's bogus styling in any case)
	//
	// Be careful with IMGs because they are inline or block depending on 
	// browser and browser mode.

	// Although it would be easier to read, there are not separate versions of 
	// _getMarginBox for each browser because:
	// 1. the branching is not expensive
	// 2. factoring the shared code wastes cycles (function call overhead)
	// 3. duplicating the shared code wastes bytes
	
	dojo._getMarginBox = function(/*DomNode*/node, /*Object*/computedStyle){
		// summary:
		//		returns an object that encodes the width, height, left and top
		//		positions of the node's margin box.
		var s = computedStyle || gcs(node), me = d._getMarginExtents(node, s);
		var l = node.offsetLeft - me.l, t = node.offsetTop - me.t, p = node.parentNode;
				if(d.isMoz){
			// Mozilla:
			// If offsetParent has a computed overflow != visible, the offsetLeft is decreased
			// by the parent's border.
			// We don't want to compute the parent's style, so instead we examine node's
			// computed left/top which is more stable.
			var sl = parseFloat(s.left), st = parseFloat(s.top);
			if(!isNaN(sl) && !isNaN(st)){
				l = sl, t = st;
			}else{
				// If child's computed left/top are not parseable as a number (e.g. "auto"), we
				// have no choice but to examine the parent's computed style.
				if(p && p.style){
					var pcs = gcs(p);
					if(pcs.overflow != "visible"){
						var be = d._getBorderExtents(p, pcs);
						l += be.l, t += be.t;
					}
				}
			}
		}else if(d.isOpera || (d.isIE > 7 && !d.isQuirks)){
			// On Opera and IE 8, offsetLeft/Top includes the parent's border
			if(p){
				be = d._getBorderExtents(p);
				l -= be.l;
				t -= be.t;
			}
		}
				return { 
			l: l, 
			t: t, 
			w: node.offsetWidth + me.w, 
			h: node.offsetHeight + me.h 
		};
	}
	
	dojo._getContentBox = function(node, computedStyle){
		// summary:
		//		Returns an object that encodes the width, height, left and top
		//		positions of the node's content box, irrespective of the
		//		current box model.

		// clientWidth/Height are important since the automatically account for scrollbars
		// fallback to offsetWidth/Height for special cases (see #3378)
		var s = computedStyle || gcs(node),
			pe = d._getPadExtents(node, s),
			be = d._getBorderExtents(node, s),
			w = node.clientWidth, 
			h
		;
		if(!w){
			w = node.offsetWidth, h = node.offsetHeight;
		}else{
			h = node.clientHeight, be.w = be.h = 0; 
		}
		// On Opera, offsetLeft includes the parent's border
				if(d.isOpera){ pe.l += be.l; pe.t += be.t; };
				return { 
			l: pe.l, 
			t: pe.t, 
			w: w - pe.w - be.w, 
			h: h - pe.h - be.h
		};
	}

	dojo._getBorderBox = function(node, computedStyle){
		var s = computedStyle || gcs(node), 
			pe = d._getPadExtents(node, s),
			cb = d._getContentBox(node, s)
		;
		return { 
			l: cb.l - pe.l, 
			t: cb.t - pe.t, 
			w: cb.w + pe.w, 
			h: cb.h + pe.h
		};
	}

	// Box setters depend on box context because interpretation of width/height styles
	// vary wrt box context.
	//
	// The value of dojo.boxModel is used to determine box context.
	// dojo.boxModel can be set directly to change behavior.
	//
	// Beware of display: inline objects that have padding styles
	// because the user agent ignores padding (it's a bogus setup anyway)
	//
	// Be careful with IMGs because they are inline or block depending on 
	// browser and browser mode.
	// 
	// Elements other than DIV may have special quirks, like built-in
	// margins or padding, or values not detectable via computedStyle.
	// In particular, margins on TABLE do not seems to appear 
	// at all in computedStyle on Mozilla.
	
	dojo._setBox = function(/*DomNode*/node, /*Number?*/l, /*Number?*/t, /*Number?*/w, /*Number?*/h, /*String?*/u){
		//	summary:
		//		sets width/height/left/top in the current (native) box-model
		//		dimentions. Uses the unit passed in u.
		//	node:
		//		DOM Node reference. Id string not supported for performance
		//		reasons.
		//	l:
		//		left offset from parent.
		//	t:
		//		top offset from parent.
		//	w:
		//		width in current box model.
		//	h:
		//		width in current box model.
		//	u: 
		//		unit measure to use for other measures. Defaults to "px".
		u = u || "px";
		var s = node.style;
		if(!isNaN(l)){ s.left = l + u; }
		if(!isNaN(t)){ s.top = t + u; }
		if(w >= 0){ s.width = w + u; }
		if(h >= 0){ s.height = h + u; }
	}

	dojo._isButtonTag = function(/*DomNode*/node) {
		// summary:
		//		True if the node is BUTTON or INPUT.type="button".
		return node.tagName == "BUTTON" 
			|| node.tagName=="INPUT" && node.getAttribute("type").toUpperCase() == "BUTTON"; // boolean
	}
	
	dojo._usesBorderBox = function(/*DomNode*/node){
		//	summary: 
		//		True if the node uses border-box layout.

		// We could test the computed style of node to see if a particular box
		// has been specified, but there are details and we choose not to bother.
		
		// TABLE and BUTTON (and INPUT type=button) are always border-box by default.
		// If you have assigned a different box to either one via CSS then
		// box functions will break.
		
		var n = node.tagName;
		return d.boxModel=="border-box" || n=="TABLE" || d._isButtonTag(node); // boolean
	}

	dojo._setContentSize = function(/*DomNode*/node, /*Number*/widthPx, /*Number*/heightPx, /*Object*/computedStyle){
		//	summary:
		//		Sets the size of the node's contents, irrespective of margins,
		//		padding, or borders.
		if(d._usesBorderBox(node)){
			var pb = d._getPadBorderExtents(node, computedStyle);
			if(widthPx >= 0){ widthPx += pb.w; }
			if(heightPx >= 0){ heightPx += pb.h; }
		}
		d._setBox(node, NaN, NaN, widthPx, heightPx);
	}

	dojo._setMarginBox = function(/*DomNode*/node, 	/*Number?*/leftPx, /*Number?*/topPx, 
													/*Number?*/widthPx, /*Number?*/heightPx, 
													/*Object*/computedStyle){
		//	summary:
		//		sets the size of the node's margin box and placement
		//		(left/top), irrespective of box model. Think of it as a
		//		passthrough to dojo._setBox that handles box-model vagaries for
		//		you.

		var s = computedStyle || gcs(node),
		// Some elements have special padding, margin, and box-model settings. 
		// To use box functions you may need to set padding, margin explicitly.
		// Controlling box-model is harder, in a pinch you might set dojo.boxModel.
			bb = d._usesBorderBox(node),
			pb = bb ? _nilExtents : d._getPadBorderExtents(node, s)
		;
		if(d.isWebKit){
			// on Safari (3.1.2), button nodes with no explicit size have a default margin
			// setting an explicit size eliminates the margin.
			// We have to swizzle the width to get correct margin reading.
			if(d._isButtonTag(node)){
				var ns = node.style;
				if(widthPx >= 0 && !ns.width) { ns.width = "4px"; }
				if(heightPx >= 0 && !ns.height) { ns.height = "4px"; }
			}
		}
		var mb = d._getMarginExtents(node, s);
		if(widthPx >= 0){ widthPx = Math.max(widthPx - pb.w - mb.w, 0); }
		if(heightPx >= 0){ heightPx = Math.max(heightPx - pb.h - mb.h, 0); }
		d._setBox(node, leftPx, topPx, widthPx, heightPx);
	}
	
	var _nilExtents = { l:0, t:0, w:0, h:0 };

	// public API
	
	dojo.marginBox = function(/*DomNode|String*/node, /*Object?*/box){
		//	summary:
		//		Getter/setter for the margin-box of node.
		//	description: 
		//		Returns an object in the expected format of box (regardless
		//		if box is passed). The object might look like:
		//			`{ l: 50, t: 200, w: 300: h: 150 }`
		//		for a node offset from its parent 50px to the left, 200px from
		//		the top with a margin width of 300px and a margin-height of
		//		150px.
		//	node:
		//		id or reference to DOM Node to get/set box for
		//	box:
		//		If passed, denotes that dojo.marginBox() should
		//		update/set the margin box for node. Box is an object in the
		//		above format. All properties are optional if passed.
		var n = byId(node), s = gcs(n), b = box;
		return !b ? d._getMarginBox(n, s) : d._setMarginBox(n, b.l, b.t, b.w, b.h, s); // Object
	}

	dojo.contentBox = function(/*DomNode|String*/node, /*Object?*/box){
		//	summary:
		//		Getter/setter for the content-box of node.
		//	description:
		//		Returns an object in the expected format of box (regardless if box is passed).
		//		The object might look like:
		//			`{ l: 50, t: 200, w: 300: h: 150 }`
		//		for a node offset from its parent 50px to the left, 200px from
		//		the top with a content width of 300px and a content-height of
		//		150px. Note that the content box may have a much larger border
		//		or margin box, depending on the box model currently in use and
		//		CSS values set/inherited for node.
		//	node:
		//		id or reference to DOM Node to get/set box for
		//	box:
		//		If passed, denotes that dojo.contentBox() should
		//		update/set the content box for node. Box is an object in the
		//		above format. All properties are optional if passed.
		var n = byId(node), s = gcs(n), b = box;
		return !b ? d._getContentBox(n, s) : d._setContentSize(n, b.w, b.h, s); // Object
	}
	
	// =============================
	// Positioning 
	// =============================
	
	var _sumAncestorProperties = function(node, prop){
		if(!(node = (node||0).parentNode)){return 0}
		var val, retVal = 0, _b = d.body();
		while(node && node.style){
			if(gcs(node).position == "fixed"){
				return 0;
			}
			val = node[prop];
			if(val){
				retVal += val - 0;
				// opera and khtml #body & #html has the same values, we only
				// need one value
				if(node == _b){ break; }
			}
			node = node.parentNode;
		}
		return retVal;	//	integer
	}

	dojo._docScroll = function(){
		var 
			_b = d.body(),
			_w = d.global,
			de = d.doc.documentElement;
		return {
			y: (_w.pageYOffset || de.scrollTop || _b.scrollTop || 0),
			x: (_w.pageXOffset || d._fixIeBiDiScrollLeft(de.scrollLeft) || _b.scrollLeft || 0)
		};
	};
	
	dojo._isBodyLtr = function(){
		//FIXME: could check html and body tags directly instead of computed style?  need to ignore case, accept empty values
		return ("_bodyLtr" in d) ? d._bodyLtr :
			d._bodyLtr = gcs(d.body()).direction == "ltr"; // Boolean 
	}
	
		dojo._getIeDocumentElementOffset = function(){
		//	summary:
		//		returns the offset in x and y from the document body to the
		//		visual edge of the page
		//	description:
		// The following values in IE contain an offset:
		//	|		event.clientX
		//	|		event.clientY
		//	|		node.getBoundingClientRect().left
		//	|		node.getBoundingClientRect().top
		//	 	But other position related values do not contain this offset,
		//	 	such as node.offsetLeft, node.offsetTop, node.style.left and
		//	 	node.style.top. The offset is always (2, 2) in LTR direction.
		//	 	When the body is in RTL direction, the offset counts the width
		//	 	of left scroll bar's width.  This function computes the actual
		//	 	offset.

		//NOTE: assumes we're being called in an IE browser

		var de = d.doc.documentElement;
		//FIXME: use this instead?			var de = d.compatMode == "BackCompat" ? d.body : d.documentElement;

		if(d.isIE < 7){
			return { x: d._isBodyLtr() || window.parent == window ?
				de.clientLeft : de.offsetWidth - de.clientWidth - de.clientLeft, 
				y: de.clientTop }; // Object
		}else if(d.isIE < 8){
			return {x: de.getBoundingClientRect().left, y: de.getBoundingClientRect().top};
		}else{
			return {
				x: 0,
				y: 0
			};
		}

	};
		
	dojo._fixIeBiDiScrollLeft = function(/*Integer*/ scrollLeft){
		// In RTL direction, scrollLeft should be a negative value, but IE < 8
		// returns a positive one. All codes using documentElement.scrollLeft
		// must call this function to fix this error, otherwise the position
		// will offset to right when there is a horizontal scrollbar.

				var dd = d.doc;
		if(d.isIE < 8 && !d._isBodyLtr()){
			var de = dd.compatMode == "BackCompat" ? dd.body : dd.documentElement;
			return scrollLeft + de.clientWidth - de.scrollWidth; // Integer
		}
				return scrollLeft; // Integer
	}

	dojo._abs = function(/*DomNode*/node, /*Boolean?*/includeScroll){
		//	summary:
		//		Gets the position of the passed element relative to
		//		the viewport (if includeScroll==false), or relative to the
		//		document root (if includeScroll==true).
		//
		//		Returns an object of the form:
		//			{ x: 100, y: 300 }
		//		if includeScroll is passed, the x and y values will include any
		//		document offsets that may affect the position relative to the
		//		viewport.

		// FIXME: need to decide in the brave-new-world if we're going to be
		// margin-box or border-box.
		
		// targetBoxType == "border-box"
		var db = d.body(), dh = d.body().parentNode, ret;
		if(node["getBoundingClientRect"]){
			// IE6+, FF3+, super-modern WebKit, and Opera 9.6+ all take this branch
			var client = node.getBoundingClientRect();
			ret = { x: client.left, y: client.top };
					if(d.isFF >= 3){
				// in FF3 you have to subtract the document element margins
				var cs = gcs(dh);
				ret.x -= px(dh, cs.marginLeft) + px(dh, cs.borderLeftWidth);
				ret.y -= px(dh, cs.marginTop) + px(dh, cs.borderTopWidth);
			}
			if(d.isIE){
				// On IE there's a 2px offset that we need to adjust for, see _getIeDocumentElementOffset()
				var offset = d._getIeDocumentElementOffset();

				// fixes the position in IE, quirks mode
				ret.x -= offset.x + (d.isQuirks ? db.clientLeft : 0);
				ret.y -= offset.y + (d.isQuirks ? db.clientTop : 0);
			}
				}else{
			// FF2 and Safari
			ret = {
				x: 0,
				y: 0
			};
			if(node["offsetParent"]){
				ret.x -= _sumAncestorProperties(node, "scrollLeft");
				ret.y -= _sumAncestorProperties(node, "scrollTop");
				
				var curnode = node;
				do{
					var n = curnode.offsetLeft,
						t = curnode.offsetTop;
					ret.x += isNaN(n) ? 0 : n;
					ret.y += isNaN(t) ? 0 : t;

					cs = gcs(curnode);
					if(curnode != node){
								if(d.isFF){
							// tried left+right with differently sized left/right borders
							// it really is 2xleft border in FF, not left+right, even in RTL!
							ret.x += 2 * px(curnode,cs.borderLeftWidth);
							ret.y += 2 * px(curnode,cs.borderTopWidth);
						}else{
									ret.x += px(curnode, cs.borderLeftWidth);
							ret.y += px(curnode, cs.borderTopWidth);
								}
							}
					// static children in a static div in FF2 are affected by the div's border as well
					// but offsetParent will skip this div!
							if(d.isFF && cs.position=="static"){
						var parent=curnode.parentNode;
						while(parent!=curnode.offsetParent){
							var pcs=gcs(parent);
							if(pcs.position=="static"){
								ret.x += px(curnode,pcs.borderLeftWidth);
								ret.y += px(curnode,pcs.borderTopWidth);
							}
							parent=parent.parentNode;
						}
					}
							curnode = curnode.offsetParent;
				}while((curnode != dh) && curnode);
			}else if(node.x && node.y){
				ret.x += isNaN(node.x) ? 0 : node.x;
				ret.y += isNaN(node.y) ? 0 : node.y;
			}
		}
		// account for document scrolling
		// if offsetParent is used, ret value already includes scroll position
		// so we may have to actually remove that value if !includeScroll
		if(includeScroll){
			var scroll = d._docScroll();
			ret.x += scroll.x;
			ret.y += scroll.y;
		}

		return ret; // Object
	}

	// FIXME: need a setter for coords or a moveTo!!
	dojo.coords = function(/*DomNode|String*/node, /*Boolean?*/includeScroll){
		//	summary:
		//		Returns an object that measures margin box width/height and
		//		absolute positioning data from dojo._abs().
		//
		//	description:
		//		Returns an object that measures margin box width/height and
		//		absolute positioning data from dojo._abs().
		//		Return value will be in the form:
		//|			{ l: 50, t: 200, w: 300: h: 150, x: 100, y: 300 }
		//		Does not act as a setter. If includeScroll is passed, the x and
		//		y params are affected as one would expect in dojo._abs().
		var n = byId(node), s = gcs(n), mb = d._getMarginBox(n, s);
		var abs = d._abs(n, includeScroll);
		mb.x = abs.x;
		mb.y = abs.y;
		return mb;
	}

	// =============================
	// Element attribute Functions
	// =============================

		var ieLT8 = d.isIE < 8;
	
	var _fixAttrName = function(/*String*/name){
		switch(name.toLowerCase()){
			// Internet Explorer will only set or remove tabindex/readonly
			// if it is spelled "tabIndex"/"readOnly"
						case "tabindex":
				return ieLT8 ? "tabIndex" : "tabindex";
						case "readonly":
				return "readOnly";
			case "class":
				return "className";
						case "for": case "htmlfor":
				// to pick up for attrib set in markup via getAttribute() IE<8 uses "htmlFor" and others use "for"
				// get/setAttribute works in all as long use same value for both get/set
				return ieLT8 ? "htmlFor" : "for";
						default:
				return name;
		}
	}

	// non-deprecated HTML4 attributes with default values
	// http://www.w3.org/TR/html401/index/attributes.html
	// FF and Safari will return the default values if you
	// access the attributes via a property but not
	// via getAttribute()
	var _attrProps = {
		colspan: "colSpan",
		enctype: "enctype",
		frameborder: "frameborder",
		method: "method",
		rowspan: "rowSpan",
		scrolling: "scrolling",
		shape: "shape",
		span: "span",
		type: "type",
		valuetype: "valueType",
		// the following attributes don't have the default but should be treated like properties
		classname: "className",
		innerhtml: "innerHTML"
	};

	dojo.hasAttr = function(/*DomNode|String*/node, /*String*/name){
		//	summary:
		//		Returns true if the requested attribute is specified on the
		//		given element, and false otherwise.
		//	node:
		//		id or reference to the element to check
		//	name:
		//		the name of the attribute
		//	returns:
		//		true if the requested attribute is specified on the
		//		given element, and false otherwise
		node = byId(node);
		var fixName = _fixAttrName(name);
		fixName = fixName == "htmlFor" ? "for" : fixName; //IE<8 uses htmlFor except in this case
		var attr = node.getAttributeNode && node.getAttributeNode(fixName);
		return attr ? attr.specified : false; // Boolean
	}

	var _evtHdlrMap = {}, _ctr = 0,
		_attrId = dojo._scopeName + "attrid",
		// the next dictionary lists elements with read-only innerHTML on IE
		_roInnerHtml = {col: 1, colgroup: 1,
			// frameset: 1, head: 1, html: 1, style: 1,
			table: 1, tbody: 1, tfoot: 1, thead: 1, tr: 1, title: 1};

	dojo.attr = function(/*DomNode|String*/node, /*String|Object*/name, /*String?*/value){
		//	summary:
		//		Gets or sets an attribute on an HTML element.
		//	description:
		//		Handles normalized getting and setting of attributes on DOM
		//		Nodes. If 2 arguments are passed, and a the second argumnt is a
		//		string, acts as a getter.
		//	
		//		If a third argument is passed, or if the second argumnt is a
		//		map of attributes, acts as a setter.
		//
		//		When passing functions as values, note that they will not be
		//		directly assigned to slots on the node, but rather the default
		//		behavior will be removed and the new behavior will be added
		//		using `dojo.connect()`, meaning that event handler properties
		//		will be normalized and that some caveats with regards to
		//		non-standard behaviors for onsubmit apply. Namely that you
		//		should cancel form submission using `dojo.stopEvent()` on the
		//		passed event object instead of returning a boolean value from
		//		the handler itself.
		//	node:
		//		id or reference to the element to get or set the attribute on
		//	name:
		//		the name of the attribute to get or set.
		//	value:
		//		The value to set for the attribute
		//	returns:
		//		when used as a getter, the value of the requested attribute
		//		or null if that attribute does not have a specified or
		//		default value;
		//
		//		when used as a setter, undefined
		//
		//	example:
		//	|	// get the current value of the "foo" attribute on a node
		//	|	dojo.attr(dojo.byId("nodeId"), "foo");
		//	|	// or we can just pass the id:
		//	|	dojo.attr("nodeId", "foo");
		//
		//	example:
		//	|	// use attr() to set the tab index
		//	|	dojo.attr("nodeId", "tabindex", 3);
		//	|
		//
		//	example:
		//	Set multiple values at once, including event handlers:
		//	|	dojo.attr("formId", {
		//	|		"foo": "bar",
		//	|		"tabindex": -1,
		//	|		"method": "POST",
		//	|		"onsubmit": function(e){
		//	|			// stop submitting the form. Note that the IE behavior
		//	|			// of returning true or false will have no effect here
		//	|			// since our handler is connect()ed to the built-in
		//	|			// onsubmit behavior and so we need to use
		//	|			// dojo.stopEvent() to ensure that the submission
		//	|			// doesn't proceed.
		//	|			dojo.stopEvent(e);
		//	|
		//	|			// submit the form with Ajax
		//	|			dojo.xhrPost({ form: "formId" });
		//	|		}
		//	|	});
		//
		//	example:
		//	Style is s special case: Only set with an object hash of styles
		//	|	dojo.attr("someNode",{
		//	|		id:"bar",
		//	|		style:{
		//	|			width:"200px", height:"100px", color:"#000"
		//	|		}
		//	|	});
		//
		//	example:
		//	Again, only set style as an object hash of styles:
		//	|	var obj = { color:"#fff", backgroundColor:"#000" };
		//	|	dojo.attr("someNode", "style", obj);
		//	|
		//	|	// though shorter to use `dojo.style` in this case:
		//	|	dojo.style("someNode", obj);
		
		node = byId(node);
		var args = arguments.length;
		if(args == 2 && !isString(name)){
			// the object form of setter: the 2nd argument is a dictionary
			for(var x in name){
				d.attr(node, x, name[x]);
			}
			// FIXME: return the node in this case? could be useful.
			return;
		}
		name = _fixAttrName(name);
		if(args == 3){ // setter
			if(d.isFunction(value)){
				// clobber if we can
				var attrId = d.attr(node, _attrId);
				if(!attrId){
					attrId = _ctr++;
					d.attr(node, _attrId, attrId);
				}
				if(!_evtHdlrMap[attrId]){
					_evtHdlrMap[attrId] = {};
				}
				var h = _evtHdlrMap[attrId][name];
				if(h){
					d.disconnect(h);
				}else{
					try{
						delete node[name];
					}catch(e){}
				}

				// ensure that event objects are normalized, etc.
				_evtHdlrMap[attrId][name] = d.connect(node, name, value);

			}else if(typeof value == "boolean"){ // e.g. onsubmit, disabled
				node[name] = value;
			}else if(name === "style" && !isString(value)){
				// when the name is "style" and value is an object, pass along
				d.style(node, value);
			}else if(name == "className"){
				node.className = value;
			}else if(name === "innerHTML"){
								if(d.isIE && node.tagName.toLowerCase() in _roInnerHtml){
					d.empty(node);
					node.appendChild(d._toDom(value, node.ownerDocument));
				}else{
									node[name] = value;
								}
							}else{
				node.setAttribute(name, value);
			}
		}else{
			// getter
			// should we access this attribute via a property or
			// via getAttribute()?
			var prop = _attrProps[name.toLowerCase()];
			if(prop){
				return node[prop];
			}
			var attrValue = node[name];
			return (typeof attrValue == 'boolean' || typeof attrValue == 'function') ? attrValue
				: (d.hasAttr(node, name) ? node.getAttribute(name) : null);
		}
	}

	dojo.removeAttr = function(/*DomNode|String*/node, /*String*/name){
		//	summary:
		//		Removes an attribute from an HTML element.
		//	node:
		//		id or reference to the element to remove the attribute from
		//	name:
		//		the name of the attribute to remove
		byId(node).removeAttribute(_fixAttrName(name));
	}
	
	dojo.create = function(tag, attrs, refNode, pos){
		//	summary:
		//		Create an element, allowing for optional attribute decoration
		//		and placement. 
		//
		// description:
		//		A DOM Element creation function. A shorthand method for creating a node or
		//		a fragment, and allowing for a convenient optional attribute setting step, 
		//		as well as an optional DOM placement reference.
		//|
		//		Attributes are set by passing the optional object through `dojo.attr`.
		//		See `dojo.attr` for noted caveats and nuances, and API if applicable. 
		//|
		//		Placement is done via `dojo.place`, assuming the new node to be the action 
		//		node, passing along the optional reference node and position. 
		//
		// tag: String|DomNode
		//		A string of the element to create (eg: "div", "a", "p", "li", "script", "br"),
		//		or an existing DOM node to process.
		//
		// attrs: Object
		//		An object-hash of attributes to set on the newly created node.
		//		Can be null, if you don't want to set any attributes/styles.
		//		See: `dojo.attr` for a description of available attributes.
		//
		// refNode: String?|DomNode?
		//		Optional reference node. Used by `dojo.place` to place the newly created
		//		node somewhere in the dom relative to refNode. Can be a DomNode reference
		//		or String ID of a node.
		//	
		// pos: String?
		//		Optional positional reference. Defaults to "last" by way of `dojo.place`,
		//		though can be set to "first","after","before","last", "replace" or "only"
		//		to further control the placement of the new node relative to the refNode.
		//		'refNode' is required if a 'pos' is specified.
		//
		// returns: DomNode
		//
		// example:
		//	Create a DIV:
		//	| var n = dojo.create("div");
		//
		// example:
		//	Create a DIV with content:
		//	| var n = dojo.create("div", { innerHTML:"<p>hi</p>" });
		//
		// example:
		//	Place a new DIV in the BODY, with no attributes set
		//	| var n = dojo.create("div", null, dojo.body());
		//
		// example:
		//	Create an UL, and populate it with LI's. Place the list as the first-child of a 
		//	node with id="someId":
		//	| var ul = dojo.create("ul", null, "someId", "first"); 
		//	| var items = ["one", "two", "three", "four"];
		//	| dojo.forEach(items, function(data){
		//	|	dojo.create("li", { innerHTML: data }, ul);
		//	| });
		//
		// example:
		//	Create an anchor, with an href. Place in BODY:
		//	| dojo.create("a", { href:"foo.html", title:"Goto FOO!" }, dojo.body());
		//
		// example:
		//	Create a `dojo.NodeList` from a new element (for syntatic sugar):
		//	|	dojo.query(dojo.create('div'))
		//	|		.addClass("newDiv")
		//	|		.onclick(function(e){ console.log('clicked', e.target) })
		//	|		.place("#someNode"); // redundant, but cleaner.

		var doc = d.doc;
		if(refNode){		
			refNode = byId(refNode);
			doc = refNode.ownerDocument;
		}
		if(isString(tag)){
			tag = doc.createElement(tag);
		}
		if(attrs){ d.attr(tag, attrs); }
		if(refNode){ d.place(tag, refNode, pos); }
		return tag; // DomNode
	}
	
	/*=====
	dojo.empty = function(node){
			//	summary:
			//		safely removes all children of the node.
			//	node: DOMNode|String
			//		a reference to a DOM node or an id.
			//	example:
			//	Destroy node's children byId:
			//	| dojo.empty("someId");
			//
			//	example:
			//	Destroy all nodes' children in a list by reference:
			//	| dojo.query(".someNode").forEach(dojo.empty);
	}
	=====*/

	d.empty = 
				d.isIE ?  function(node){
			node = byId(node);
			for(var c; c = node.lastChild;){ // intentional assignment
				d.destroy(c);
			}
		} :
				function(node){
			byId(node).innerHTML = "";
		};

	/*=====
	dojo._toDom = function(frag, doc){
			//	summary:
			//		instantiates an HTML fragment returning the corresponding DOM.
			//	frag: String
			//		the HTML fragment
			//	doc: DocumentNode?
			//		optional document to use when creating DOM nodes, defaults to
			//		dojo.doc if not specified.
			//	returns: DocumentFragment
			//
			//	example:
			//	Create a table row:
			//	| var tr = dojo._toDom("<tr><td>First!</td></tr>");
	}
	=====*/

	// support stuff for dojo._toDom
	var tagWrap = {
			option: ["select"],
			tbody: ["table"],
			thead: ["table"],
			tfoot: ["table"],
			tr: ["table", "tbody"],
			td: ["table", "tbody", "tr"],
			th: ["table", "thead", "tr"],
			legend: ["fieldset"],
			caption: ["table"],
			colgroup: ["table"],
			col: ["table", "colgroup"],
			li: ["ul"]
		},
		reTag = /<\s*([\w\:]+)/,
		masterNode = {}, masterNum = 0,
		masterName = "__" + d._scopeName + "ToDomId";

	// generate start/end tag strings to use
	// for the injection for each special tag wrap case.
	for(var param in tagWrap){
		var tw = tagWrap[param];
		tw.pre  = param == "option" ? '<select multiple="multiple">' : "<" + tw.join("><") + ">";
		tw.post = "</" + tw.reverse().join("></") + ">";
		// the last line is destructive: it reverses the array,
		// but we don't care at this point
	}

	d._toDom = function(frag, doc){
		//	summary:
		// 		converts HTML string into DOM nodes.

		doc = doc || d.doc;
		var masterId = doc[masterName];
		if(!masterId){
			doc[masterName] = masterId = ++masterNum + "";
			masterNode[masterId] = doc.createElement("div");
		}

		// make sure the frag is a string.
		frag += "";

		// find the starting tag, and get node wrapper
		var match = frag.match(reTag),
			tag = match ? match[1].toLowerCase() : "",
			master = masterNode[masterId],
			wrap, i, fc, df;
		if(match && tagWrap[tag]){
			wrap = tagWrap[tag];
			master.innerHTML = wrap.pre + frag + wrap.post;
			for(i = wrap.length; i; --i){
				master = master.firstChild;
			}
		}else{
			master.innerHTML = frag;
		}

		// one node shortcut => return the node itself
		if(master.childNodes.length == 1){
			return master.removeChild(master.firstChild); // DOMNode
		}
		
		// return multiple nodes as a document fragment
		df = doc.createDocumentFragment();
		while(fc = master.firstChild){ // intentional assignment
			df.appendChild(fc);
		}
		return df; // DOMNode
	}

	// =============================
	// (CSS) Class Functions
	// =============================
	var _className = "className";

	dojo.hasClass = function(/*DomNode|String*/node, /*String*/classStr){
		//	summary:
		//		Returns whether or not the specified classes are a portion of the
		//		class list currently applied to the node. 
		//
		//	node: 
		//		String ID or DomNode reference to check the class for.
		//
		//	classStr:
		//		A string class name to look for.
		// 
		//	example:
		//	| if(dojo.hasClass("someNode","aSillyClassName")){ ... }
		
		return ((" "+ byId(node)[_className] +" ").indexOf(" "+ classStr +" ") >= 0);  // Boolean
	};

	dojo.addClass = function(/*DomNode|String*/node, /*String*/classStr){
		//	summary:
		//		Adds the specified classes to the end of the class list on the
		//		passed node. Will not re-apply duplicate classes, except in edge
		//		cases when adding multiple classes at once.
		//
		//	node:
		//		String ID or DomNode reference to add a class string too
		//
		//	classStr:
		//		A String class name to add
		//
		// example:
		//	Add A class to some node:
		//	|	dojo.addClass("someNode", "anewClass");
		//
		// example:
		//	Add two classes at once (could potentially add duplicate):
		//	| 	dojo.addClass("someNode", "firstClass secondClass");
		//
		// example:
		//	Available in `dojo.NodeList` for multiple additions
		//	| dojo.query("ul > li").addClass("firstLevel");
		
		node = byId(node);
		var cls = node[_className];
		if((" "+ cls +" ").indexOf(" " + classStr + " ") < 0){
			node[_className] = cls + (cls ? ' ' : '') + classStr;
		}
	};

	dojo.removeClass = function(/*DomNode|String*/node, /*String*/classStr){
		// summary:
		//		Removes the specified classes from node. No `dojo.hasClass`
		//		check is required. 
		//
		// node:
		// 		String ID or DomNode reference to remove the class from.
		//
		// classString:
		//		String class name to remove
		//
		// example:
		// 	| dojo.removeClass("someNode", "firstClass");
		//
		// example:
		//	Available in `dojo.NodeList` for multiple removal
		//	| dojo.query(".foo").removeClass("foo");
		
		node = byId(node);
		var t = d.trim((" " + node[_className] + " ").replace(" " + classStr + " ", " "));
		if(node[_className] != t){ node[_className] = t; }
	};

	dojo.toggleClass = function(/*DomNode|String*/node, /*String*/classStr, /*Boolean?*/condition){
		//	summary:
		//		Adds a class to node if not present, or removes if present.
		//		Pass a boolean condition if you want to explicitly add or remove.
		//	condition:
		//		If passed, true means to add the class, false means to remove.
		//
		// example:
		//	| dojo.toggleClass("someNode", "hovered");
		//
		// example:
		// 	Forcefully add a class
		//	| dojo.toggleClass("someNode", "hovered", true);
		//
		// example:
		//	Available in `dojo.NodeList` for multiple toggles
		//	| dojo.query(".toggleMe").toggleClass("toggleMe");
		
		if(condition === undefined){
			condition = !d.hasClass(node, classStr);
		}
		d[condition ? "addClass" : "removeClass"](node, classStr);
	};

})();

}

if(!dojo._hasResource["dojo._base.NodeList"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo._base.NodeList"] = true;
dojo.provide("dojo._base.NodeList");



(function(){

	var d = dojo;

	var ap = Array.prototype, aps = ap.slice, apc = ap.concat;
	
	var tnl = function(/*Array*/a, /*dojo.NodeList?*/parent){
		// summary:
		// 		decorate an array to make it look like a `dojo.NodeList`.
		// a:
		// 		Array of nodes to decorate.
		// parent:
		// 		An optional parent NodeList that generated the current
		// 		list of nodes. Used to call _stash() so the parent NodeList
		// 		can be accessed via end() later.
		a.constructor = d._NodeListCtor;
		dojo._mixin(a, d._NodeListCtor.prototype);
		return parent ? a._stash(parent) : a;
	};

	var loopBody = function(f, a, o){
		a = [0].concat(aps.call(a, 0));
		o = o || d.global;
		return function(node){
			a[0] = node;
			return f.apply(o, a);
		};
	};
	
	// adapters

	var adaptAsForEach = function(f, o){
		//	summary:
		//		adapts a single node function to be used in the forEach-type
		//		actions. The initial object is returned from the specialized
		//		function.
		//	f: Function
		//		a function to adapt
		//	o: Object?
		//		an optional context for f
		return function(){
			this.forEach(loopBody(f, arguments, o));
			return this;	// Object
		};
	};

	var adaptAsMap = function(f, o){
		//	summary:
		//		adapts a single node function to be used in the map-type
		//		actions. The return is a new array of values, as via `dojo.map`
		//	f: Function
		//		a function to adapt
		//	o: Object?
		//		an optional context for f
		return function(){
			return this.map(loopBody(f, arguments, o));
		};
	};
	
	var adaptAsFilter = function(f, o){
		//	summary:
		//		adapts a single node function to be used in the filter-type actions
		//	f: Function
		//		a function to adapt
		//	o: Object?
		//		an optional context for f
		return function(){
			return this.filter(loopBody(f, arguments, o));
		};
	};
	
	var adaptWithCondition = function(f, g, o){
		//	summary: 
		//		adapts a single node function to be used in the map-type
		//		actions, behaves like forEach() or map() depending on arguments
		//	f: Function
		//		a function to adapt
		//	g: Function
		//		a condition function, if true runs as map(), otherwise runs as forEach()
		//	o: Object?
		//		an optional context for f and g
		return function(){
			var a = arguments, body = loopBody(f, a, o);
			if(g.call(o || d.global, a)){
				return this.map(body);	// self
			}
			this.forEach(body);
			return this;	// self
		};
	};
	
	var magicGuard = function(a){
		//	summary:
		//		the guard function for dojo.attr() and dojo.style()
		return a.length == 1 && d.isString(a[0])
	};
	
	var orphan = function(node){
		//	summary:
		//		function to orphan nodes
		var p = node.parentNode;
		if(p){
			p.removeChild(node);
		}
	};
	// FIXME: should we move orphan() to dojo.html?

	dojo.NodeList = function(){
		//	summary:
		//		dojo.NodeList is an of Array subclass which adds syntactic
		//		sugar for chaining, common iteration operations, animation, and
		//		node manipulation. NodeLists are most often returned as the
		//		result of dojo.query() calls.
		//	description:
		//		dojo.NodeList instances provide many utilities that reflect
		//		core Dojo APIs for Array iteration and manipulation, DOM
		//		manipulation, and event handling. Instead of needing to dig up
		//		functions in the dojo.* namespace, NodeLists generally make the
		//		full power of Dojo available for DOM manipulation tasks in a
		//		simple, chainable way.
		//	example:
		//		create a node list from a node
		//		|	new dojo.NodeList(dojo.byId("foo"));
		//	example:
		//		get a NodeList from a CSS query and iterate on it
		//		|	var l = dojo.query(".thinger");
		//		|	l.forEach(function(node, index, nodeList){
		//		|		console.log(index, node.innerHTML);
		//		|	});
		//	example:
		//		use native and Dojo-provided array methods to manipulate a
		//		NodeList without needing to use dojo.* functions explicitly:
		//		|	var l = dojo.query(".thinger");
		//		|	// since NodeLists are real arrays, they have a length
		//		|	// property that is both readable and writable and
		//		|	// push/pop/shift/unshift methods
		//		|	console.log(l.length);
		//		|	l.push(dojo.create("<span>howdy!</span>"));
		//		|
		//		|	// dojo's normalized array methods work too:
		//		|	console.log( l.indexOf(dojo.byId("foo")) );
		//		|	// ...including the special "function as string" shorthand
		//		|	console.log( l.every("item.nodeType == 1") );
		//		|
		//		|	// NodeLists can be [..] indexed, or you can use the at()
		//		|	// function to get specific items wrapped in a new NodeList:
		//		|	var node = l[3]; // the 4th element
		//		|	var newList = l.at(1, 3); // the 2nd and 4th elements
		//	example:
		//		the style functions you expect are all there too:
		//		|	// style() as a getter...
		//		|	var borders = dojo.query(".thinger").style("border");
		//		|	// ...and as a setter:
		//		|	dojo.query(".thinger").style("border", "1px solid black");
		//		|	// class manipulation
		//		|	dojo.query("li:nth-child(even)").addClass("even");
		//		|	// even getting the coordinates of all the items
		//		|	var coords = dojo.query(".thinger").coords();
		//	example:
		//		DOM manipulation functions from the dojo.* namespace area also
		//		available:
		//		|	// remove all of the elements in the list from their
		//		|	// parents (akin to "deleting" them from the document)
		//		|	dojo.query(".thinger").orphan();
		//		|	// place all elements in the list at the front of #foo
		//		|	dojo.query(".thinger").place("foo", "first");
		//	example:
		//		Event handling couldn't be easier. `dojo.connect` is mapped in,
		//		and shortcut handlers are provided for most DOM events:
		//		|	// like dojo.connect(), but with implicit scope
		//		|	dojo.query("li").connect("onclick", console, "log");
		//		|
		//		|	// many common event handlers are already available directly:
		//		|	dojo.query("li").onclick(console, "log");
		//		|	var toggleHovered = dojo.hitch(dojo, "toggleClass", "hovered");
		//		|	dojo.query("p")
		//		|		.onmouseenter(toggleHovered)
		//		|		.onmouseleave(toggleHovered);
		//	example:
		//		chainability is a key advantage of NodeLists:
		//		|	dojo.query(".thinger")
		//		|		.onclick(function(e){ /* ... */ })
		//		|		.at(1, 3, 8) // get a subset
		//		|			.style("padding", "5px")
		//		|			.forEach(console.log);

		return tnl(Array.apply(null, arguments));
	};

	//Allow things that new up a NodeList to use a delegated or alternate NodeList implementation.
	d._NodeListCtor = d.NodeList;

	var nl = d.NodeList, nlp = nl.prototype;

	// expose adapters and the wrapper as private functions

	nl._wrap = tnl;
	nl._adaptAsMap = adaptAsMap;
	nl._adaptAsForEach = adaptAsForEach;
	nl._adaptAsFilter  = adaptAsFilter;
	nl._adaptWithCondition = adaptWithCondition;

	// mass assignment
	
	// add array redirectors
	d.forEach(["slice", "splice"], function(name){
		var f = ap[name];
		//Use a copy of the this array via this.slice() to allow .end() to work right in the splice case.
		// CANNOT apply ._stash()/end() to splice since it currently modifies
		// the existing this array -- it would break backward compatibility if we copy the array before
		// the splice so that we can use .end(). So only doing the stash option to tnl for slice.
		nlp[name] = function(){ return tnl(f.apply(this, arguments), name == "slice" ? this : null); };
	});
	// concat should be here but some browsers with native NodeList have problems with it

	// add array.js redirectors
	d.forEach(["indexOf", "lastIndexOf", "every", "some"], function(name){
		var f = d[name];
		nlp[name] = function(){ return f.apply(d, [this].concat(aps.call(arguments, 0))); };
	});
	
	// add conditional methods
	d.forEach(["attr", "style"], function(name){
		nlp[name] = adaptWithCondition(d[name], magicGuard);
	});
	
	// add forEach actions
	d.forEach(["connect", "addClass", "removeClass", "toggleClass", "empty"], function(name){
		nlp[name] = adaptAsForEach(d[name]);
	});

	dojo.extend(dojo.NodeList, {
		_normalize: function(/*String||Element||Object||NodeList*/content, /*DOMNode?*/refNode){
			// summary:
			// 		normalizes data to an array of items to insert.
			// description:
			// 		If content is an object, it can have special properties "template" and
			// 		"parse". If "template" is defined, then the template value is run through
			// 		dojo.string.substitute (if dojo.string.substitute has been dojo.required elsewhere),
			// 		or if templateFunc is a function on the content, that function will be used to
			// 		transform the template into a final string to be used for for passing to dojo._toDom.
			// 		If content.parse is true, then it is remembered for later, for when the content
			// 		nodes are inserted into the DOM. At that point, the nodes will be parsed for widgets
			// 		(if dojo.parser has been dojo.required elsewhere).
	
			//Wanted to just use a DocumentFragment, but for the array/NodeList
			//case that meant  using cloneNode, but we may not want that.
			//Cloning should only happen if the node operations span
			//multiple refNodes. Also, need a real array, not a NodeList from the
			//DOM since the node movements could change those NodeLists.
	
			var parse = content.parse === true ? true : false;

			//Do we have an object that needs to be run through a template?
			if(typeof content.template == "string"){
				var templateFunc = content.templateFunc || (dojo.string && dojo.string.substitute);
				content = templateFunc ? templateFunc(content.template, content) : content;
			}

			if(typeof content == "string"){
				content = dojo._toDom(content, (refNode && refNode.ownerDocument));
				if(content.nodeType == 11){
					//DocumentFragment. It cannot handle cloneNode calls, so pull out the children.
					content = dojo._toArray(content.childNodes);
				}else{
					content = [content];
				}
			}else if(!dojo.isArrayLike(content)){
				content = [content];
			}else if(!dojo.isArray(content)){
				//To get to this point, content is array-like, but
				//not an array, which likely means a DOM NodeList. Convert it now.
				content = dojo._toArray(content);
			}

			//Pass around the parse info
			if(parse){
				content._runParse = true;
			}
			return content; //Array
		},

		_place: function(/*Array*/ary, /*DOMNode*/refNode, /*String*/position, /*Boolean*/useClone){
			// summary:
			// 		private utility to handle placing an array of nodes relative to another node.
			// description:
			// 		Allows for cloning the nodes in the array, and for
			// 		optionally parsing widgets, if ary._runParse is true.
			// 		Parsed widgets are placed in an "instantiated" array off
			// 		the NodeList.
			//
			var rNode = refNode, tempNode;
			var widgets = ary._runParse ? [] : null;

			//Always cycle backwards in case the array is really a
			//DOM NodeList and the DOM operations take it out of the live collection.
			var length = ary.length;
			for(var i = length - 1; i >= 0; i--){
				var node = (useClone ? ary[i].cloneNode(true) : ary[i]);

				//If need widget parsing, use a temp node, instead of waiting after inserting into
				//real DOM because we need to start widget parsing at one node up from current node,
				//which could cause some already parsed widgets to be parsed again.
				if(ary._runParse && dojo.parser && dojo.parser.parse){
					if(!tempNode){
						tempNode = rNode.ownerDocument.createElement("div");
					}
					tempNode.appendChild(node);
					widgets = widgets.concat(dojo.parser.parse(tempNode));
					tempNode.removeChild(node);
				}

				if(i == length - 1){
					dojo.place(node, rNode, position);
				}else{
					rNode.parentNode.insertBefore(node, rNode);
				}
				rNode = node;
			}

			if(widgets){
				this.instantiated = this.instantiated.concat(widgets);
			}
			return widgets;
		},

		_stash: function(parent){
			// summary:
			// 		private function to hold to a parent NodeList. end() to return the parent NodeList.
			//
			// example:
			// How to make a `dojo.NodeList` method that only returns the third node in
			// the dojo.NodeList but allows access to the original NodeList by using this._stash:
			//	|	dojo.extend(dojo.NodeList, {
			//	|		third: function(){
			//  |			var newNodeList = dojo.NodeList(this[2]);
			//	|			return newNodeList._stash(this);
			//	|		}
			//	|	});
			//	|	// then see how _stash applies a sub-list, to be .end()'ed out of
			//	|	dojo.query(".foo")
			//	|		.third()
			//	|			.addClass("thirdFoo")
			//	|		.end()
			//	|		// access to the orig .foo list
			//	|		.removeClass("foo")
			//	| 
			//
			this._parent = parent;
			return this; //dojo.NodeList
		},

		// instantiated: Array
		//		Holds instantiated objects from either the instantiate method or via the optional
		// 		widget parsing that is available via addContent.
		instantiated: [],

		end: function(){
			// summary:
			// 		Ends use of the current `dojo.NodeList` by returning the previous dojo.NodeList
			// 		that generated the current dojo.NodeList.
			// description:
			// 		Returns the `dojo.NodeList` that generated the current `dojo.NodeList`. If there
			// 		is no parent dojo.NodeList, then an error is returned to indicate a bad chaining
			// 		call.
			// example:
			//	|	dojo.query("a")
			//	|		.filter(".disabled")
			//	|			// operate on the anchors that only have a disabled class
			//	|			.style("color", "grey")
			//	|		.end()
			//	|		// jump back to the list of anchors
			//	|		.style(...)
			//
			if(this._parent){
				return this._parent;
			}else{
				throw new Error("Bad call to dojo.NodeList.end(): no parent NodeList");
			}
		},

		// http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Array#Methods

		// FIXME: handle return values for #3244
		//		http://trac.dojotoolkit.org/ticket/3244
		
		// FIXME:
		//		need to wrap or implement:
		//			join (perhaps w/ innerHTML/outerHTML overload for toString() of items?)
		//			reduce
		//			reduceRight

		/*=====
		slice: function(begin, end){
			// summary:
			//		Returns a new NodeList, maintaining this one in place
			// description:
			//		This method behaves exactly like the Array.slice method
			//		with the caveat that it returns a dojo.NodeList and not a
			//		raw Array. For more details, see Mozilla's (slice
			//		documentation)[http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Array:slice]
			// begin: Integer
			//		Can be a positive or negative integer, with positive
			//		integers noting the offset to begin at, and negative
			//		integers denoting an offset from the end (i.e., to the left
			//		of the end)
			// end: Integer?
			//		Optional parameter to describe what position relative to
			//		the NodeList's zero index to end the slice at. Like begin,
			//		can be positive or negative.
			return tnl(a.slice.apply(this, arguments));
		},

		splice: function(index, howmany, item){
			// summary:
			//		Returns a new NodeList, manipulating this NodeList based on
			//		the arguments passed, potentially splicing in new elements
			//		at an offset, optionally deleting elements
			// description:
			//		This method behaves exactly like the Array.splice method
			//		with the caveat that it returns a dojo.NodeList and not a
			//		raw Array. For more details, see Mozilla's (splice
			//		documentation)[http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Array:splice]
			// 		For backwards compatibility, calling .end() on the spliced NodeList
			// 		does not return the original NodeList -- splice alters the NodeList in place.
			// index: Integer
			//		begin can be a positive or negative integer, with positive
			//		integers noting the offset to begin at, and negative
			//		integers denoting an offset from the end (i.e., to the left
			//		of the end)
			// howmany: Integer?
			//		Optional parameter to describe what position relative to
			//		the NodeList's zero index to end the slice at. Like begin,
			//		can be positive or negative.
			// item: Object...?
			//		Any number of optional parameters may be passed in to be
			//		spliced into the NodeList
			// returns:
			//		dojo.NodeList
			return tnl(a.splice.apply(this, arguments));
		},

		indexOf: function(value, fromIndex){
			//	summary:
			//		see dojo.indexOf(). The primary difference is that the acted-on 
			//		array is implicitly this NodeList
			// value: Object:
			//		The value to search for.
			// fromIndex: Integer?:
			//		The loction to start searching from. Optional. Defaults to 0.
			//	description:
			//		For more details on the behavior of indexOf, see Mozilla's
			//		(indexOf
			//		docs)[http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Array:indexOf]
			//	returns:
			//		Positive Integer or 0 for a match, -1 of not found.
			return d.indexOf(this, value, fromIndex); // Integer
		},

		lastIndexOf: function(value, fromIndex){
			// summary:
			//		see dojo.lastIndexOf(). The primary difference is that the
			//		acted-on array is implicitly this NodeList
			//	description:
			//		For more details on the behavior of lastIndexOf, see
			//		Mozilla's (lastIndexOf
			//		docs)[http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Array:lastIndexOf]
			// value: Object
			//		The value to search for.
			// fromIndex: Integer?
			//		The loction to start searching from. Optional. Defaults to 0.
			// returns:
			//		Positive Integer or 0 for a match, -1 of not found.
			return d.lastIndexOf(this, value, fromIndex); // Integer
		},

		every: function(callback, thisObject){
			//	summary:
			//		see `dojo.every()` and the (Array.every
			//		docs)[http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Array:every].
			//		Takes the same structure of arguments and returns as
			//		dojo.every() with the caveat that the passed array is
			//		implicitly this NodeList
			// callback: Function: the callback
			// thisObject: Object?: the context
			return d.every(this, callback, thisObject); // Boolean
		},

		some: function(callback, thisObject){
			//	summary:
			//		Takes the same structure of arguments and returns as
			//		`dojo.some()` with the caveat that the passed array is
			//		implicitly this NodeList.  See `dojo.some()` and Mozilla's
			//		(Array.some
			//		documentation)[http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Array:some].
			// callback: Function: the callback
			// thisObject: Object?: the context
			return d.some(this, callback, thisObject); // Boolean
		},
		=====*/

		concat: function(item){
			// summary:
			//		Returns a new NodeList comprised of items in this NodeList
			//		as well as items passed in as parameters
			// description:
			//		This method behaves exactly like the Array.concat method
			//		with the caveat that it returns a `dojo.NodeList` and not a
			//		raw Array. For more details, see the (Array.concat
			//		docs)[http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Array:concat]
			// item: Object?
			//		Any number of optional parameters may be passed in to be
			//		spliced into the NodeList
			// returns:
			//		dojo.NodeList
			
			//return tnl(apc.apply(this, arguments));
			// the line above won't work for the native NodeList :-(
			
			// implementation notes:
			// 1) Native NodeList is not an array, and cannot be used directly
			// in concat() --- the latter doesn't recognize it as an array, and
			// does not inline it, but append as a single entity.
			// 2) On some browsers (e.g., Safari) the "constructor" property is
			// read-only and cannot be changed. So we have to test for both
			// native NodeList and dojo.NodeList in this property to recognize
			// the node list.
			
			var t = d.isArray(this) ? this : aps.call(this, 0),
				m = d.map(arguments, function(a){
					return a && !d.isArray(a) &&
						(a.constructor === NodeList || a.constructor == d._NodeListCtor) ?
							aps.call(a, 0) : a;
				});
			return tnl(apc.apply(t, m), this);	// dojo.NodeList
		},

		map: function(/*Function*/ func, /*Function?*/ obj){
			//	summary:
			//		see dojo.map(). The primary difference is that the acted-on
			//		array is implicitly this NodeList and the return is a
			//		dojo.NodeList (a subclass of Array)
			///return d.map(this, func, obj, d.NodeList); // dojo.NodeList
			return tnl(d.map(this, func, obj), this); // dojo.NodeList
		},

		forEach: function(callback, thisObj){
			//	summary:
			//		see `dojo.forEach()`. The primary difference is that the acted-on 
			//		array is implicitly this NodeList
			d.forEach(this, callback, thisObj);
			// non-standard return to allow easier chaining
			return this; // dojo.NodeList 
		},

		/*=====
		coords: function(){
			//	summary:
			// 		Returns the box objects all elements in a node list as
			// 		an Array (*not* a NodeList)
			
			return d.map(this, d.coords); // Array
		},

		attr: function(property, value){
			//	summary:
			//		gets or sets the DOM attribute for every element in the
			//		NodeList
			//	property: String
			//		the attribute to get/set
			//	value: String?
			//		optional. The value to set the property to
			//	returns:
			//		if no value is passed, the result is an array of attribute values
			//		If a value is passed, the return is this NodeList
			return; // dojo.NodeList
			return; // Array
		},

		style: function(property, value){
			//	summary:
			//		gets or sets the CSS property for every element in the NodeList
			//	property: String
			//		the CSS property to get/set, in JavaScript notation
			//		("lineHieght" instead of "line-height") 
			//	value: String?
			//		optional. The value to set the property to
			//	returns:
			//		if no value is passed, the result is an array of strings.
			//		If a value is passed, the return is this NodeList
			return; // dojo.NodeList
			return; // Array
		},

		addClass: function(className){
			//	summary:
			//		adds the specified class to every node in the list
			//	className: String
			//		the CSS class to add
			return; // dojo.NodeList
		},

		removeClass: function(className){
			//	summary:
			//		removes the specified class from every node in the list
			//	className: String
			//		the CSS class to add
			//	returns:
			//		dojo.NodeList, this list
			return; // dojo.NodeList
		},

		toggleClass: function(className, condition){
			//	summary:
			//		Adds a class to node if not present, or removes if present.
			//		Pass a boolean condition if you want to explicitly add or remove.
			//	condition: Boolean?
			//		If passed, true means to add the class, false means to remove.
			//	className: String
			//		the CSS class to add
			return; // dojo.NodeList
		},

		connect: function(methodName, objOrFunc, funcName){
			//	summary:
			//		attach event handlers to every item of the NodeList. Uses dojo.connect()
			//		so event properties are normalized
			//	methodName: String
			//		the name of the method to attach to. For DOM events, this should be
			//		the lower-case name of the event
			//	objOrFunc: Object|Function|String
			//		if 2 arguments are passed (methodName, objOrFunc), objOrFunc should
			//		reference a function or be the name of the function in the global
			//		namespace to attach. If 3 arguments are provided
			//		(methodName, objOrFunc, funcName), objOrFunc must be the scope to 
			//		locate the bound function in
			//	funcName: String?
			//		optional. A string naming the function in objOrFunc to bind to the
			//		event. May also be a function reference.
			//	example:
			//		add an onclick handler to every button on the page
			//		|	dojo.query("div:nth-child(odd)").connect("onclick", function(e){
			//		|		console.log("clicked!");
			//		|	});
			// example:
			//		attach foo.bar() to every odd div's onmouseover
			//		|	dojo.query("div:nth-child(odd)").connect("onmouseover", foo, "bar");
		},

		empty: function(){
			//	summary:
			//		clears all content from each node in the list. Effectively
			//		equivalent to removing all child nodes from every item in
			//		the list.
			return this.forEach("item.innerHTML='';"); // dojo.NodeList
			// FIXME: should we be checking for and/or disposing of widgets below these nodes?
		},
		=====*/
		
		// useful html methods
		coords:	adaptAsMap(d.coords),

		// FIXME: connectPublisher()? connectRunOnce()?

		/*
		destroy: function(){
			//	summary:
			//		destroys every item in 	the list.
			this.forEach(d.destroy);
			// FIXME: should we be checking for and/or disposing of widgets below these nodes?
		},
		*/

		place: function(/*String||Node*/ queryOrNode, /*String*/ position){
			//	summary:
			//		places elements of this node list relative to the first element matched
			//		by queryOrNode. Returns the original NodeList. See: `dojo.place`
			//	queryOrNode:
			//		may be a string representing any valid CSS3 selector or a DOM node.
			//		In the selector case, only the first matching element will be used 
			//		for relative positioning.
			//	position:
			//		can be one of:
			//		|	"last" (default)
			//		|	"first"
			//		|	"before"
			//		|	"after"
			//		|	"only"
			//		|	"replace"
			// 		or an offset in the childNodes property
			var item = d.query(queryOrNode)[0];
			return this.forEach(function(node){ d.place(node, item, position); }); // dojo.NodeList
		},

		orphan: function(/*String?*/ simpleFilter){
			//	summary:
			//		removes elements in this list that match the simple filter
			//		from their parents and returns them as a new NodeList.
			//	simpleFilter:
			//		single-expression CSS rule. For example, ".thinger" or
			//		"#someId[attrName='value']" but not "div > span". In short,
			//		anything which does not invoke a descent to evaluate but
			//		can instead be used to test a single node is acceptable.
			//	returns:
			//		`dojo.NodeList` containing the orpahned elements 
			return (simpleFilter ? d._filterQueryResult(this, simpleFilter) : this).forEach(orphan); // dojo.NodeList
		},

		adopt: function(/*String||Array||DomNode*/ queryOrListOrNode, /*String?*/ position){
			//	summary:
			//		places any/all elements in queryOrListOrNode at a
			//		position relative to the first element in this list.
			//		Returns a dojo.NodeList of the adopted elements.
			//	queryOrListOrNode:
			//		a DOM node or a query string or a query result.
			//		Represents the nodes to be adopted relative to the
			//		first element of this NodeList.
			//	position:
			//		can be one of:
			//		|	"last" (default)
			//		|	"first"
			//		|	"before"
			//		|	"after"
			//		|	"only"
			//		|	"replace"
			// 		or an offset in the childNodes property
			return d.query(queryOrListOrNode).place(item[0], position)._stash(this);	// dojo.NodeList
		},

		// FIXME: do we need this?
		query: function(/*String*/ queryStr){
			//	summary:
			//		Returns a new list whose memebers match the passed query,
			//		assuming elements of the current NodeList as the root for
			//		each search.
			//	example:
			//		assume a DOM created by this markup:
			//	|	<div id="foo">
			//	|		<p>
			//	|			bacon is tasty, <span>dontcha think?</span>
			//	|		</p>
			//	|	</div>
			//	|	<div id="bar">
			//	|		<p>great commedians may not be funny <span>in person</span></p>
			//	|	</div>
			//		If we are presented with the following defintion for a NodeList:
			//	|	var l = new dojo.NodeList(dojo.byId("foo"), dojo.byId("bar"));
			//		it's possible to find all span elements under paragraphs
			//		contained by these elements with this sub-query:
			//	| 	var spans = l.query("p span");

			// FIXME: probably slow
			if(!queryStr){ return this; }
			var ret = this.map(function(node){
				// FIXME: why would we ever get undefined here?
				return d.query(queryStr, node).filter(function(subNode){ return subNode !== undefined; });
			});
			return tnl(apc.apply([], ret), this);	// dojo.NodeList
		},

		filter: function(/*String|Function*/ simpleFilter){
			//	summary:
			// 		"masks" the built-in javascript filter() method (supported
			// 		in Dojo via `dojo.filter`) to support passing a simple
			// 		string filter in addition to supporting filtering function
			// 		objects.
			//	simpleFilter:
			//		If a string, a single-expression CSS rule. For example,
			//		".thinger" or "#someId[attrName='value']" but not "div >
			//		span". In short, anything which does not invoke a descent
			//		to evaluate but can instead be used to test a single node
			//		is acceptable.
			//	example:
			//		"regular" JS filter syntax as exposed in dojo.filter:
			//		|	dojo.query("*").filter(function(item){
			//		|		// highlight every paragraph
			//		|		return (item.nodeName == "p");
			//		|	}).style("backgroundColor", "yellow");
			// example:
			//		the same filtering using a CSS selector
			//		|	dojo.query("*").filter("p").styles("backgroundColor", "yellow");

			var a = arguments, items = this, start = 0;
			if(d.isString(simpleFilter)){
				items = d._filterQueryResult(this, a[0]);
				if(a.length == 1){
					// if we only got a string query, pass back the filtered results
					return items._stash(this); // dojo.NodeList
				}
				// if we got a callback, run it over the filtered items
				start = 1;
			}
			return tnl(d.filter(items, a[start], a[start + 1]), this);	// dojo.NodeList
		},
		
		/*
		// FIXME: should this be "copyTo" and include parenting info?
		clone: function(){
			// summary:
			//		creates node clones of each element of this list
			//		and returns a new list containing the clones
		},
		*/

		addContent: function(/*String||DomNode||Object||dojo.NodeList*/ content, /*String||Integer?*/ position){
			//	summary:
			//		add a node, NodeList or some HTML as a string to every item in the
			//		list.  Returns the original list.
			//	description:
			//		a copy of the HTML content is added to each item in the
			//		list, with an optional position argument. If no position
			//		argument is provided, the content is appended to the end of
			//		each item.
			//	content:
			//		DOM node, HTML in string format, a NodeList or an Object. If a DOM node or
			// 		NodeList, the content will be cloned if the current NodeList has more than one
			// 		element. Only the DOM nodes are cloned, no event handlers. If it is an Object,
			// 		it should be an object with at "template" String property that has the HTML string
			// 		to insert. If dojo.string has already been dojo.required, then dojo.string.substitute
			// 		will be used on the "template" to generate the final HTML string. Other allowed
			// 		properties on the object are: "parse" if the HTML
			// 		string should be parsed for widgets (dojo.require("dojo.parser") to get that
			// 		option to work), and "templateFunc" if a template function besides dojo.string.substitute
			// 		should be used to transform the "template".
			//	position:
			//		can be one of:
			//		|	"last"||"end" (default)
			//		|	"first||"start"
			//		|	"before"
			//		|	"after"
			//		|	"replace" (replaces nodes in this NodeList with new content)
			//		|	"only" (removes other children of the nodes so new content is hte only child)
			// 		or an offset in the childNodes property
			//	example:
			//		appends content to the end if the position is ommitted
			//	|	dojo.query("h3 > p").addContent("hey there!");
			//	example:
			//		add something to the front of each element that has a
			//		"thinger" property:
			//	|	dojo.query("[thinger]").addContent("...", "first");
			//	example:
			//		adds a header before each element of the list
			//	|	dojo.query(".note").addContent("<h4>NOTE:</h4>", "before");
			//	example:
			//		add a clone of a DOM node to the end of every element in
			//		the list, removing it from its existing parent.
			//	|	dojo.query(".note").addContent(dojo.byId("foo"));
			//  example:
			//  	Append nodes from a templatized string.
			// 		dojo.require("dojo.string");
			// 		dojo.query(".note").addContent({
			//  		template: '<b>${id}: </b><span>${name}</span>',
			// 			id: "user332",
			//  		name: "Mr. Anderson"
			//  	});
			//  example:
			//  	Append nodes from a templatized string that also has widgets parsed.
			//  	dojo.require("dojo.string");
			//  	dojo.require("dojo.parser");
			//  	var notes = dojo.query(".note").addContent({
			//  		template: '<button dojoType="dijit.form.Button">${text}</button>',
			//  		parse: true,
			//  		text: "Send"
			//  	});
			//  	//The newly instantiated widgets are available via the .instantiated array property.
			//  	var dijitButtons = notes.instantiated;
			content = this._normalize(content, this[0]);
			for(var i = 0, node; node = this[i]; i++){
				this._place(content, node, position, i > 0);
			}
			return this; //dojo.NodeList
		},

		instantiate: function(/*String|Object*/ declaredClass, /*Object?*/ properties){
			//	summary:
			//		Create a new instance of a specified class, using the
			//		specified properties and each node in the nodeList as a
			//		srcNodeRef. The instantiated objects are available as the
			// 		"instantiated" property on this NodeList.
			//	example:
			//		Grabs all buttons in the page and converts them to diji.form.Buttons. Then
			// 		grabs the instantiated buttons via the instantiated property on the NodeList.
			//	|	var buttons = dojo.query("button").instantiate("dijit.form.Button", {showLabel: true});
			//  |	var buttonWidgets = buttons.instantiated;
			var c = d.isFunction(declaredClass) ? declaredClass : d.getObject(declaredClass);
			properties = properties || {};
			var self = this;
			return this.forEach(function(node){
				self.instantiated.push(c(properties, node));
			});	// dojo.NodeList
		},

		at: function(/*===== index =====*/){
			//	summary:
			//		Returns a new NodeList comprised of items in this NodeList
			//		at the given index or indices.
			//	index: Integer...
			//		One or more 0-based indices of items in the current
			//		NodeList.
			//	returns:
			//		dojo.NodeList
			var t = new dojo._NodeListCtor();
			d.forEach(arguments, function(i){ if(this[i]){ t.push(this[i]); }}, this);
			return t._stash(this); // dojo.NodeList
		}

	});

	// syntactic sugar for DOM events
	d.forEach([
		"blur", "focus", "change", "click", "error", "keydown", "keypress",
		"keyup", "load", "mousedown", "mouseenter", "mouseleave", "mousemove",
		"mouseout", "mouseover", "mouseup", "submit" 
		], function(evt){
			var _oe = "on"+evt;
			nlp[_oe] = function(a, b){
				return this.connect(_oe, a, b);
			}
				// FIXME: should these events trigger publishes?
				/*
				return (a ? this.connect(_oe, a, b) : 
							this.forEach(function(n){  
								// FIXME:
								//		listeners get buried by
								//		addEventListener and can't be dug back
								//		out to be triggered externally.
								// see:
								//		http://developer.mozilla.org/en/docs/DOM:element

								console.log(n, evt, _oe);

								// FIXME: need synthetic event support!
								var _e = { target: n, faux: true, type: evt };
								// dojo._event_listener._synthesizeEvent({}, { target: n, faux: true, type: evt });
								try{ n[evt](_e); }catch(e){ console.log(e); }
								try{ n[_oe](_e); }catch(e){ console.log(e); }
							})
				);
			}
			*/
		}
	);

})();

}

if(!dojo._hasResource["dojo._base.query"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo._base.query"] = true;
if(typeof dojo != "undefined"){
	dojo.provide("dojo._base.query");
	
	

}

/*
	dojo.query() architectural overview:

		dojo.query is a relatively full-featured CSS3 query library. It is
		designed to take any valid CSS3 selector and return the nodes matching
		the selector. To do this quickly, it processes queries in several
		steps, applying caching where profitable.
		
		The steps (roughly in reverse order of the way they appear in the code):
			1.) check to see if we already have a "query dispatcher"
				- if so, use that with the given parameterization. Skip to step 4.
			2.) attempt to determine which branch to dispatch the query to:
				- JS (optimized DOM iteration)
				- native (FF3.1+, Safari 3.1+, IE 8+)
			3.) tokenize and convert to executable "query dispatcher"
				- this is where the lion's share of the complexity in the
				  system lies. In the DOM version, the query dispatcher is
				  assembled as a chain of "yes/no" test functions pertaining to
				  a section of a simple query statement (".blah:nth-child(odd)"
				  but not "div div", which is 2 simple statements). Individual
				  statement dispatchers are cached (to prevent re-definition)
				  as are entire dispatch chains (to make re-execution of the
				  same query fast)
			4.) the resulting query dispatcher is called in the passed scope
			    (by default the top-level document)
				- for DOM queries, this results in a recursive, top-down
				  evaluation of nodes based on each simple query section
				- for native implementations, this may mean working around spec
				  bugs. So be it.
			5.) matched nodes are pruned to ensure they are unique (if necessary)
*/

;(function(d){
	// define everything in a closure for compressability reasons. "d" is an
	// alias to "dojo" (or the toolkit alias object, e.g., "acme").

	////////////////////////////////////////////////////////////////////////
	// Toolkit aliases
	////////////////////////////////////////////////////////////////////////

	// if you are extracing dojo.query for use in your own system, you will
	// need to provide these methods and properties. No other porting should be
	// necessary, save for configuring the system to use a class other than
	// dojo.NodeList as the return instance instantiator
	var trim = 			d.trim;
	var each = 			d.forEach;
	// 					d.isIE; // float
	// 					d.isSafari; // float
	// 					d.isOpera; // float
	// 					d.isWebKit; // float
	// 					d.doc ; // document element
	var qlc = d._NodeListCtor = 		d.NodeList;
	var isString = 		d.isString;

	var getDoc = function(){ return d.doc; };
	var cssCaseBug = (d.isWebKit && ((getDoc().compatMode) == "BackCompat"));

	////////////////////////////////////////////////////////////////////////
	// Global utilities
	////////////////////////////////////////////////////////////////////////


	// on browsers that support the "children" collection we can avoid a lot of
	// iteration on chaff (non-element) nodes.
	// why.
	var childNodesName = !!getDoc().firstChild["children"] ? "children" : "childNodes";

	var specials = ">~+";

	// global thunk to determine whether we should treat the current query as
	// case sensitive or not. This switch is flipped by the query evaluator
	// based on the document passed as the context to search.
	var caseSensitive = false;

	// how high?
	var yesman = function(){ return true; };

	////////////////////////////////////////////////////////////////////////
	// Tokenizer
	////////////////////////////////////////////////////////////////////////

	var getQueryParts = function(query){
		//	summary: 
		//		state machine for query tokenization
		//	description:
		//		instead of using a brittle and slow regex-based CSS parser,
		//		dojo.query implements an AST-style query representation. This
		//		representation is only generated once per query. For example,
		//		the same query run multiple times or under different root nodes
		//		does not re-parse the selector expression but instead uses the
		//		cached data structure. The state machine implemented here
		//		terminates on the last " " (space) charachter and returns an
		//		ordered array of query component structures (or "parts"). Each
		//		part represents an operator or a simple CSS filtering
		//		expression. The structure for parts is documented in the code
		//		below.


		// NOTE: 
		//		this code is designed to run fast and compress well. Sacrifices
		//		to readibility and maintainability have been made.  Your best
		//		bet when hacking the tokenizer is to put The Donnas on *really*
		//		loud (may we recommend their "Spend The Night" release?) and
		//		just assume you're gonna make mistakes. Keep the unit tests
		//		open and run them frequently. Knowing is half the battle ;-)
		if(specials.indexOf(query.slice(-1)) >= 0){
			// if we end with a ">", "+", or "~", that means we're implicitly
			// searching all children, so make it explicit
			query += " * "
		}else{
			// if you have not provided a terminator, one will be provided for
			// you...
			query += " ";
		}

		var ts = function(/*Integer*/ s, /*Integer*/ e){
			// trim and slice. 

			// take an index to start a string slice from and an end position
			// and return a trimmed copy of that sub-string
			return trim(query.slice(s, e));
		}

		// the overall data graph of the full query, as represented by queryPart objects
		var queryParts = []; 


		// state keeping vars
		var inBrackets = -1, inParens = -1, inMatchFor = -1, 
			inPseudo = -1, inClass = -1, inId = -1, inTag = -1, 
			lc = "", cc = "", pStart;

		// iteration vars
		var x = 0, // index in the query
			ql = query.length,
			currentPart = null, // data structure representing the entire clause
			_cp = null; // the current pseudo or attr matcher

		// several temporary variables are assigned to this structure durring a
		// potential sub-expression match:
		//		attr:
		//			a string representing the current full attribute match in a
		//			bracket expression
		//		type:
		//			if there's an operator in a bracket expression, this is
		//			used to keep track of it
		//		value:
		//			the internals of parenthetical expression for a pseudo. for
		//			:nth-child(2n+1), value might be "2n+1"

		var endTag = function(){
			// called when the tokenizer hits the end of a particular tag name.
			// Re-sets state variables for tag matching and sets up the matcher
			// to handle the next type of token (tag or operator).
			if(inTag >= 0){
				var tv = (inTag == x) ? null : ts(inTag, x); // .toLowerCase();
				currentPart[ (specials.indexOf(tv) < 0) ? "tag" : "oper" ] = tv;
				inTag = -1;
			}
		}

		var endId = function(){
			// called when the tokenizer might be at the end of an ID portion of a match
			if(inId >= 0){
				currentPart.id = ts(inId, x).replace(/\\/g, "");
				inId = -1;
			}
		}

		var endClass = function(){
			// called when the tokenizer might be at the end of a class name
			// match. CSS allows for multiple classes, so we augment the
			// current item with another class in its list
			if(inClass >= 0){
				currentPart.classes.push(ts(inClass+1, x).replace(/\\/g, ""));
				inClass = -1;
			}
		}

		var endAll = function(){
			// at the end of a simple fragment, so wall off the matches
			endId(); endTag(); endClass();
		}

		var endPart = function(){
			endAll();
			if(inPseudo >= 0){
				currentPart.pseudos.push({ name: ts(inPseudo+1, x) });
			}
			// hint to the selector engine to tell it whether or not it
			// needs to do any iteration. Many simple selectors don't, and
			// we can avoid significant construction-time work by advising
			// the system to skip them
			currentPart.loops = (	
					currentPart.pseudos.length || 
					currentPart.attrs.length || 
					currentPart.classes.length	);

			currentPart.oquery = currentPart.query = ts(pStart, x); // save the full expression as a string


			// otag/tag are hints to suggest to the system whether or not
			// it's an operator or a tag. We save a copy of otag since the
			// tag name is cast to upper-case in regular HTML matches. The
			// system has a global switch to figure out if the current
			// expression needs to be case sensitive or not and it will use
			// otag or tag accordingly
			currentPart.otag = currentPart.tag = (currentPart["oper"]) ? null : (currentPart.tag || "*");

			if(currentPart.tag){
				// if we're in a case-insensitive HTML doc, we likely want
				// the toUpperCase when matching on element.tagName. If we
				// do it here, we can skip the string op per node
				// comparison
				currentPart.tag = currentPart.tag.toUpperCase();
			}

			// add the part to the list
			if(queryParts.length && (queryParts[queryParts.length-1].oper)){
				// operators are always infix, so we remove them from the
				// list and attach them to the next match. The evaluator is
				// responsible for sorting out how to handle them.
				currentPart.infixOper = queryParts.pop();
				currentPart.query = currentPart.infixOper.query + " " + currentPart.query;
				/*
				console.debug(	"swapping out the infix", 
								currentPart.infixOper, 
								"and attaching it to", 
								currentPart);
				*/
			}
			queryParts.push(currentPart);

			currentPart = null;
		}

		// iterate over the query, charachter by charachter, building up a 
		// list of query part objects
		for(; lc=cc, cc=query.charAt(x), x < ql; x++){
			//		cc: the current character in the match
			//		lc: the last charachter (if any)

			// someone is trying to escape something, so don't try to match any
			// fragments. We assume we're inside a literal.
			if(lc == "\\"){ continue; } 
			if(!currentPart){ // a part was just ended or none has yet been created
				// NOTE: I hate all this alloc, but it's shorter than writing tons of if's
				pStart = x;
				//	rules describe full CSS sub-expressions, like:
				//		#someId
				//		.className:first-child
				//	but not:
				//		thinger > div.howdy[type=thinger]
				//	the indidual components of the previous query would be
				//	split into 3 parts that would be represented a structure
				//	like:
				//		[
				//			{
				//				query: "thinger",
				//				tag: "thinger",
				//			},
				//			{
				//				query: "div.howdy[type=thinger]",
				//				classes: ["howdy"],
				//				infixOper: {
				//					query: ">",
				//					oper: ">",
				//				}
				//			},
				//		]
				currentPart = {
					query: null, // the full text of the part's rule
					pseudos: [], // CSS supports multiple pseud-class matches in a single rule
					attrs: [], 	// CSS supports multi-attribute match, so we need an array
					classes: [], // class matches may be additive, e.g.: .thinger.blah.howdy
					tag: null, 	// only one tag...
					oper: null, // ...or operator per component. Note that these wind up being exclusive.
					id: null, 	// the id component of a rule
					getTag: function(){
						return (caseSensitive) ? this.otag : this.tag;
					}
				};

				// if we don't have a part, we assume we're going to start at
				// the beginning of a match, which should be a tag name. This
				// might fault a little later on, but we detect that and this
				// iteration will still be fine.
				inTag = x; 
			}

			if(inBrackets >= 0){
				// look for a the close first
				if(cc == "]"){ // if we're in a [...] clause and we end, do assignment
					if(!_cp.attr){
						// no attribute match was previously begun, so we
						// assume this is an attribute existance match in the
						// form of [someAttributeName]
						_cp.attr = ts(inBrackets+1, x);
					}else{
						// we had an attribute already, so we know that we're
						// matching some sort of value, as in [attrName=howdy]
						_cp.matchFor = ts((inMatchFor||inBrackets+1), x);
					}
					var cmf = _cp.matchFor;
					if(cmf){
						// try to strip quotes from the matchFor value. We want
						// [attrName=howdy] to match the same 
						//	as [attrName = 'howdy' ]
						if(	(cmf.charAt(0) == '"') || (cmf.charAt(0)  == "'") ){
							_cp.matchFor = cmf.slice(1, -1);
						}
					}
					// end the attribute by adding it to the list of attributes. 
					currentPart.attrs.push(_cp);
					_cp = null; // necessary?
					inBrackets = inMatchFor = -1;
				}else if(cc == "="){
					// if the last char was an operator prefix, make sure we
					// record it along with the "=" operator. 
					var addToCc = ("|~^$*".indexOf(lc) >=0 ) ? lc : "";
					_cp.type = addToCc+cc;
					_cp.attr = ts(inBrackets+1, x-addToCc.length);
					inMatchFor = x+1;
				}
				// now look for other clause parts
			}else if(inParens >= 0){
				// if we're in a parenthetical expression, we need to figure
				// out if it's attached to a pseduo-selector rule like
				// :nth-child(1)
				if(cc == ")"){
					if(inPseudo >= 0){
						_cp.value = ts(inParens+1, x);
					}
					inPseudo = inParens = -1;
				}
			}else if(cc == "#"){
				// start of an ID match
				endAll();
				inId = x+1;
			}else if(cc == "."){
				// start of a class match
				endAll();
				inClass = x;
			}else if(cc == ":"){
				// start of a pseudo-selector match
				endAll();
				inPseudo = x;
			}else if(cc == "["){
				// start of an attribute match. 
				endAll();
				inBrackets = x;
				// provide a new structure for the attribute match to fill-in
				_cp = {
					/*=====
					attr: null, type: null, matchFor: null
					=====*/
				};
			}else if(cc == "("){
				// we really only care if we've entered a parenthetical
				// expression if we're already inside a pseudo-selector match
				if(inPseudo >= 0){
					// provide a new structure for the pseudo match to fill-in
					_cp = { 
						name: ts(inPseudo+1, x), 
						value: null
					}
					currentPart.pseudos.push(_cp);
				}
				inParens = x;
			}else if(
				(cc == " ") && 
				// if it's a space char and the last char is too, consume the
				// current one without doing more work
				(lc != cc)
			){
				endPart();
			}
		}
		return queryParts;
	};
	

	////////////////////////////////////////////////////////////////////////
	// DOM query infrastructure
	////////////////////////////////////////////////////////////////////////

	var agree = function(first, second){
		// the basic building block of the yes/no chaining system. agree(f1,
		// f2) generates a new function which returns the boolean results of
		// both of the passed functions to a single logical-anded result. If
		// either are not possed, the other is used exclusively.
		if(!first){ return second; }
		if(!second){ return first; }

		return function(){
			return first.apply(window, arguments) && second.apply(window, arguments);
		}
	};

	var getArr = function(i, arr){
		// helps us avoid array alloc when we don't need it
		var r = arr||[]; // FIXME: should this be 'new d._NodeListCtor()' ?
		if(i){ r.push(i); }
		return r;
	};

	var _isElement = function(n){ return (1 == n.nodeType); };

	// FIXME: need to coalesce _getAttr with defaultGetter
	var blank = "";
	var _getAttr = function(elem, attr){
		if(!elem){ return blank; }
		if(attr == "class"){
			return elem.className || blank;
		}
		if(attr == "for"){
			return elem.htmlFor || blank;
		}
		if(attr == "style"){
			return elem.style.cssText || blank;
		}
		return (caseSensitive ? elem.getAttribute(attr) : elem.getAttribute(attr, 2)) || blank;
	};

	var attrs = {
		"*=": function(attr, value){
			return function(elem){
				// E[foo*="bar"]
				//		an E element whose "foo" attribute value contains
				//		the substring "bar"
				return (_getAttr(elem, attr).indexOf(value)>=0);
			}
		},
		"^=": function(attr, value){
			// E[foo^="bar"]
			//		an E element whose "foo" attribute value begins exactly
			//		with the string "bar"
			return function(elem){
				return (_getAttr(elem, attr).indexOf(value)==0);
			}
		},
		"$=": function(attr, value){
			// E[foo$="bar"]	
			//		an E element whose "foo" attribute value ends exactly
			//		with the string "bar"
			var tval = " "+value;
			return function(elem){
				var ea = " "+_getAttr(elem, attr);
				return (ea.lastIndexOf(value)==(ea.length-value.length));
			}
		},
		"~=": function(attr, value){
			// E[foo~="bar"]	
			//		an E element whose "foo" attribute value is a list of
			//		space-separated values, one of which is exactly equal
			//		to "bar"

			// return "[contains(concat(' ',@"+attr+",' '), ' "+ value +" ')]";
			var tval = " "+value+" ";
			return function(elem){
				var ea = " "+_getAttr(elem, attr)+" ";
				return (ea.indexOf(tval)>=0);
			}
		},
		"|=": function(attr, value){
			// E[hreflang|="en"]
			//		an E element whose "hreflang" attribute has a
			//		hyphen-separated list of values beginning (from the
			//		left) with "en"
			var valueDash = " "+value+"-";
			return function(elem){
				var ea = " "+_getAttr(elem, attr);
				return (
					(ea == value) ||
					(ea.indexOf(valueDash)==0)
				);
			}
		},
		"=": function(attr, value){
			return function(elem){
				return (_getAttr(elem, attr) == value);
			}
		}
	};

	// avoid testing for node type if we can. Defining this in the negative
	// here to avoid negation in the fast path.
	var _noNES = (typeof getDoc().firstChild.nextElementSibling == "undefined");
	var _ns = !_noNES ? "nextElementSibling" : "nextSibling";
	var _ps = !_noNES ? "previousElementSibling" : "previousSibling";
	var _simpleNodeTest = (_noNES ? _isElement : yesman);

	var _lookLeft = function(node){
		// look left
		while(node = node[_ps]){
			if(_simpleNodeTest(node)){ return false; }
		}
		return true;
	};

	var _lookRight = function(node){
		// look right
		while(node = node[_ns]){
			if(_simpleNodeTest(node)){ return false; }
		}
		return true;
	};

	var getNodeIndex = function(node){
		var root = node.parentNode;
		var i = 0,
			tret = root[childNodesName],
			ci = (node["_i"]||-1),
			cl = (root["_l"]||-1);

		if(!tret){ return -1; }
		var l = tret.length;

		// we calcuate the parent length as a cheap way to invalidate the
		// cache. It's not 100% accurate, but it's much more honest than what
		// other libraries do
		if( cl == l && ci >= 0 && cl >= 0 ){
			// if it's legit, tag and release
			return ci;
		}

		// else re-key things
		root["_l"] = l;
		ci = -1;
		for(var te = root["firstElementChild"]||root["firstChild"]; te; te = te[_ns]){
			if(_simpleNodeTest(te)){ 
				te["_i"] = ++i;
				if(node === te){ 
					// NOTE:
					// 	shortcuting the return at this step in indexing works
					// 	very well for benchmarking but we avoid it here since
					// 	it leads to potential O(n^2) behavior in sequential
					// 	getNodexIndex operations on a previously un-indexed
					// 	parent. We may revisit this at a later time, but for
					// 	now we just want to get the right answer more often
					// 	than not.
					ci = i;
				}
			}
		}
		return ci;
	};

	var isEven = function(elem){
		return !((getNodeIndex(elem)) % 2);
	};

	var isOdd = function(elem){
		return ((getNodeIndex(elem)) % 2);
	};

	var pseudos = {
		"checked": function(name, condition){
			return function(elem){
				// FIXME: make this more portable!!
				return !!d.attr(elem, "checked");
			}
		},
		"first-child": function(){ return _lookLeft; },
		"last-child": function(){ return _lookRight; },
		"only-child": function(name, condition){
			return function(node){ 
				if(!_lookLeft(node)){ return false; }
				if(!_lookRight(node)){ return false; }
				return true;
			};
		},
		"empty": function(name, condition){
			return function(elem){
				// DomQuery and jQuery get this wrong, oddly enough.
				// The CSS 3 selectors spec is pretty explicit about it, too.
				var cn = elem.childNodes;
				var cnl = elem.childNodes.length;
				// if(!cnl){ return true; }
				for(var x=cnl-1; x >= 0; x--){
					var nt = cn[x].nodeType;
					if((nt === 1)||(nt == 3)){ return false; }
				}
				return true;
			}
		},
		"contains": function(name, condition){
			var cz = condition.charAt(0);
			if( cz == '"' || cz == "'" ){ //remove quote
				condition = condition.slice(1, -1);
			}
			return function(elem){
				return (elem.innerHTML.indexOf(condition) >= 0);
			}
		},
		"not": function(name, condition){
			var p = getQueryParts(condition)[0];
			var ignores = { el: 1 }; 
			if(p.tag != "*"){
				ignores.tag = 1;
			}
			if(!p.classes.length){
				ignores.classes = 1;
			}
			var ntf = getSimpleFilterFunc(p, ignores);
			return function(elem){
				return (!ntf(elem));
			}
		},
		"nth-child": function(name, condition){
			var pi = parseInt;
			// avoid re-defining function objects if we can
			if(condition == "odd"){
				return isOdd;
			}else if(condition == "even"){
				return isEven;
			}
			// FIXME: can we shorten this?
			if(condition.indexOf("n") != -1){
				var tparts = condition.split("n", 2);
				var pred = tparts[0] ? ((tparts[0] == '-') ? -1 : pi(tparts[0])) : 1;
				var idx = tparts[1] ? pi(tparts[1]) : 0;
				var lb = 0, ub = -1;
				if(pred > 0){
					if(idx < 0){
						idx = (idx % pred) && (pred + (idx % pred));
					}else if(idx>0){
						if(idx >= pred){
							lb = idx - idx % pred;
						}
						idx = idx % pred;
					}
				}else if(pred<0){
					pred *= -1;
					// idx has to be greater than 0 when pred is negative;
					// shall we throw an error here?
					if(idx > 0){
						ub = idx;
						idx = idx % pred;
					}
				}
				if(pred > 0){
					return function(elem){
						var i = getNodeIndex(elem);
						return (i>=lb) && (ub<0 || i<=ub) && ((i % pred) == idx);
					}
				}else{
					condition = idx;
				}
			}
			var ncount = pi(condition);
			return function(elem){
				return (getNodeIndex(elem) == ncount);
			}
		}
	};

	var defaultGetter = (d.isIE) ? function(cond){
		var clc = cond.toLowerCase();
		if(clc == "class"){ cond = "className"; }
		return function(elem){
			return (caseSensitive ? elem.getAttribute(cond) : elem[cond]||elem[clc]);
		}
	} : function(cond){
		return function(elem){
			return (elem && elem.getAttribute && elem.hasAttribute(cond));
		}
	};

	var getSimpleFilterFunc = function(query, ignores){
		// generates a node tester function based on the passed query part. The
		// query part is one of the structures generatd by the query parser
		// when it creates the query AST. The "ignores" object specifies which
		// (if any) tests to skip, allowing the system to avoid duplicating
		// work where it may have already been taken into account by other
		// factors such as how the nodes to test were fetched in the first
		// place
		if(!query){ return yesman; }
		ignores = ignores||{};

		var ff = null;

		if(!("el" in ignores)){
			ff = agree(ff, _isElement);
		}

		if(!("tag" in ignores)){
			if(query.tag != "*"){
				ff = agree(ff, function(elem){
					return (elem && (elem.tagName == query.getTag()));
				});
			}
		}

		if(!("classes" in ignores)){
			each(query.classes, function(cname, idx, arr){
				// get the class name
				/*
				var isWildcard = cname.charAt(cname.length-1) == "*";
				if(isWildcard){
					cname = cname.substr(0, cname.length-1);
				}
				// I dislike the regex thing, even if memozied in a cache, but it's VERY short
				var re = new RegExp("(?:^|\\s)" + cname + (isWildcard ? ".*" : "") + "(?:\\s|$)");
				*/
				var re = new RegExp("(?:^|\\s)" + cname + "(?:\\s|$)");
				ff = agree(ff, function(elem){
					return re.test(elem.className);
				});
				ff.count = idx;
			});
		}

		if(!("pseudos" in ignores)){
			each(query.pseudos, function(pseudo){
				var pn = pseudo.name;
				if(pseudos[pn]){
					ff = agree(ff, pseudos[pn](pn, pseudo.value));
				}
			});
		}

		if(!("attrs" in ignores)){
			each(query.attrs, function(attr){
				var matcher;
				var a = attr.attr;
				// type, attr, matchFor
				if(attr.type && attrs[attr.type]){
					matcher = attrs[attr.type](a, attr.matchFor);
				}else if(a.length){
					matcher = defaultGetter(a);
				}
				if(matcher){
					ff = agree(ff, matcher);
				}
			});
		}

		if(!("id" in ignores)){
			if(query.id){
				ff = agree(ff, function(elem){ 
					return (!!elem && (elem.id == query.id));
				});
			}
		}

		if(!ff){
			if(!("default" in ignores)){
				ff = yesman; 
			}
		}
		return ff;
	};

	var _nextSibling = function(filterFunc){
		return function(node, ret, bag){
			while(node = node[_ns]){
				if(_noNES && (!_isElement(node))){ continue; }
				if(
					(!bag || _isUnique(node, bag)) &&
					filterFunc(node)
				){
					ret.push(node);
				}
				break;
			}
			return ret;
		}
	};

	var _nextSiblings = function(filterFunc){
		return function(root, ret, bag){
			var te = root[_ns];
			while(te){
				if(_simpleNodeTest(te)){
					if(bag && !_isUnique(te, bag)){
						break;
					}
					if(filterFunc(te)){
						ret.push(te);
					}
				}
				te = te[_ns];
			}
			return ret;
		}
	};

	// get an array of child *elements*, skipping text and comment nodes
	var _childElements = function(filterFunc){
		filterFunc = filterFunc||yesman;
		return function(root, ret, bag){
			// get an array of child elements, skipping text and comment nodes
			var te, x = 0, tret = root[childNodesName];
			while(te = tret[x++]){
				if(
					_simpleNodeTest(te) &&
					(!bag || _isUnique(te, bag)) &&
					(filterFunc(te, x))
				){ 
					ret.push(te);
				}
			}
			return ret;
		};
	};
	
	/*
	// thanks, Dean!
	var itemIsAfterRoot = d.isIE ? function(item, root){
		return (item.sourceIndex > root.sourceIndex);
	} : function(item, root){
		return (item.compareDocumentPosition(root) == 2);
	};
	*/

	// test to see if node is below root
	var _isDescendant = function(node, root){
		var pn = node.parentNode;
		while(pn){
			if(pn == root){
				break;
			}
			pn = pn.parentNode;
		}
		return !!pn;
	};

	var _getElementsFuncCache = {};

	var getElementsFunc = function(query){
		var retFunc = _getElementsFuncCache[query.query];
		// if we've got a cached dispatcher, just use that
		if(retFunc){ return retFunc; }
		// else, generate a new on

		// NOTE:
		//		this function returns a function that searches for nodes and
		//		filters them.  The search may be specialized by infix operators
		//		(">", "~", or "+") else it will default to searching all
		//		descendants (the " " selector). Once a group of children is
		//		founde, a test function is applied to weed out the ones we
		//		don't want. Many common cases can be fast-pathed. We spend a
		//		lot of cycles to create a dispatcher that doesn't do more work
		//		than necessary at any point since, unlike this function, the
		//		dispatchers will be called every time. The logic of generating
		//		efficient dispatchers looks like this in pseudo code:
		//
		//		# if it's a purely descendant query (no ">", "+", or "~" modifiers)
		//		if infixOperator == " ":
		//			if only(id):
		//				return def(root):
		//					return d.byId(id, root);
		//
		//			elif id:
		//				return def(root):
		//					return filter(d.byId(id, root));
		//
		//			elif cssClass && getElementsByClassName:
		//				return def(root):
		//					return filter(root.getElementsByClassName(cssClass));
		//
		//			elif only(tag):
		//				return def(root):
		//					return root.getElementsByTagName(tagName);
		//
		//			else:
		//				# search by tag name, then filter
		//				return def(root):
		//					return filter(root.getElementsByTagName(tagName||"*"));
		//
		//		elif infixOperator == ">":
		//			# search direct children
		//			return def(root):
		//				return filter(root.children);
		//
		//		elif infixOperator == "+":
		//			# search next sibling
		//			return def(root):
		//				return filter(root.nextElementSibling);
		//
		//		elif infixOperator == "~":
		//			# search rightward siblings
		//			return def(root):
		//				return filter(nextSiblings(root));

		var io = query.infixOper;
		var oper = (io ? io.oper : "");
		// the default filter func which tests for all conditions in the query
		// part. This is potentially inefficient, so some optimized paths may
		// re-define it to test fewer things.
		var filterFunc = getSimpleFilterFunc(query, { el: 1 });
		var qt = query.tag;
		var wildcardTag = ("*" == qt);
		var ecs = getDoc()["getElementsByClassName"]; 

		if(!oper){
			// if there's no infix operator, then it's a descendant query. ID
			// and "elements by class name" variants can be accelerated so we
			// call them out explicitly:
			if(query.id){
				// testing shows that the overhead of yesman() is acceptable
				// and can save us some bytes vs. re-defining the function
				// everywhere.
				filterFunc = (!query.loops && wildcardTag) ? 
					yesman : 
					getSimpleFilterFunc(query, { el: 1, id: 1 });

				retFunc = function(root, arr){
					var te = d.byId(query.id, (root.ownerDocument||root));
					if(!te || !filterFunc(te)){ return; }
					if(9 == root.nodeType){ // if root's a doc, we just return directly
						return getArr(te, arr);
					}else{ // otherwise check ancestry
						if(_isDescendant(te, root)){
							return getArr(te, arr);
						}
					}
				}
			}else if(
				ecs && 
				// isAlien check. Workaround for Prototype.js being totally evil/dumb.
				/\{\s*\[native code\]\s*\}/.test(String(ecs)) && 
				query.classes.length &&
				// WebKit bug where quirks-mode docs select by class w/o case sensitivity
				!cssCaseBug
			){
				// it's a class-based query and we've got a fast way to run it.

				// ignore class and ID filters since we will have handled both
				filterFunc = getSimpleFilterFunc(query, { el: 1, classes: 1, id: 1 });
				var classesString = query.classes.join(" ");
				retFunc = function(root, arr, bag){
					var ret = getArr(0, arr), te, x=0;
					var tret = root.getElementsByClassName(classesString);
					while((te = tret[x++])){
						if(filterFunc(te, root) && _isUnique(te, bag)){
							ret.push(te);
						}
					}
					return ret;
				};

			}else if(!wildcardTag && !query.loops){
				// it's tag only. Fast-path it.
				retFunc = function(root, arr, bag){
					var ret = getArr(0, arr), te, x=0;
					var tret = root.getElementsByTagName(query.getTag());
					while((te = tret[x++])){
						if(_isUnique(te, bag)){
							ret.push(te);
						}
					}
					return ret;
				};
			}else{
				// the common case:
				//		a descendant selector without a fast path. By now it's got
				//		to have a tag selector, even if it's just "*" so we query
				//		by that and filter
				filterFunc = getSimpleFilterFunc(query, { el: 1, tag: 1, id: 1 });
				retFunc = function(root, arr, bag){
					var ret = getArr(0, arr), te, x=0;
					// we use getTag() to avoid case sensitivity issues
					var tret = root.getElementsByTagName(query.getTag());
					while((te = tret[x++])){
						if(filterFunc(te, root) && _isUnique(te, bag)){
							ret.push(te);
						}
					}
					return ret;
				};
			}
		}else{
			// the query is scoped in some way. Instead of querying by tag we
			// use some other collection to find candidate nodes
			var skipFilters = { el: 1 };
			if(wildcardTag){
				skipFilters.tag = 1;
			}
			filterFunc = getSimpleFilterFunc(query, skipFilters);
			if("+" == oper){
				retFunc = _nextSibling(filterFunc);
			}else if("~" == oper){
				retFunc = _nextSiblings(filterFunc);
			}else if(">" == oper){
				retFunc = _childElements(filterFunc);
			}
		}
		// cache it and return
		return _getElementsFuncCache[query.query] = retFunc;
	};

	var filterDown = function(root, queryParts){
		// NOTE:
		//		this is the guts of the DOM query system. It takes a list of
		//		parsed query parts and a root and finds children which match
		//		the selector represented by the parts
		var candidates = getArr(root), qp, x, te, qpl = queryParts.length, bag, ret;

		for(var i = 0; i < qpl; i++){
			ret = [];
			qp = queryParts[i];
			x = candidates.length - 1;
			if(x > 0){
				// if we have more than one root at this level, provide a new
				// hash to use for checking group membership but tell the
				// system not to post-filter us since we will already have been
				// gauranteed to be unique
				bag = {};
				ret.nozip = true;
			}
			var gef = getElementsFunc(qp);
			while(te = candidates[x--]){
				// for every root, get the elements that match the descendant
				// selector, adding them to the "ret" array and filtering them
				// via membership in this level's bag. If there are more query
				// parts, then this level's return will be used as the next
				// level's candidates
				gef(te, ret, bag);
			}
			if(!ret.length){ break; }
			candidates = ret;
		}
		return ret;
	};

	////////////////////////////////////////////////////////////////////////
	// the query runner
	////////////////////////////////////////////////////////////////////////

	// these are the primary caches for full-query results. The query
	// dispatcher functions are generated then stored here for hash lookup in
	// the future
	var _queryFuncCacheDOM = {},
		_queryFuncCacheQSA = {};

	// this is the second level of spliting, from full-length queries (e.g.,
	// "div.foo .bar") into simple query expressions (e.g., ["div.foo",
	// ".bar"])
	var getStepQueryFunc = function(query){
		var qparts = getQueryParts(trim(query));

		// if it's trivial, avoid iteration and zipping costs
		if(qparts.length == 1){
			// we optimize this case here to prevent dispatch further down the
			// chain, potentially slowing things down. We could more elegantly
			// handle this in filterDown(), but it's slower for simple things
			// that need to be fast (e.g., "#someId").
			var tef = getElementsFunc(qparts[0]);
			return function(root){
				var r = tef(root, new qlc());
				if(r){ r.nozip = true; }
				return r;
			}
		}

		// otherwise, break it up and return a runner that iterates over the parts recursively
		return function(root){
			return filterDown(root, qparts);
		}
	};

	// NOTES:
	//	* we can't trust QSA for anything but document-rooted queries, so
	//	  caching is split into DOM query evaluators and QSA query evaluators
	//	* caching query results is dirty and leak-prone (or, at a minimum,
	//	  prone to unbounded growth). Other toolkits may go this route, but
	//	  they totally destroy their own ability to manage their memory
	//	  footprint. If we implement it, it should only ever be with a fixed
	//	  total element reference # limit and an LRU-style algorithm since JS
	//	  has no weakref support. Caching compiled query evaluators is also
	//	  potentially problematic, but even on large documents the size of the
	//	  query evaluators is often < 100 function objects per evaluator (and
	//	  LRU can be applied if it's ever shown to be an issue).
	//	* since IE's QSA support is currently only for HTML documents and even
	//	  then only in IE 8's "standards mode", we have to detect our dispatch
	//	  route at query time and keep 2 separate caches. Ugg.

	// we need to determine if we think we can run a given query via
	// querySelectorAll or if we'll need to fall back on DOM queries to get
	// there. We need a lot of information about the environment and the query
	// to make the determiniation (e.g. does it support QSA, does the query in
	// question work in the native QSA impl, etc.).
	var nua = navigator.userAgent;
	// some versions of Safari provided QSA, but it was buggy and crash-prone.
	// We need te detect the right "internal" webkit version to make this work.
	var wk = "WebKit/";
	var is525 = (
		d.isWebKit && 
		(nua.indexOf(wk) > 0) && 
		(parseFloat(nua.split(wk)[1]) > 528)
	);

	// IE QSA queries may incorrectly include comment nodes, so we throw the
	// zipping function into "remove" comments mode instead of the normal "skip
	// it" which every other QSA-clued browser enjoys
	var noZip = d.isIE ? "commentStrip" : "nozip";

	var qsa = "querySelectorAll";
	var qsaAvail = (
		!!getDoc()[qsa] && 
		// see #5832
		(!d.isSafari || (d.isSafari > 3.1) || is525 )
	); 
	var getQueryFunc = function(query, forceDOM){

		if(qsaAvail){
			// if we've got a cached variant and we think we can do it, run it!
			var qsaCached = _queryFuncCacheQSA[query];
			if(qsaCached && !forceDOM){ return qsaCached; }
		}

		// else if we've got a DOM cached variant, assume that we already know
		// all we need to and use it
		var domCached = _queryFuncCacheDOM[query];
		if(domCached){ return domCached; }

		// TODO: 
		//		today we're caching DOM and QSA branches separately so we
		//		recalc useQSA every time. If we had a way to tag root+query
		//		efficiently, we'd be in good shape to do a global cache.

		var qcz = query.charAt(0);
		var nospace = (-1 == query.indexOf(" "));

		// byId searches are wicked fast compared to QSA, even when filtering
		// is required
		if( (query.indexOf("#") >= 0) && (nospace) ){
			forceDOM = true;
		}

		var useQSA = ( 
			qsaAvail && (!forceDOM) &&
			// as per CSS 3, we can't currently start w/ combinator:
			//		http://www.w3.org/TR/css3-selectors/#w3cselgrammar
			(specials.indexOf(qcz) == -1) && 
			// IE's QSA impl sucks on pseudos
			(!d.isIE || (query.indexOf(":") == -1)) &&

			(!(cssCaseBug && (query.indexOf(".") >= 0))) &&

			// FIXME:
			//		need to tighten up browser rules on ":contains" and "|=" to
			//		figure out which aren't good
			(query.indexOf(":contains") == -1) &&
			(query.indexOf("|=") == -1) // some browsers don't grok it
		);

		// TODO: 
		//		if we've got a descendant query (e.g., "> .thinger" instead of
		//		just ".thinger") in a QSA-able doc, but are passed a child as a
		//		root, it should be possible to give the item a synthetic ID and
		//		trivially rewrite the query to the form "#synid > .thinger" to
		//		use the QSA branch


		if(useQSA){
			var tq = (specials.indexOf(query.charAt(query.length-1)) >= 0) ? 
						(query + " *") : query;
			return _queryFuncCacheQSA[query] = function(root){
				try{
					// the QSA system contains an egregious spec bug which
					// limits us, effectively, to only running QSA queries over
					// entire documents.  See:
					//		http://ejohn.org/blog/thoughts-on-queryselectorall/
					//	despite this, we can also handle QSA runs on simple
					//	selectors, but we don't want detection to be expensive
					//	so we're just checking for the presence of a space char
					//	right now. Not elegant, but it's cheaper than running
					//	the query parser when we might not need to
					if(!((9 == root.nodeType) || nospace)){ throw ""; }
					var r = root[qsa](tq);
					// skip expensive duplication checks and just wrap in a NodeList
					r[noZip] = true;
					return r;
				}catch(e){
					// else run the DOM branch on this query, ensuring that we
					// default that way in the future
					return getQueryFunc(query, true)(root);
				}
			}
		}else{
			// DOM branch
			var parts = query.split(/\s*,\s*/);
			return _queryFuncCacheDOM[query] = ((parts.length < 2) ? 
				// if not a compound query (e.g., ".foo, .bar"), cache and return a dispatcher
				getStepQueryFunc(query) : 
				// if it *is* a complex query, break it up into its
				// constituent parts and return a dispatcher that will
				// merge the parts when run
				function(root){
					var pindex = 0, // avoid array alloc for every invocation
						ret = [],
						tp;
					while((tp = parts[pindex++])){
						ret = ret.concat(getStepQueryFunc(tp)(root));
					}
					return ret;
				}
			);
		}
	};

	var _zipIdx = 0;

	// NOTE:
	//		this function is Moo inspired, but our own impl to deal correctly
	//		with XML in IE
	var _nodeUID = d.isIE ? function(node){
		if(caseSensitive){
			// XML docs don't have uniqueID on their nodes
			return (node.getAttribute("_uid") || node.setAttribute("_uid", ++_zipIdx) || _zipIdx);

		}else{
			return node.uniqueID;
		}
	} : 
	function(node){
		return (node._uid || (node._uid = ++_zipIdx));
	};

	// determine if a node in is unique in a "bag". In this case we don't want
	// to flatten a list of unique items, but rather just tell if the item in
	// question is already in the bag. Normally we'd just use hash lookup to do
	// this for us but IE's DOM is busted so we can't really count on that. On
	// the upside, it gives us a built in unique ID function. 
	var _isUnique = function(node, bag){
		if(!bag){ return 1; }
		var id = _nodeUID(node);
		if(!bag[id]){ return bag[id] = 1; }
		return 0;
	};

	// attempt to efficiently determine if an item in a list is a dupe,
	// returning a list of "uniques", hopefully in doucment order
	var _zipIdxName = "_zipIdx";
	var _zip = function(arr){
		if(arr && arr.nozip){ 
			return (qlc._wrap) ? qlc._wrap(arr) : arr;
		}
		// var ret = new d._NodeListCtor();
		var ret = new qlc();
		if(!arr || !arr.length){ return ret; }
		if(arr[0]){
			ret.push(arr[0]);
		}
		if(arr.length < 2){ return ret; }

		_zipIdx++;
		
		// we have to fork here for IE and XML docs because we can't set
		// expandos on their nodes (apparently). *sigh*
		if(d.isIE && caseSensitive){
			var szidx = _zipIdx+"";
			arr[0].setAttribute(_zipIdxName, szidx);
			for(var x = 1, te; te = arr[x]; x++){
				if(arr[x].getAttribute(_zipIdxName) != szidx){ 
					ret.push(te);
				}
				te.setAttribute(_zipIdxName, szidx);
			}
		}else if(d.isIE && arr.commentStrip){
			try{
				for(var x = 1, te; te = arr[x]; x++){
					if(_isElement(te)){ 
						ret.push(te);
					}
				}
			}catch(e){ /* squelch */ }
		}else{
			if(arr[0]){ arr[0][_zipIdxName] = _zipIdx; }
			for(var x = 1, te; te = arr[x]; x++){
				if(arr[x][_zipIdxName] != _zipIdx){ 
					ret.push(te);
				}
				te[_zipIdxName] = _zipIdx;
			}
		}
		return ret;
	};

	// the main executor
	d.query = function(/*String*/ query, /*String|DOMNode?*/ root){
		//	summary:
		//		Returns nodes which match the given CSS3 selector, searching the
		//		entire document by default but optionally taking a node to scope
		//		the search by. Returns an instance of dojo.NodeList.
		//	description:
		//		dojo.query() is the swiss army knife of DOM node manipulation in
		//		Dojo. Much like Prototype's "$$" (bling-bling) function or JQuery's
		//		"$" function, dojo.query provides robust, high-performance
		//		CSS-based node selector support with the option of scoping searches
		//		to a particular sub-tree of a document.
		//
		//		Supported Selectors:
		//		--------------------
		//
		//		dojo.query() supports a rich set of CSS3 selectors, including:
		//
		//			* class selectors (e.g., `.foo`)
		//			* node type selectors like `span`
		//			* ` ` descendant selectors
		//			* `>` child element selectors 
		//			* `#foo` style ID selectors
		//			* `*` universal selector
		//			* `~`, the immediately preceeded-by sibling selector
		//			* `+`, the preceeded-by sibling selector
		//			* attribute queries:
		//			|	* `[foo]` attribute presence selector
		//			|	* `[foo='bar']` attribute value exact match
		//			|	* `[foo~='bar']` attribute value list item match
		//			|	* `[foo^='bar']` attribute start match
		//			|	* `[foo$='bar']` attribute end match
		//			|	* `[foo*='bar']` attribute substring match
		//			* `:first-child`, `:last-child`, and `:only-child` positional selectors
		//			* `:empty` content emtpy selector
		//			* `:checked` pseudo selector
		//			* `:nth-child(n)`, `:nth-child(2n+1)` style positional calculations
		//			* `:nth-child(even)`, `:nth-child(odd)` positional selectors
		//			* `:not(...)` negation pseudo selectors
		//
		//		Any legal combination of these selectors will work with
		//		`dojo.query()`, including compound selectors ("," delimited).
		//		Very complex and useful searches can be constructed with this
		//		palette of selectors and when combined with functions for
		//		manipulation presented by dojo.NodeList, many types of DOM
		//		manipulation operations become very straightforward.
		//		
		//		Unsupported Selectors:
		//		----------------------
		//
		//		While dojo.query handles many CSS3 selectors, some fall outside of
		//		what's resaonable for a programmatic node querying engine to
		//		handle. Currently unsupported selectors include:
		//		
		//			* namespace-differentiated selectors of any form
		//			* all `::` pseduo-element selectors
		//			* certain pseduo-selectors which don't get a lot of day-to-day use:
		//			|	* `:root`, `:lang()`, `:target`, `:focus`
		//			* all visual and state selectors:
		//			|	* `:root`, `:active`, `:hover`, `:visisted`, `:link`,
		//				  `:enabled`, `:disabled`
		//			* `:*-of-type` pseudo selectors
		//		
		//		dojo.query and XML Documents:
		//		-----------------------------
		//		
		//		`dojo.query` (as of dojo 1.2) supports searching XML documents
		//		in a case-sensitive manner. If an HTML document is served with
		//		a doctype that forces case-sensitivity (e.g., XHTML 1.1
		//		Strict), dojo.query() will detect this and "do the right
		//		thing". Case sensitivity is dependent upon the document being
		//		searched and not the query used. It is therefore possible to
		//		use case-sensitive queries on strict sub-documents (iframes,
		//		etc.) or XML documents while still assuming case-insensitivity
		//		for a host/root document.
		//
		//		Non-selector Queries:
		//		---------------------
		//
		//		If something other than a String is passed for the query,
		//		`dojo.query` will return a new `dojo.NodeList` instance
		//		constructed from that parameter alone and all further
		//		processing will stop. This means that if you have a reference
		//		to a node or NodeList, you can quickly construct a new NodeList
		//		from the original by calling `dojo.query(node)` or
		//		`dojo.query(list)`.
		//
		//	query:
		//		The CSS3 expression to match against. For details on the syntax of
		//		CSS3 selectors, see <http://www.w3.org/TR/css3-selectors/#selectors>
		//	root:
		//		A DOMNode (or node id) to scope the search from. Optional.
		//	returns: dojo.NodeList
		//		An instance of `dojo.NodeList`. Many methods are available on
		//		NodeLists for searching, iterating, manipulating, and handling
		//		events on the matched nodes in the returned list.
		//	example:
		//		search the entire document for elements with the class "foo":
		//	|	dojo.query(".foo");
		//		these elements will match:
		//	|	<span class="foo"></span>
		//	|	<span class="foo bar"></span>
		//	|	<p class="thud foo"></p>
		//	example:
		//		search the entire document for elements with the classes "foo" *and* "bar":
		//	|	dojo.query(".foo.bar");
		//		these elements will match:
		//	|	<span class="foo bar"></span>
		//		while these will not:
		//	|	<span class="foo"></span>
		//	|	<p class="thud foo"></p>
		//	example:
		//		find `<span>` elements which are descendants of paragraphs and
		//		which have a "highlighted" class:
		//	|	dojo.query("p span.highlighted");
		//		the innermost span in this fragment matches:
		//	|	<p class="foo">
		//	|		<span>...
		//	|			<span class="highlighted foo bar">...</span>
		//	|		</span>
		//	|	</p>
		//	example:
		//		set an "odd" class on all odd table rows inside of the table
		//		`#tabular_data`, using the `>` (direct child) selector to avoid
		//		affecting any nested tables:
		//	|	dojo.query("#tabular_data > tbody > tr:nth-child(odd)").addClass("odd");
		//	example:
		//		remove all elements with the class "error" from the document
		//		and store them in a list:
		//	|	var errors = dojo.query(".error").orphan();
		//	example:
		//		add an onclick handler to every submit button in the document
		//		which causes the form to be sent via Ajax instead:
		//	|	dojo.query("input[type='submit']").onclick(function(e){
		//	|		dojo.stopEvent(e); // prevent sending the form
		//	|		var btn = e.target;
		//	|		dojo.xhrPost({
		//	|			form: btn.form,
		//	|			load: function(data){
		//	|				// replace the form with the response
		//	|				var div = dojo.doc.createElement("div");
		//	|				dojo.place(div, btn.form, "after");
		//	|				div.innerHTML = data;
		//	|				dojo.style(btn.form, "display", "none");
		//	|			}
		//	|		});
		//	|	});

		//Set list constructor to desired value. This can change
		//between calls, so always re-assign here.
		qlc = d._NodeListCtor;

		if(!query){
			return new qlc();
		}

		if(query.constructor == qlc){
			return query;
		}
		if(!isString(query)){
			return new qlc(query); // dojo.NodeList
		}
		if(isString(root)){
			root = d.byId(root);
			if(!root){ return new qlc(); }
		}

		root = root||getDoc();
		var od = root.ownerDocument||root.documentElement;

		// throw the big case sensitivity switch

		// NOTE:
		// 		Opera in XHTML mode doesn't detect case-sensitivity correctly
		// 		and it's not clear that there's any way to test for it
		caseSensitive = (root.contentType && root.contentType=="application/xml") || 
						(d.isOpera && (root.doctype || od.toString() == "[object XMLDocument]")) ||
						(!!od) && 
						(d.isIE ? od.xml : (root.xmlVersion||od.xmlVersion));

		// NOTE: 
		//		adding "true" as the 2nd argument to getQueryFunc is useful for
		//		testing the DOM branch without worrying about the
		//		behavior/performance of the QSA branch.
		var r = getQueryFunc(query)(root);

		// FIXME:
		//		need to investigate this branch WRT #8074 and #8075
		if(r && r.nozip && !qlc._wrap){
			return r;
		}
		return _zip(r); // dojo.NodeList
	}

	// FIXME: need to add infrastructure for post-filtering pseudos, ala :last
	d.query.pseudos = pseudos;

	// one-off function for filtering a NodeList based on a simple selector
	d._filterQueryResult = function(nodeList, simpleFilter){
		var tmpNodeList = new d._NodeListCtor();
		var filterFunc = getSimpleFilterFunc(getQueryParts(simpleFilter)[0]);
		for(var x = 0, te; te = nodeList[x]; x++){
			if(filterFunc(te)){ tmpNodeList.push(te); }
		}
		return tmpNodeList;
	}
})(this["queryPortability"]||this["acme"]||dojo);

/*
*/

}

if(!dojo._hasResource["dojo._base.xhr"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo._base.xhr"] = true;
dojo.provide("dojo._base.xhr");





(function(){
	var _d = dojo;
	var cfg = dojo.config;

	function setValue(/*Object*/obj, /*String*/name, /*String*/value){
		//summary:
		//		For the named property in object, set the value. If a value
		//		already exists and it is a string, convert the value to be an
		//		array of values.
		var val = obj[name];
		if(_d.isString(val)){
			obj[name] = [val, value];
		}else if(_d.isArray(val)){
			val.push(value);
		}else{
			obj[name] = value;
		}
	}
	
	dojo.fieldToObject = function(/*DOMNode||String*/ inputNode){
		// summary:
		//		dojo.fieldToObject returns the value encoded in a form field as
		//		as a string or an array of strings. Disabled form elements
		//		and unchecked radio and checkboxes are skipped.	Multi-select
		//		elements are returned as an array of string values.
		var ret = null;
		var item = _d.byId(inputNode);
		if(item){
			var _in = item.name;
			var type = (item.type||"").toLowerCase();
			if(_in && type && !item.disabled){
				if(type == "radio" || type == "checkbox"){
					if(item.checked){ ret = item.value }
				}else if(item.multiple){
					ret = [];
					_d.query("option", item).forEach(function(opt){
						if(opt.selected){
							ret.push(opt.value);
						}
					});
				}else{
					ret = item.value;
				}
			}
		}
		return ret; // Object
	}

	dojo.formToObject = function(/*DOMNode||String*/ formNode){
		// summary:
		//		dojo.formToObject returns the values encoded in an HTML form as
		//		string properties in an object which it then returns. Disabled form
		//		elements, buttons, and other non-value form elements are skipped.
		//		Multi-select elements are returned as an array of string values.
		// description:
		//		This form:
		//
		//		|	<form id="test_form">
		//		|		<input type="text" name="blah" value="blah">
		//		|		<input type="text" name="no_value" value="blah" disabled>
		//		|		<input type="button" name="no_value2" value="blah">
		//		|		<select type="select" multiple name="multi" size="5">
		//		|			<option value="blah">blah</option>
		//		|			<option value="thud" selected>thud</option>
		//		|			<option value="thonk" selected>thonk</option>
		//		|		</select>
		//		|	</form>
		//
		//		yields this object structure as the result of a call to
		//		formToObject():
		//
		//		|	{ 
		//		|		blah: "blah",
		//		|		multi: [
		//		|			"thud",
		//		|			"thonk"
		//		|		]
		//		|	};

		var ret = {};
		var exclude = "file|submit|image|reset|button|";
		_d.forEach(dojo.byId(formNode).elements, function(item){
			var _in = item.name;
			var type = (item.type||"").toLowerCase();
			if(_in && type && exclude.indexOf(type) == -1 && !item.disabled){
				setValue(ret, _in, _d.fieldToObject(item));
				if(type == "image"){
					ret[_in+".x"] = ret[_in+".y"] = ret[_in].x = ret[_in].y = 0;
				}
			}
		});
		return ret; // Object
	}

	dojo.objectToQuery = function(/*Object*/ map){
		//	summary:
		//		takes a name/value mapping object and returns a string representing
		//		a URL-encoded version of that object.
		//	example:
		//		this object:
		//
		//		|	{ 
		//		|		blah: "blah",
		//		|		multi: [
		//		|			"thud",
		//		|			"thonk"
		//		|		]
		//		|	};
		//
		//	yields the following query string:
		//	
		//	|	"blah=blah&multi=thud&multi=thonk"

		// FIXME: need to implement encodeAscii!!
		var enc = encodeURIComponent;
		var pairs = [];
		var backstop = {};
		for(var name in map){
			var value = map[name];
			if(value != backstop[name]){
				var assign = enc(name) + "=";
				if(_d.isArray(value)){
					for(var i=0; i < value.length; i++){
						pairs.push(assign + enc(value[i]));
					}
				}else{
					pairs.push(assign + enc(value));
				}
			}
		}
		return pairs.join("&"); // String
	}

	dojo.formToQuery = function(/*DOMNode||String*/ formNode){
		// summary:
		//		Returns a URL-encoded string representing the form passed as either a
		//		node or string ID identifying the form to serialize
		return _d.objectToQuery(_d.formToObject(formNode)); // String
	}

	dojo.formToJson = function(/*DOMNode||String*/ formNode, /*Boolean?*/prettyPrint){
		// summary:
		//		return a serialized JSON string from a form node or string
		//		ID identifying the form to serialize
		return _d.toJson(_d.formToObject(formNode), prettyPrint); // String
	}

	dojo.queryToObject = function(/*String*/ str){
		// summary:
		//		returns an object representing a de-serialized query section of a
		//		URL. Query keys with multiple values are returned in an array.
		// description:
		//		This string:
		//
		//	|		"foo=bar&foo=baz&thinger=%20spaces%20=blah&zonk=blarg&"
		//		
		//		results in this object structure:
		//
		//	|		{
		//	|			foo: [ "bar", "baz" ],
		//	|			thinger: " spaces =blah",
		//	|			zonk: "blarg"
		//	|		}
		//	
		//		Note that spaces and other urlencoded entities are correctly
		//		handled.

		// FIXME: should we grab the URL string if we're not passed one?
		var ret = {};
		var qp = str.split("&");
		var dec = decodeURIComponent;
		_d.forEach(qp, function(item){
			if(item.length){
				var parts = item.split("=");
				var name = dec(parts.shift());
				var val = dec(parts.join("="));
				if(_d.isString(ret[name])){
					ret[name] = [ret[name]];
				}
				if(_d.isArray(ret[name])){
					ret[name].push(val);
				}else{
					ret[name] = val;
				}
			}
		});
		return ret; // Object
	}

	/*
		from refactor.txt:

		all bind() replacement APIs take the following argument structure:

			{
				url: "blah.html",

				// all below are optional, but must be supported in some form by
				// every IO API
				timeout: 1000, // milliseconds
				handleAs: "text", // replaces the always-wrong "mimetype"
				content: { 
					key: "value"
				},

				// browser-specific, MAY be unsupported
				sync: true, // defaults to false
				form: dojo.byId("someForm") 
			}
	*/

	// need to block async callbacks from snatching this thread as the result
	// of an async callback might call another sync XHR, this hangs khtml forever
	// must checked by watchInFlight()

	dojo._blockAsync = false;

	dojo._contentHandlers = {
		text: function(xhr){ return xhr.responseText; },
		json: function(xhr){
			return _d.fromJson(xhr.responseText || null);
		},
		"json-comment-filtered": function(xhr){ 
			// NOTE: the json-comment-filtered option was implemented to prevent
			// "JavaScript Hijacking", but it is less secure than standard JSON. Use
			// standard JSON instead. JSON prefixing can be used to subvert hijacking.
			if(!dojo.config.useCommentedJson){
				console.warn("Consider using the standard mimetype:application/json."
					+ " json-commenting can introduce security issues. To"
					+ " decrease the chances of hijacking, use the standard the 'json' handler and"
					+ " prefix your json with: {}&&\n"
					+ "Use djConfig.useCommentedJson=true to turn off this message.");
			}

			var value = xhr.responseText;
			var cStartIdx = value.indexOf("\/*");
			var cEndIdx = value.lastIndexOf("*\/");
			if(cStartIdx == -1 || cEndIdx == -1){
				throw new Error("JSON was not comment filtered");
			}
			return _d.fromJson(value.substring(cStartIdx+2, cEndIdx));
		},
		javascript: function(xhr){ 
			// FIXME: try Moz and IE specific eval variants?
			return _d.eval(xhr.responseText);
		},
		xml: function(xhr){
			var result = xhr.responseXML;
						if(_d.isIE && (!result || !result.documentElement)){
				var ms = function(n){ return "MSXML" + n + ".DOMDocument"; }
				var dp = ["Microsoft.XMLDOM", ms(6), ms(4), ms(3), ms(2)];
				_d.some(dp, function(p){
					try{
						var dom = new ActiveXObject(p);
						dom.async = false;
						dom.loadXML(xhr.responseText);
						result = dom;
					}catch(e){ return false; }
					return true;
				});
			}
						return result; // DOMDocument
		}
	};

	dojo._contentHandlers["json-comment-optional"] = function(xhr){
		var handlers = _d._contentHandlers;
		if(xhr.responseText && /^[^{\[]*\/\*/.test(xhr.responseText)){
			return handlers["json-comment-filtered"](xhr);
		}else{
			return handlers["json"](xhr);
		}
	};

	/*=====
	dojo.__IoArgs = function(){
		//	url: String
		//		URL to server endpoint.
		//	content: Object?
		//		Contains properties with string values. These
		//		properties will be serialized as name1=value2 and
		//		passed in the request.
		//	timeout: Integer?
		//		Milliseconds to wait for the response. If this time
		//		passes, the then error callbacks are called.
		//	form: DOMNode?
		//		DOM node for a form. Used to extract the form values
		//		and send to the server.
		//	preventCache: Boolean?
		//		Default is false. If true, then a
		//		"dojo.preventCache" parameter is sent in the request
		//		with a value that changes with each request
		//		(timestamp). Useful only with GET-type requests.
		//	handleAs: String?
		//		Acceptable values depend on the type of IO
		//		transport (see specific IO calls for more information).
		// 	rawBody: String?
		// 		Sets the raw body for an HTTP request. If this is used, then the content
		// 		property is ignored. This is mostly useful for HTTP methods that have
		// 		a body to their requests, like PUT or POST. This property can be used instead
		// 		of postData and putData for dojo.rawXhrPost and dojo.rawXhrPut respectively.
		//	ioPublish: Boolean?
		//		Set this explicitly to false to prevent publishing of topics related to
		// 		IO operations. Otherwise, if djConfig.ioPublish is set to true, topics
		// 		will be published via dojo.publish for different phases of an IO operation.
		// 		See dojo.__IoPublish for a list of topics that are published.
		//	load: Function?
		//		This function will be
		//		called on a successful HTTP response code.
		//	error: Function?
		//		This function will
		//		be called when the request fails due to a network or server error, the url
		//		is invalid, etc. It will also be called if the load or handle callback throws an
		//		exception, unless djConfig.debugAtAllCosts is true.  This allows deployed applications
		//		to continue to run even when a logic error happens in the callback, while making
		//		it easier to troubleshoot while in debug mode.
		//	handle: Function?
		//		This function will
		//		be called at the end of every request, whether or not an error occurs.
		this.url = url;
		this.content = content;
		this.timeout = timeout;
		this.form = form;
		this.preventCache = preventCache;
		this.handleAs = handleAs;
		this.ioPublish = ioPublish;
		this.load = function(response, ioArgs){
			// ioArgs: dojo.__IoCallbackArgs
			//		Provides additional information about the request.
			// response: Object
			//		The response in the format as defined with handleAs.
		}
		this.error = function(response, ioArgs){
			// ioArgs: dojo.__IoCallbackArgs
			//		Provides additional information about the request.
			// response: Object
			//		The response in the format as defined with handleAs.
		}
		this.handle = function(loadOrError, response, ioArgs){
			// loadOrError: String
			//		Provides a string that tells you whether this function
			//		was called because of success (load) or failure (error).
			// response: Object
			//		The response in the format as defined with handleAs.
			// ioArgs: dojo.__IoCallbackArgs
			//		Provides additional information about the request.
		}
	}
	=====*/

	/*=====
	dojo.__IoCallbackArgs = function(args, xhr, url, query, handleAs, id, canDelete, json){
		//	args: Object
		//		the original object argument to the IO call.
		//	xhr: XMLHttpRequest
		//		For XMLHttpRequest calls only, the
		//		XMLHttpRequest object that was used for the
		//		request.
		//	url: String
		//		The final URL used for the call. Many times it
		//		will be different than the original args.url
		//		value.
		//	query: String
		//		For non-GET requests, the
		//		name1=value1&name2=value2 parameters sent up in
		//		the request.
		//	handleAs: String
		//		The final indicator on how the response will be
		//		handled.
		//	id: String
		//		For dojo.io.script calls only, the internal
		//		script ID used for the request.
		//	canDelete: Boolean
		//		For dojo.io.script calls only, indicates
		//		whether the script tag that represents the
		//		request can be deleted after callbacks have
		//		been called. Used internally to know when
		//		cleanup can happen on JSONP-type requests.
		//	json: Object
		//		For dojo.io.script calls only: holds the JSON
		//		response for JSONP-type requests. Used
		//		internally to hold on to the JSON responses.
		//		You should not need to access it directly --
		//		the same object should be passed to the success
		//		callbacks directly.
		this.args = args;
		this.xhr = xhr;
		this.url = url;
		this.query = query;
		this.handleAs = handleAs;
		this.id = id;
		this.canDelete = canDelete;
		this.json = json;
	}
	=====*/


	/*=====
	dojo.__IoPublish = function(){
		// 	summary:
		// 		This is a list of IO topics that can be published
		// 		if djConfig.ioPublish is set to true. IO topics can be
		// 		published for any Input/Output, network operation. So,
		// 		dojo.xhr, dojo.io.script and dojo.io.iframe can all
		// 		trigger these topics to be published.
		//	start: String
		//		"/dojo/io/start" is sent when there are no outstanding IO
		// 		requests, and a new IO request is started. No arguments
		// 		are passed with this topic.
		//	send: String
		//		"/dojo/io/send" is sent whenever a new IO request is started.
		// 		It passes the dojo.Deferred for the request with the topic.
		//	load: String
		//		"/dojo/io/load" is sent whenever an IO request has loaded
		// 		successfully. It passes the response and the dojo.Deferred
		// 		for the request with the topic.
		//	error: String
		//		"/dojo/io/error" is sent whenever an IO request has errored.
		// 		It passes the error and the dojo.Deferred
		// 		for the request with the topic.
		//	done: String
		//		"/dojo/io/done" is sent whenever an IO request has completed,
		// 		either by loading or by erroring. It passes the error and
		// 		the dojo.Deferred for the request with the topic.
		//	stop: String
		//		"/dojo/io/stop" is sent when all outstanding IO requests have
		// 		finished. No arguments are passed with this topic.
		this.start = "/dojo/io/start";
		this.send = "/dojo/io/send";
		this.load = "/dojo/io/load";
		this.error = "/dojo/io/error";
		this.done = "/dojo/io/done";
		this.stop = "/dojo/io/stop";
	}
	=====*/


	dojo._ioSetArgs = function(/*dojo.__IoArgs*/args,
			/*Function*/canceller,
			/*Function*/okHandler,
			/*Function*/errHandler){
		//	summary: 
		//		sets up the Deferred and ioArgs property on the Deferred so it
		//		can be used in an io call.
		//	args:
		//		The args object passed into the public io call. Recognized properties on
		//		the args object are:
		//	canceller:
		//		The canceller function used for the Deferred object. The function
		//		will receive one argument, the Deferred object that is related to the
		//		canceller.
		//	okHandler:
		//		The first OK callback to be registered with Deferred. It has the opportunity
		//		to transform the OK response. It will receive one argument -- the Deferred
		//		object returned from this function.
		//	errHandler:
		//		The first error callback to be registered with Deferred. It has the opportunity
		//		to do cleanup on an error. It will receive two arguments: error (the 
		//		Error object) and dfd, the Deferred object returned from this function.

		var ioArgs = {args: args, url: args.url};

		//Get values from form if requestd.
		var formObject = null;
		if(args.form){ 
			var form = _d.byId(args.form);
			//IE requires going through getAttributeNode instead of just getAttribute in some form cases, 
			//so use it for all.  See #2844
			var actnNode = form.getAttributeNode("action");
			ioArgs.url = ioArgs.url || (actnNode ? actnNode.value : null); 
			formObject = _d.formToObject(form);
		}

		// set up the query params
		var miArgs = [{}];
	
		if(formObject){
			// potentially over-ride url-provided params w/ form values
			miArgs.push(formObject);
		}
		if(args.content){
			// stuff in content over-rides what's set by form
			miArgs.push(args.content);
		}
		if(args.preventCache){
			miArgs.push({"dojo.preventCache": new Date().valueOf()});
		}
		ioArgs.query = _d.objectToQuery(_d.mixin.apply(null, miArgs));
	
		// .. and the real work of getting the deferred in order, etc.
		ioArgs.handleAs = args.handleAs || "text";
		var d = new _d.Deferred(canceller);
		d.addCallbacks(okHandler, function(error){
			return errHandler(error, d);
		});

		//Support specifying load, error and handle callback functions from the args.
		//For those callbacks, the "this" object will be the args object.
		//The callbacks will get the deferred result value as the
		//first argument and the ioArgs object as the second argument.
		var ld = args.load;
		if(ld && _d.isFunction(ld)){
			d.addCallback(function(value){
				return ld.call(args, value, ioArgs);
			});
		}
		var err = args.error;
		if(err && _d.isFunction(err)){
			d.addErrback(function(value){
				return err.call(args, value, ioArgs);
			});
		}
		var handle = args.handle;
		if(handle && _d.isFunction(handle)){
			d.addBoth(function(value){
				return handle.call(args, value, ioArgs);
			});
		}

		//Plug in topic publishing, if dojo.publish is loaded.
		if(cfg.ioPublish && _d["publish"] && ioArgs.args.ioPublish !== false){
			d.addCallbacks(
				function(res){
					_d["publish"]("/dojo/io/load", [d, res]);
					return res;
				},
				function(res){
					_d["publish"]("/dojo/io/error", [d, res]);
					return res;
				}
			);
			d.addBoth(function(res){
				_d["publish"]("/dojo/io/done", [d, res]);
				return res;
			});
		}

		d.ioArgs = ioArgs;
	
		// FIXME: need to wire up the xhr object's abort method to something
		// analagous in the Deferred
		return d;
	}

	var _deferredCancel = function(/*Deferred*/dfd){
		//summary: canceller function for dojo._ioSetArgs call.
		
		dfd.canceled = true;
		var xhr = dfd.ioArgs.xhr;
		var _at = typeof xhr.abort;
		if(_at == "function" || _at == "object" || _at == "unknown"){
			xhr.abort();
		}
		var err = dfd.ioArgs.error;
		if(!err){
			err = new Error("xhr cancelled");
			err.dojoType="cancel";
		}
		return err;
	}
	var _deferredOk = function(/*Deferred*/dfd){
		//summary: okHandler function for dojo._ioSetArgs call.

		var ret = _d._contentHandlers[dfd.ioArgs.handleAs](dfd.ioArgs.xhr);
		return ret === undefined ? null : ret;
	}
	var _deferError = function(/*Error*/error, /*Deferred*/dfd){
		//summary: errHandler function for dojo._ioSetArgs call.

		console.error(error);
		return error;
	}

	// avoid setting a timer per request. It degrades performance on IE
	// something fierece if we don't use unified loops.
	var _inFlightIntvl = null;
	var _inFlight = [];
	
	
	//Use a separate count for knowing if we are starting/stopping io calls.
	//Cannot use _inFlight.length since it can change at a different time than
	//when we want to do this kind of test. We only want to decrement the count
	//after a callback/errback has finished, since the callback/errback should be
	//considered as part of finishing a request.
	var _pubCount = 0;
	var _checkPubCount = function(dfd){
		if(_pubCount <= 0){
			_pubCount = 0;
			if(cfg.ioPublish && _d["publish"] && (!dfd || dfd && dfd.ioArgs.args.ioPublish !== false)){
				_d["publish"]("/dojo/io/stop");
			}
		}
	};

	var _watchInFlight = function(){
		//summary: 
		//		internal method that checks each inflight XMLHttpRequest to see
		//		if it has completed or if the timeout situation applies.
		
		var now = (new Date()).getTime();
		// make sure sync calls stay thread safe, if this callback is called
		// during a sync call and this results in another sync call before the
		// first sync call ends the browser hangs
		if(!_d._blockAsync){
			// we need manual loop because we often modify _inFlight (and therefore 'i') while iterating
			// note: the second clause is an assigment on purpose, lint may complain
			for(var i = 0, tif; i < _inFlight.length && (tif = _inFlight[i]); i++){
				var dfd = tif.dfd;
				var func = function(){
					if(!dfd || dfd.canceled || !tif.validCheck(dfd)){
						_inFlight.splice(i--, 1); 
						_pubCount -= 1;
					}else if(tif.ioCheck(dfd)){
						_inFlight.splice(i--, 1);
						tif.resHandle(dfd);
						_pubCount -= 1;
					}else if(dfd.startTime){
						//did we timeout?
						if(dfd.startTime + (dfd.ioArgs.args.timeout || 0) < now){
							_inFlight.splice(i--, 1);
							var err = new Error("timeout exceeded");
							err.dojoType = "timeout";
							dfd.errback(err);
							//Cancel the request so the io module can do appropriate cleanup.
							dfd.cancel();
							_pubCount -= 1;
						}
					}
				};
				if(dojo.config.debugAtAllCosts){
					func.call(this);
				}else{
					try{
						func.call(this);
					}catch(e){
						dfd.errback(e);
					}
				}
			}
		}

		_checkPubCount(dfd);

		if(!_inFlight.length){
			clearInterval(_inFlightIntvl);
			_inFlightIntvl = null;
			return;
		}
	}

	dojo._ioCancelAll = function(){
		//summary: Cancels all pending IO requests, regardless of IO type
		//(xhr, script, iframe).
		try{
			_d.forEach(_inFlight, function(i){
				try{
					i.dfd.cancel();
				}catch(e){/*squelch*/}
			});
		}catch(e){/*squelch*/}
	}

	//Automatically call cancel all io calls on unload
	//in IE for trac issue #2357.
		if(_d.isIE){
		_d.addOnWindowUnload(_d._ioCancelAll);
	}
	
	_d._ioNotifyStart = function(/*Deferred*/dfd){
		// summary:
		// 		If dojo.publish is available, publish topics
		// 		about the start of a request queue and/or the
		// 		the beginning of request.
		// description:
		// 		Used by IO transports. An IO transport should
		// 		call this method before making the network connection.
		if(cfg.ioPublish && _d["publish"] && dfd.ioArgs.args.ioPublish !== false){
			if(!_pubCount){
				_d["publish"]("/dojo/io/start");
			}
			_pubCount += 1;
			_d["publish"]("/dojo/io/send", [dfd]);
		}
	}

	_d._ioWatch = function(/*Deferred*/dfd,
		/*Function*/validCheck,
		/*Function*/ioCheck,
		/*Function*/resHandle){
		//summary: watches the io request represented by dfd to see if it completes.
		//dfd:
		//		The Deferred object to watch.
		//validCheck:
		//		Function used to check if the IO request is still valid. Gets the dfd
		//		object as its only argument.
		//ioCheck:
		//		Function used to check if basic IO call worked. Gets the dfd
		//		object as its only argument.
		//resHandle:
		//		Function used to process response. Gets the dfd
		//		object as its only argument.
		var args = dfd.ioArgs.args;
		if(args.timeout){
			dfd.startTime = (new Date()).getTime();
		}
		
		_inFlight.push({dfd: dfd, validCheck: validCheck, ioCheck: ioCheck, resHandle: resHandle});
		if(!_inFlightIntvl){
			_inFlightIntvl = setInterval(_watchInFlight, 50);
		}
		// handle sync requests
		//A weakness: async calls in flight
		//could have their handlers called as part of the
		//_watchInFlight call, before the sync's callbacks
		// are called.
		if(args.sync){
			_watchInFlight();
		}
	}

	var _defaultContentType = "application/x-www-form-urlencoded";

	var _validCheck = function(/*Deferred*/dfd){
		return dfd.ioArgs.xhr.readyState; //boolean
	}
	var _ioCheck = function(/*Deferred*/dfd){
		return 4 == dfd.ioArgs.xhr.readyState; //boolean
	}
	var _resHandle = function(/*Deferred*/dfd){
		var xhr = dfd.ioArgs.xhr;
		if(_d._isDocumentOk(xhr)){
			dfd.callback(dfd);
		}else{
			var err = new Error("Unable to load " + dfd.ioArgs.url + " status:" + xhr.status);
			err.status = xhr.status;
			err.responseText = xhr.responseText;
			dfd.errback(err);
		}
	}

	dojo._ioAddQueryToUrl = function(/*dojo.__IoCallbackArgs*/ioArgs){
		//summary: Adds query params discovered by the io deferred construction to the URL.
		//Only use this for operations which are fundamentally GET-type operations.
		if(ioArgs.query.length){
			ioArgs.url += (ioArgs.url.indexOf("?") == -1 ? "?" : "&") + ioArgs.query;
			ioArgs.query = null;
		}		
	}

	/*=====
	dojo.declare("dojo.__XhrArgs", dojo.__IoArgs, {
		constructor: function(){
			//	summary:
			//		In addition to the properties listed for the dojo._IoArgs type,
			//		the following properties are allowed for dojo.xhr* methods.
			//	handleAs: String?
			//		Acceptable values are: text (default), json, json-comment-optional,
			//		json-comment-filtered, javascript, xml
			//	sync: Boolean?
			//		false is default. Indicates whether the request should
			//		be a synchronous (blocking) request.
			//	headers: Object?
			//		Additional HTTP headers to send in the request.
			this.handleAs = handleAs;
			this.sync = sync;
			this.headers = headers;
		}
	});
	=====*/

	dojo.xhr = function(/*String*/ method, /*dojo.__XhrArgs*/ args, /*Boolean?*/ hasBody){
		//	summary:
		//		Sends an HTTP request with the given method.
		//	description:
		//		Sends an HTTP request with the given method.
		//		See also dojo.xhrGet(), xhrPost(), xhrPut() and dojo.xhrDelete() for shortcuts
		//		for those HTTP methods. There are also methods for "raw" PUT and POST methods
		//		via dojo.rawXhrPut() and dojo.rawXhrPost() respectively.
		//	method:
		//		HTTP method to be used, such as GET, POST, PUT, DELETE.  Should be uppercase.
		//	hasBody:
		//		If the request has an HTTP body, then pass true for hasBody.

		//Make the Deferred object for this xhr request.
		var dfd = _d._ioSetArgs(args, _deferredCancel, _deferredOk, _deferError);
		var ioArgs = dfd.ioArgs;

		//Pass the args to _xhrObj, to allow xhr iframe proxy interceptions.
		var xhr = dfd.ioArgs.xhr = _d._xhrObj(dfd.ioArgs.args);
		//If XHR factory fails, cancel the deferred.
		if(!xhr){
			dfd.cancel();
			return dfd;
		}

		//Allow for specifying the HTTP body completely.
		if("postData" in args){
			ioArgs.query = args.postData;
		}else if("putData" in args){
			ioArgs.query = args.putData;
		}else if("rawBody" in args){
			ioArgs.query = args.rawBody;
		}else if((arguments.length > 2 && !hasBody) || "POST|PUT".indexOf(method.toUpperCase()) == -1){
			//Check for hasBody being passed. If no hasBody,
			//then only append query string if not a POST or PUT request.
			_d._ioAddQueryToUrl(dfd.ioArgs);
		}

		// IE 6 is a steaming pile. It won't let you call apply() on the native function (xhr.open).
		// workaround for IE6's apply() "issues"
		xhr.open(method, ioArgs.url, args.sync !== true, args.user || undefined, args.password || undefined);
		if(args.headers){
			for(var hdr in args.headers){
				if(hdr.toLowerCase() === "content-type" && !args.contentType){
					args.contentType = args.headers[hdr];
				}else{
					xhr.setRequestHeader(hdr, args.headers[hdr]);
				}
			}
		}
		// FIXME: is this appropriate for all content types?
		xhr.setRequestHeader("Content-Type", args.contentType || _defaultContentType);
		if(!args.headers || !args.headers["X-Requested-With"]){
			xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
		}
		// FIXME: set other headers here!
		_d._ioNotifyStart(dfd);
		if(dojo.config.debugAtAllCosts){
			xhr.send(ioArgs.query);
		}else{
			try{
				xhr.send(ioArgs.query);
			}catch(e){
				dfd.ioArgs.error = e;
				dfd.cancel();
			}
		}
		_d._ioWatch(dfd, _validCheck, _ioCheck, _resHandle);
		xhr = null;
		return dfd; // dojo.Deferred
	}

	dojo.xhrGet = function(/*dojo.__XhrArgs*/ args){
		//	summary: 
		//		Sends an HTTP GET request to the server.
		return _d.xhr("GET", args); // dojo.Deferred
	}

	dojo.rawXhrPost = dojo.xhrPost = function(/*dojo.__XhrArgs*/ args){
		//	summary:
		//		Sends an HTTP POST request to the server. In addtion to the properties
		//		listed for the dojo.__XhrArgs type, the following property is allowed:
		//	postData:
		//		String. Send raw data in the body of the POST request.
		return _d.xhr("POST", args, true); // dojo.Deferred
	}

	dojo.rawXhrPut = dojo.xhrPut = function(/*dojo.__XhrArgs*/ args){
		//	summary:
		//		Sends an HTTP PUT request to the server. In addtion to the properties
		//		listed for the dojo.__XhrArgs type, the following property is allowed:
		//	putData:
		//		String. Send raw data in the body of the PUT request.
		return _d.xhr("PUT", args, true); // dojo.Deferred
	}

	dojo.xhrDelete = function(/*dojo.__XhrArgs*/ args){
		//	summary:
		//		Sends an HTTP DELETE request to the server.
		return _d.xhr("DELETE", args); //dojo.Deferred
	}

	/*
	dojo.wrapForm = function(formNode){
		//summary:
		//		A replacement for FormBind, but not implemented yet.

		// FIXME: need to think harder about what extensions to this we might
		// want. What should we allow folks to do w/ this? What events to
		// set/send?
		throw new Error("dojo.wrapForm not yet implemented");
	}
	*/
})();

}

if(!dojo._hasResource["dojo._base.fx"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo._base.fx"] = true;
dojo.provide("dojo._base.fx");





/*
	Animation loosely package based on Dan Pupius' work, contributed under CLA: 
		http://pupius.co.uk/js/Toolkit.Drawing.js
*/
(function(){ 
	var d = dojo;
	var _mixin = d._mixin;
	
	dojo._Line = function(/*int*/ start, /*int*/ end){
		//	summary:
		//		dojo._Line is the object used to generate values from a start value
		//		to an end value
		//	start: int
		//		Beginning value for range
		//	end: int
		//		Ending value for range
		this.start = start;
		this.end = end;
	};
	
	dojo._Line.prototype.getValue = function(/*float*/ n){
		//	summary: Returns the point on the line
		//	n: a floating point number greater than 0 and less than 1
		return ((this.end - this.start) * n) + this.start; // Decimal
	};
	
	dojo.Animation = function(args){
		//	summary:
		//		A generic animation class that fires callbacks into its handlers
		//		object at various states. 
		//	description:
		//		A generic animation class that fires callbacks into its handlers
		//		object at various states. Nearly all dojo animation functions
		//		return an instance of this method, usually without calling the
		//		.play() method beforehand. Therefore, you will likely need to
		//		call .play() on instances of `dojo.Animation` when one is
		//		returned.
		// args: Object
		//		The 'magic argument', mixing all the properties into this
		//		animation instance. 
		
		_mixin(this, args);
		if(d.isArray(this.curve)){
			this.curve = new d._Line(this.curve[0], this.curve[1]);
		}
		
	};
	
	// Alias to drop come 2.0:
	d._Animation = d.Animation;
	
	d.extend(dojo.Animation, {
		// duration: Integer
		//		The time in milliseonds the animation will take to run
		duration: 350,
	
	/*=====
		// curve: dojo._Line|Array
		//		A two element array of start and end values, or a `dojo._Line` instance to be
		//		used in the Animation. 
		curve: null,
	
		// easing: Function?
		//		A Function to adjust the acceleration (or deceleration) of the progress 
		//		across a dojo._Line
		easing: null,
	=====*/
	
		// repeat: Integer?
		//		The number of times to loop the animation
		repeat: 0,
	
		// rate: Integer?
		//		the time in milliseconds to wait before advancing to next frame 
		//		(used as a fps timer: 1000/rate = fps)
		rate: 20 /* 50 fps */,
	
	/*===== 
		// delay: Integer?
		//		The time in milliseconds to wait before starting animation after it 
		//		has been .play()'ed
		delay: null,
	
		// beforeBegin: Event?
		//		Synthetic event fired before a dojo.Animation begins playing (synchronous)
		beforeBegin: null,
	
		// onBegin: Event?
		//		Synthetic event fired as a dojo.Animation begins playing (useful?)
		onBegin: null,
	
		// onAnimate: Event?
		//		Synthetic event fired at each interval of a `dojo.Animation`
		onAnimate: null,
	
		// onEnd: Event?
		//		Synthetic event fired after the final frame of a `dojo.Animation`
		onEnd: null,
	
		// onPlay: Event?
		//		Synthetic event fired any time a `dojo.Animation` is play()'ed
		onPlay: null,
	
		// onPause: Event?
		//		Synthetic event fired when a `dojo.Animation` is paused
		onPause: null,
	
		// onStop: Event
		//		Synthetic event fires when a `dojo.Animation` is stopped
		onStop: null,
	
	=====*/
	
		_percent: 0,
		_startRepeatCount: 0,
	
		_fire: function(/*Event*/ evt, /*Array?*/ args){
			//	summary:
			//		Convenience function.  Fire event "evt" and pass it the
			//		arguments specified in "args".
			//	description:
			//		Convenience function.  Fire event "evt" and pass it the
			//		arguments specified in "args".
			//		Fires the callback in the scope of the `dojo.Animation` 
			//		instance.
			//	evt:
			//		The event to fire.
			//	args:
			//		The arguments to pass to the event.
			var a = args||[];
			if(this[evt]){
				if(d.config.debugAtAllCosts){
					this[evt].apply(this, a);
				}else{
					try{
						this[evt].apply(this, a);
					}catch(e){
						// squelch and log because we shouldn't allow exceptions in
						// synthetic event handlers to cause the internal timer to run
						// amuck, potentially pegging the CPU. I'm not a fan of this
						// squelch, but hopefully logging will make it clear what's
						// going on
						console.error("exception in animation handler for:", evt);
						console.error(e);
					}
				}
			}
			return this; // dojo.Animation
		},

		play: function(/*int?*/ delay, /*Boolean?*/ gotoStart){
			// summary:
			//		Start the animation.
			// delay:
			//		How many milliseconds to delay before starting.
			// gotoStart:
			//		If true, starts the animation from the beginning; otherwise,
			//		starts it from its current position.
			// returns: dojo.Animation
			//		The instance to allow chaining.

			var _t = this;
			if(_t._delayTimer){ _t._clearTimer(); }
			if(gotoStart){
				_t._stopTimer();
				_t._active = _t._paused = false;
				_t._percent = 0;
			}else if(_t._active && !_t._paused){
				return _t;
			}
	
			_t._fire("beforeBegin", [_t.node]);
	
			var de = delay || _t.delay,
				_p = dojo.hitch(_t, "_play", gotoStart);
				
			if(de > 0){
				_t._delayTimer = setTimeout(_p, de);
				return _t;
			}
			_p();
			return _t;
		},
	
		_play: function(gotoStart){
			var _t = this;
			if(_t._delayTimer){ _t._clearTimer(); }
			_t._startTime = new Date().valueOf();
			if(_t._paused){
				_t._startTime -= _t.duration * _t._percent;
			}
			_t._endTime = _t._startTime + _t.duration;
	
			_t._active = true;
			_t._paused = false;
	
			var value = _t.curve.getValue(_t._percent);
			if(!_t._percent){
				if(!_t._startRepeatCount){
					_t._startRepeatCount = _t.repeat;
				}
				_t._fire("onBegin", [value]);
			}
	
			_t._fire("onPlay", [value]);
	
			_t._cycle();
			return _t; // dojo.Animation
		},
	
		pause: function(){
			// summary: Pauses a running animation.
			var _t = this;
			if(_t._delayTimer){ _t._clearTimer(); }
			_t._stopTimer();
			if(!_t._active){ return _t; /*dojo.Animation*/ }
			_t._paused = true;
			_t._fire("onPause", [_t.curve.getValue(_t._percent)]);
			return _t; // dojo.Animation
		},
	
		gotoPercent: function(/*Decimal*/ percent, /*Boolean?*/ andPlay){
			//	summary:
			//		Sets the progress of the animation.
			//	percent:
			//		A percentage in decimal notation (between and including 0.0 and 1.0).
			//	andPlay:
			//		If true, play the animation after setting the progress.
			var _t = this;
			_t._stopTimer();
			_t._active = _t._paused = true;
			_t._percent = percent;
			if(andPlay){ _t.play(); }
			return _t; // dojo.Animation
		},
	
		stop: function(/*boolean?*/ gotoEnd){
			// summary: Stops a running animation.
			// gotoEnd: If true, the animation will end.
			var _t = this;
			if(_t._delayTimer){ _t._clearTimer(); }
			if(!_t._timer){ return _t; /* dojo.Animation */ }
			_t._stopTimer();
			if(gotoEnd){
				_t._percent = 1;
			}
			_t._fire("onStop", [_t.curve.getValue(_t._percent)]);
			_t._active = _t._paused = false;
			return _t; // dojo.Animation
		},
	
		status: function(){
			// summary: 
			//		Returns a string token representation of the status of
			//		the animation, one of: "paused", "playing", "stopped"
			if(this._active){
				return this._paused ? "paused" : "playing"; // String
			}
			return "stopped"; // String
		},
	
		_cycle: function(){
			var _t = this;
			if(_t._active){
				var curr = new Date().valueOf();
				var step = (curr - _t._startTime) / (_t._endTime - _t._startTime);
	
				if(step >= 1){
					step = 1;
				}
				_t._percent = step;
	
				// Perform easing
				if(_t.easing){
					step = _t.easing(step);
				}
	
				_t._fire("onAnimate", [_t.curve.getValue(step)]);
	
				if(_t._percent < 1){
					_t._startTimer();
				}else{
					_t._active = false;
	
					if(_t.repeat > 0){
						_t.repeat--;
						_t.play(null, true);
					}else if(_t.repeat == -1){
						_t.play(null, true);
					}else{
						if(_t._startRepeatCount){
							_t.repeat = _t._startRepeatCount;
							_t._startRepeatCount = 0;
						}
					}
					_t._percent = 0;
					_t._fire("onEnd", [_t.node]);
					_t._stopTimer();
				}
			}
			return _t; // dojo.Animation
		},
		
		_clearTimer: function(){
			// summary: Clear the play delay timer
			clearTimeout(this._delayTimer);
			delete this._delayTimer;
		}
		
	});

	// the local timer, stubbed into all Animation instances
	var ctr = 0,
		_globalTimerList = [],
		timer = null,
		runner = {
			run: function(){}
		};

	d.extend(d.Animation, {

		_startTimer: function(){
			if(!this._timer){
				this._timer = d.connect(runner, "run", this, "_cycle");
				ctr++;
			}
			if(!timer){
				timer = setInterval(d.hitch(runner, "run"), this.rate);
			}
		},

		_stopTimer: function(){
			if(this._timer){
				d.disconnect(this._timer);
				this._timer = null;
				ctr--;
			}
			if(ctr <= 0){
				clearInterval(timer);
				timer = null;
				ctr = 0;
			}
		}

	});

	var _makeFadeable = 
				d.isIE ? function(node){
			// only set the zoom if the "tickle" value would be the same as the
			// default
			var ns = node.style;
			// don't set the width to auto if it didn't already cascade that way.
			// We don't want to f anyones designs
			if(!ns.width.length && d.style(node, "width") == "auto"){
				ns.width = "auto";
			}
		} : 
				function(){};

	dojo._fade = function(/*Object*/ args){
		//	summary: 
		//		Returns an animation that will fade the node defined by
		//		args.node from the start to end values passed (args.start
		//		args.end) (end is mandatory, start is optional)

		args.node = d.byId(args.node);
		var fArgs = _mixin({ properties: {} }, args),
		 	props = (fArgs.properties.opacity = {});
		
		props.start = !("start" in fArgs) ?
			function(){ 
				return +d.style(fArgs.node, "opacity")||0; 
			} : fArgs.start;
		props.end = fArgs.end;

		var anim = d.animateProperty(fArgs);
		d.connect(anim, "beforeBegin", d.partial(_makeFadeable, fArgs.node));

		return anim; // dojo.Animation
	};

	/*=====
	dojo.__FadeArgs = function(node, duration, easing){
		// 	node: DOMNode|String
		//		The node referenced in the animation
		//	duration: Integer?
		//		Duration of the animation in milliseconds.
		//	easing: Function?
		//		An easing function.
		this.node = node;
		this.duration = duration;
		this.easing = easing;
	}
	=====*/

	dojo.fadeIn = function(/*dojo.__FadeArgs*/ args){
		// summary: 
		//		Returns an animation that will fade node defined in 'args' from
		//		its current opacity to fully opaque.
		return d._fade(_mixin({ end: 1 }, args)); // dojo.Animation
	};

	dojo.fadeOut = function(/*dojo.__FadeArgs*/  args){
		// summary: 
		//		Returns an animation that will fade node defined in 'args'
		//		from its current opacity to fully transparent.
		return d._fade(_mixin({ end: 0 }, args)); // dojo.Animation
	};

	dojo._defaultEasing = function(/*Decimal?*/ n){
		// summary: The default easing function for dojo.Animation(s)
		return 0.5 + ((Math.sin((n + 1.5) * Math.PI)) / 2);
	};

	var PropLine = function(properties){
		// PropLine is an internal class which is used to model the values of
		// an a group of CSS properties across an animation lifecycle. In
		// particular, the "getValue" function handles getting interpolated
		// values between start and end for a particular CSS value.
		this._properties = properties;
		for(var p in properties){
			var prop = properties[p];
			if(prop.start instanceof d.Color){
				// create a reusable temp color object to keep intermediate results
				prop.tempColor = new d.Color();
			}
		}
	};

	PropLine.prototype.getValue = function(r){
		var ret = {};
		for(var p in this._properties){
			var prop = this._properties[p],
				start = prop.start;
			if(start instanceof d.Color){
				ret[p] = d.blendColors(start, prop.end, r, prop.tempColor).toCss();
			}else if(!d.isArray(start)){
				ret[p] = ((prop.end - start) * r) + start + (p != "opacity" ? prop.units || "px" : 0);
			}
		}
		return ret;
	};

	/*=====
	dojo.declare("dojo.__AnimArgs", [dojo.__FadeArgs], {
		// Properties: Object?
		//	A hash map of style properties to Objects describing the transition,
		//	such as the properties of dojo._Line with an additional 'units' property
		properties: {}
		
		//TODOC: add event callbacks
	});
	=====*/

	dojo.animateProperty = function(/*dojo.__AnimArgs*/ args){
		// summary: 
		//		Returns an animation that will transition the properties of
		//		node defined in `args` depending how they are defined in
		//		`args.properties`
		//
		// description:
		//		`dojo.animateProperty` is the foundation of most `dojo.fx`
		//		animations. It takes an object of "properties" corresponding to
		//		style properties, and animates them in parallel over a set
		//		duration.
		//	
		// example:
		//		A simple animation that changes the width of the specified node.
		//	|	dojo.animateProperty({ 
		//	|		node: "nodeId",
		//	|		properties: { width: 400 },
		//	|	}).play();
		//		Dojo figures out the start value for the width and converts the
		//		integer specified for the width to the more expressive but
		//		verbose form `{ width: { end: '400', units: 'px' } }` which you
		//		can also specify directly. Defaults to 'px' if ommitted.
		//
		// example:
		//		Animate width, height, and padding over 2 seconds... the
		//		pedantic way:
		//	|	dojo.animateProperty({ node: node, duration:2000,
		//	|		properties: {
		//	|			width: { start: '200', end: '400', units:"px" },
		//	|			height: { start:'200', end: '400', units:"px" },
		//	|			paddingTop: { start:'5', end:'50', units:"px" } 
		//	|		}
		//	|	}).play();
		//		Note 'paddingTop' is used over 'padding-top'. Multi-name CSS properties
		//		are written using "mixed case", as the hyphen is illegal as an object key.
		//		
		// example:
		//		Plug in a different easing function and register a callback for
		//		when the animation ends. Easing functions accept values between
		//		zero and one and return a value on that basis. In this case, an
		//		exponential-in curve.
		//	|	dojo.animateProperty({ 
		//	|		node: "nodeId",
		//	|		// dojo figures out the start value
		//	|		properties: { width: { end: 400 } },
		//	|		easing: function(n){
		//	|			return (n==0) ? 0 : Math.pow(2, 10 * (n - 1));
		//	|		},
		//	|		onEnd: function(node){
		//	|			// called when the animation finishes. The animation
		//	|			// target is passed to this function
		//	|		}
		//	|	}).play(500); // delay playing half a second
		//
		// example:
		//		Like all `dojo.Animation`s, animateProperty returns a handle to the
		//		Animation instance, which fires the events common to Dojo FX. Use `dojo.connect`
		//		to access these events outside of the Animation definiton:
		//	|	var anim = dojo.animateProperty({
		//	|		node:"someId",
		//	|		properties:{
		//	|			width:400, height:500
		//	|		}
		//	|	});
		//	|	dojo.connect(anim,"onEnd", function(){
		//	|		console.log("animation ended");
		//	|	});
		//	|	// play the animation now:
		//	|	anim.play();
		//
		// example:
		//		Each property can be a function whose return value is substituted along.
		//		Additionally, each measurement (eg: start, end) can be a function. The node
		//		reference is passed direcly to callbacks.
		//	|	dojo.animateProperty({
		//	|		node:"mine",
		//	|		properties:{
		//	|			height:function(node){
		//	|				// shrink this node by 50%
		//	|				return dojo.coords(node).h / 2
		//	|			},
		//	|			width:{
		//	|				start:function(node){ return 100; },
		//	|				end:function(node){ return 200; }	
		//	|			}
		//	|		}
		//	|	}).play();
		//

		var n = args.node = d.byId(args.node);
		if(!args.easing){ args.easing = d._defaultEasing; }

		var anim = new d.Animation(args);
		d.connect(anim, "beforeBegin", anim, function(){
			var pm = {};
			for(var p in this.properties){
				// Make shallow copy of properties into pm because we overwrite
				// some values below. In particular if start/end are functions
				// we don't want to overwrite them or the functions won't be
				// called if the animation is reused.
				if(p == "width" || p == "height"){
					this.node.display = "block";
				}
				var prop = this.properties[p];
				if(d.isFunction(prop)){
					prop = prop(n);
				}
				prop = pm[p] = _mixin({}, (d.isObject(prop) ? prop: { end: prop }));

				if(d.isFunction(prop.start)){
					prop.start = prop.start(n);
				}
				if(d.isFunction(prop.end)){
					prop.end = prop.end(n);
				}
				var isColor = (p.toLowerCase().indexOf("color") >= 0);
				function getStyle(node, p){
					// dojo.style(node, "height") can return "auto" or "" on IE; this is more reliable:
					var v = { height: node.offsetHeight, width: node.offsetWidth }[p];
					if(v !== undefined){ return v; }
					v = d.style(node, p);
					return (p == "opacity") ? +v : (isColor ? v : parseFloat(v));
				}
				if(!("end" in prop)){
					prop.end = getStyle(n, p);
				}else if(!("start" in prop)){
					prop.start = getStyle(n, p);
				}

				if(isColor){
					prop.start = new d.Color(prop.start);
					prop.end = new d.Color(prop.end);
				}else{
					prop.start = (p == "opacity") ? +prop.start : parseFloat(prop.start);
				}
			}
			this.curve = new PropLine(pm);
		});
		d.connect(anim, "onAnimate", d.hitch(d, "style", anim.node));
		return anim; // dojo.Animation
	};

	dojo.anim = function(	/*DOMNode|String*/ 	node, 
							/*Object*/ 			properties, 
							/*Integer?*/		duration, 
							/*Function?*/		easing, 
							/*Function?*/		onEnd,
							/*Integer?*/		delay){
		//	summary:
		//		A simpler interface to `dojo.animateProperty()`, also returns
		//		an instance of `dojo.Animation` but begins the animation
		//		immediately, unlike nearly every other Dojo animation API.
		//	description:
		//		`dojo.anim` is a simpler (but somewhat less powerful) version
		//		of `dojo.animateProperty`.  It uses defaults for many basic properties
		//		and allows for positional parameters to be used in place of the
		//		packed "property bag" which is used for other Dojo animation
		//		methods.
		//
		//		The `dojo.Animation` object returned from `dojo.anim` will be
		//		already playing when it is returned from this function, so
		//		calling play() on it again is (usually) a no-op.
		//	node:
		//		a DOM node or the id of a node to animate CSS properties on
		//	duration:
		//		The number of milliseconds over which the animation
		//		should run. Defaults to the global animation default duration
		//		(350ms).
		//	easing:
		//		An easing function over which to calculate acceleration
		//		and deceleration of the animation through its duration.
		//		A default easing algorithm is provided, but you may
		//		plug in any you wish. A large selection of easing algorithms
		//		are available in `dojo.fx.easing`.
		//	onEnd:
		//		A function to be called when the animation finishes
		//		running.
		//	delay:
		//		The number of milliseconds to delay beginning the
		//		animation by. The default is 0.
		//	example:
		//		Fade out a node
		//	|	dojo.anim("id", { opacity: 0 });
		//	example:
		//		Fade out a node over a full second
		//	|	dojo.anim("id", { opacity: 0 }, 1000);
		return d.animateProperty({ // dojo.Animation
			node: node,
			duration: duration || d.Animation.prototype.duration,
			properties: properties,
			easing: easing,
			onEnd: onEnd 
		}).play(delay || 0);
	};
})();

}

if(!dojo._hasResource["dojo._base.browser"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo._base.browser"] = true;
dojo.provide("dojo._base.browser");










//Need this to be the last code segment in base, so do not place any
//dojo.requireIf calls in this file. Otherwise, due to how the build system
//puts all requireIf dependencies after the current file, the require calls
//could be called before all of base is defined.
dojo.forEach(dojo.config.require, function(i){
	dojo["require"](i);
});

}

if(!dojo._hasResource["bespin.bespin"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.bespin"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

// = Bespin =
//
// This is the root of it all. The {{{ bespin }}} namespace.
// All of the JavaScript for Bespin will be placed in this namespace later.
//
// {{{ bespin.versionNumber }}} is the core version of the Bespin system
// {{{ bespin.apiVersion }}} is the version number of the API (to ensure that the
//                          client and server are talking the same language)
// {{{ bespin.displayVersion }}} is a function that sets innerHTML on the element given, with the Bespin version info
//
// {{{ bespin.publish }}} maps onto dojo.publish but lets us abstract away for the future
// {{{ bespin.subscribe }}} maps onto dojo.subscribe but lets us abstract away for the future
// {{{ bespin.unsubscribe }}} maps onto dojo.unsubscribe but lets us abstract away for the future
//
// {{{ bespin.register }}} is the way to attach components into the bespin system for others to get out
// {{{ bespin.get }}} allows you to get registered components out
// {{{ bespin.withComponent }}} maps onto dojo.subscribe but lets us abstract away for the future

(function () {
dojo.provide("bespin.bespin");

var lazySubscriptionCount   = 0;  // holds the count to keep a unique value for setTimeout
var lazySubscriptionTimeout = {}; // holds the timeouts so they can be cleared later

dojo.mixin(bespin, {
    // BEGIN VERSION BLOCK
    versionNumber: 'tip',
    versionCodename: 'DEVELOPMENT MODE',
    apiVersion: 'dev',
    // END VERSION BLOCK

    defaultTabSize: 4,
    userSettingsProject: "BespinSettings",
    
    eventLog: {},

    // == Methods for tying to the event bus

    // ** {{{ publish }}} **
    //
    // Given a topic and a set of parameters, publish onto the bus
    publish: function(topic, args) {
        bespin.eventLog[topic] = true;
        
        dojo.publish("bespin:" + topic, dojo.isArray(args) ? args : [ args || {} ]);
    },
    
    // ** {{{ fireAfter }}} **
    //
    // Given an array of topics, fires given callback as soon as all of the topics have 
    // fired at least once
    fireAfter: function (topics, callback) {
        var count = topics.length;
        var done  = function () {
            if(count == 0) {
                callback();
            }
        };
        for(var i = 0; i < topics.length; ++i) {
            var topic = topics[i];
            if (bespin.eventLog[topic]) {
                --count;
            } else {
                bespin.subscribe(topic, function () {
                    --count;
                    done()
                })
            }
            done();
        }
    },

    // ** {{{ subscribe }}} **
    //
    // Given a topic and a function, subscribe to the event
    // If minTimeBetweenPublishMillis is set to an integer the subscription will not
    // be invoked more than once within this time interval
    subscribe: function(topic, callback, minTimeBetweenPublishMillis) {
        if (minTimeBetweenPublishMillis) {
            var orig = callback;

            var count = lazySubscriptionCount++;

            callback = function lazySubscriptionWrapper() {
                if (lazySubscriptionTimeout[count]) {
                    clearTimeout(lazySubscriptionTimeout[count]);
                }

                lazySubscriptionTimeout[count] = setTimeout(dojo.hitch(this, function() {
                    orig.apply(this, arguments);
                    delete lazySubscriptionTimeout[count];
                }), minTimeBetweenPublishMillis);
            };

        }
        return dojo.subscribe("bespin:" + topic, callback);
    },

    // ** {{{ unsubscribe }}} **
    //
    // Unsubscribe the functions from the topic
    unsubscribe: dojo.unsubscribe,

    // == Methods for registering components with the main system
    registeredComponents: {},

    // ** {{{ register }}} **
    //
    // Given an id and an object, register it inside of Bespin
    register: function(id, object) {
        this.registeredComponents[id] = object;

        bespin.publish("component:register", { id: id, object: object });

        return object;
    },

    // ** {{{ get }}} **
    //
    // Given an id return the component
    get: function(id) {
        return this.registeredComponents[id];
    },

    // ** {{{ withComponent }}} **
    //
    // Given an id, and function to run, execute it if the component is available
    withComponent: function(id, func) {
        var component = this.get(id);
        if (component) {
            return func(component);
        }
    },

    // ** {{{ displayVersion }}} **
    //
    // Given an HTML element
    displayVersion: function(el) {
        var el = dojo.byId(el) || dojo.byId("version");
        if (!el) return;
        el.innerHTML = '<a href="https://wiki.mozilla.org/Labs/Bespin/ReleaseNotes" title="Read the release notes">Version <span class="versionnumber">' + this.versionNumber + '</span> "' + this.versionCodename + '"</a>';
    }

});
})()


}

if(!dojo._hasResource["bespin.util.canvas"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.util.canvas"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

dojo.provide("bespin.util.canvas");

// = Canvas Shim =
//
// Make canvas work the same on the different browsers and their quirks

// ** {{{ bespin.util.fixcanvas.fix }}} **
//
// Take the context and clean it up

dojo.mixin(bespin.util.canvas, {
    fix: function(ctx) {
        // * upgrade Firefox 3.0.x text rendering to HTML 5 standard
        if (!ctx.fillText && ctx.mozDrawText) {
            ctx.fillText = function(textToDraw, x, y, maxWidth) {
                ctx.translate(x, y);
                ctx.mozTextStyle = ctx.font;
                ctx.mozDrawText(textToDraw);
                ctx.translate(-x, -y);
            };
        }

        // * Setup measureText
        if (!ctx.measureText && ctx.mozMeasureText) {
            ctx.measureText = function(text) {
                if (ctx.font) ctx.mozTextStyle = ctx.font;
                var width = ctx.mozMeasureText(text);
                return { width: width };
            };
        }

        // * Setup html5MeasureText
        if (ctx.measureText && !ctx.html5MeasureText) {
            ctx.html5MeasureText = ctx.measureText;
            ctx.measureText = function(text) {
                var textMetrics = ctx.html5MeasureText(text);

                // fake it 'til you make it
                textMetrics.ascent = ctx.html5MeasureText("m").width;

                return textMetrics;
            };
        }

        // * for other browsers, no-op away
        if (!ctx.fillText) {
            ctx.fillText = function() {};
        }

        if (!ctx.measureText) {
            ctx.measureText = function() { return 10; };
        }

        return ctx;
    }
});

}

if(!dojo._hasResource["bespin.util.keys"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.util.keys"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

dojo.provide("bespin.util.keys");

// = Key Helpers =
//
// Helpful code to deal with key handling and processing
// Consists of two core pieces:
//
// * {{{bespin.util.keys.Key}}} is a map of keys to key codes
// * {{{bespin.util.keys.fillArguments}}} converts a string "CTRL A" to its key and modifier
//
// TODO: Having the keys in the same scope as the method is really bad :)

// ** {{{ bespin.util.keys.Key }}} **
//
// Alpha keys, and special keys (ENTER, BACKSPACE) have key codes that our code needs to check.
// This gives you a way to say Key.ENTER when matching a key code instead of "13"

(function() {
    bespin.util.keys.Key = {

    // -- Numbers
      ZERO: 48,
      ONE: 49,
      TWO: 50,
      THREE: 51,
      FOUR: 52,
      FIVE: 53,
      SIX: 54,
      SEVEN: 55,
      EIGHT: 56,
      NINE: 57,

    // -- Alphabet
      A: 65,
      B: 66,
      C: 67,
      D: 68,
      E: 69,
      F: 70,
      G: 71,
      H: 72,
      I: 73,
      J: 74,
      K: 75,
      L: 76,
      M: 77,
      N: 78,
      O: 79,
      P: 80,
      Q: 81,
      R: 82,
      S: 83,
      T: 84,
      U: 85,
      V: 86,
      W: 87,
      X: 88,
      Y: 89,
      Z: 90,

      // Special keys that dojo.keys doesn't have
      FORWARD_SLASH: 191,
      TILDE: 192,
      BACK_SLASH: 220
    };

    dojo.mixin(bespin.util.keys.Key, dojo.keys); // use dojo.keys

    // -- Reverse the map for lookups
    var keys = bespin.util.keys.Key;
    bespin.util.keys.KeyCodeToName = {};

    for (var key in keys) {
        var keyCode = keys[key];

        if (typeof keyCode == "number") {
            bespin.util.keys.KeyCodeToName[keyCode] = key;
        }
    }
})();


// ** {{{ bespin.util.keys.fillArguments }}} **
//
// Fill out the arguments for action, key, modifiers
//
// {{{string}}} can be something like "CTRL S"
// {{{args}}} is the args that you want to modify. This is common as you may already have args.action.

bespin.util.keys.fillArguments = function(string, args) {
    var keys = string.split(' ');
    args = args || {};

    var modifiers = [];
    dojo.forEach(keys, function(key) {
       if (key.length > 1) { // more than just an alpha/numeric
           modifiers.push(key);
       } else {
           args.key = key;
       }
    });

    if (modifiers.length == 0) { // none if that is true
        args.modifiers = "none";
    } else {
        args.modifiers = modifiers.join(',');
    }

    return args;
};

// ** {{{ bespin.util.keys.PassThroughCharCodes }}} **
//
// Cache the character codes that we want to pass through to the browser
// Should map to list below
bespin.util.keys.PassThroughCharCodes = dojo.map(["k", "l", "n", "o", "t", "w", "+", "-", "~",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"], function(item){ return item.charCodeAt(0); });

// ** {{{ bespin.util.keys.PassThroughKeyCodes }}} **
//
// Cache the key codes that we want to pass through to the browser
// Should map to list above
bespin.util.keys.PassThroughKeyCodes = (function() {
    var Key = bespin.util.keys.Key;
    return [Key.C, Key.X, Key.V, Key.K, Key.L, Key.N, Key.O, Key.T, Key.W, Key.NUMPAD_PLUS, Key.NUMPAD_MINUS, Key.TILDE,
            Key.ZERO, Key.ONE, Key.TWO, Key.THREE, Key.FOUR, Key.FIVE, Key.SIX, Key.SEVEN, Key.EIGHT, Key.NINE];
})();

// ** {{{ bespin.util.keys.passThroughToBrowser }}} **
//
// Given the event, return true if you want to allow the event to pass through to the browser.
// For example, allow Apple-L to go to location, Apple-K for search. Apple-# for a tab.
//
// {{{e}}} Event that came into an {{{onkeydown}}} handler

bespin.util.keys.passThroughToBrowser = function(e) {
    var Key = bespin.util.keys.Key;

    if (!e.ctrlKey) { // let normal characters through
        return true;
    } else if (e.metaKey || e.altKey || e.ctrlKey) { // Apple or Alt key
        if (e.type == "keypress") {
            if (dojo.some(bespin.util.keys.PassThroughCharCodes, function(item) { return (item == e.charCode); })) return true;
        } else {
            if (dojo.some(bespin.util.keys.PassThroughKeyCodes, function(item) { return (item == e.keyCode); })) return true;
        }
    }

    return false;
};

}

if(!dojo._hasResource["bespin.client.settings"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.client.settings"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

dojo.provide("bespin.client.settings");

// = Settings =
//
// This settings module provides a base implementation to store settings for users.
// It also contains various "stores" to save that data, including:
//
// * {{{bespin.client.settings.Core}}} : Core interface to settings. User code always goes through here.
// * {{{bespin.client.settings.Server}}} : The main store. Saves back to the Bespin Server API
// * {{{bespin.client.settings.InMemory}}} : In memory settings that are used primarily for debugging
// * {{{bespin.client.settings.Cookie}}} : Store in a cookie using cookie-jar
// * {{{bespin.client.settings.URL}}} : Intercept settings in the URL. Often used to override
// * {{{bespin.client.settings.DB}}} : Commented out for now, but a way to store settings locally
// * {{{bespin.client.settings.Events}}} : Custom events that the settings store can intercept and send

// ** {{{ bespin.client.settings.Core }}} **
//
// Handles load/save of user settings.
// TODO: tie into the sessions servlet; eliminate Gears dependency

dojo.declare("bespin.client.settings.Core", null, {
    constructor: function(store) {
        this.browserOverrides = {};
        this.fromURL = new bespin.client.settings.URL();
        this.customEvents = new bespin.client.settings.Events(this);

        this.loadStore(store); // Load up the correct settings store
    },

    loadSession: function() {
        var editSession = bespin.get('editSession');
        var path    = this.fromURL.get('path') || editSession.path;
        var project = this.fromURL.get('project') || editSession.project;

        bespin.publish("settings:init", { // -- time to init my friends
            path: path,
            project: project
        });
    },

    defaultSettings: function() {
        return {
            'tabsize': '2',
            'tabmode': 'off',
            'tabarrow': 'on',
            'fontsize': '10',
            'consolefontsize': '10',
            'autocomplete': 'off',
            'collaborate': 'off',
            'language': 'auto',
            'strictlines': 'on',
            'syntaxcheck': 'off',
            'syntaxengine': 'simple',
            'preview': 'window',
            'smartmove': 'on',
            'jslint': {}
        };
    },

    isOn: function(value) {
        return value == 'on' || value == 'true';
    },

    isOff: function(value) {
        return value == 'off' || value == 'false' || value === undefined;
    },

    isSettingOn: function(key) {
        return this.isOn(this.get(key));
    },

    isSettingOff: function(key) {
        return this.isOff(this.get(key));
    },

    // ** {{{ Settings.loadStore() }}} **
    //
    // This is where we choose which store to load
    loadStore: function(store) {
        this.store = new (store || bespin.client.settings.ServerFile)(this);
    },

    toList: function() {
        var settings = [];
        var storeSettings = this.store.settings;
        for (var prop in storeSettings) {
            if (storeSettings.hasOwnProperty(prop)) {
                settings.push({ 'key': prop, 'value': storeSettings[prop] });
            }
        }
        return settings;
    },

    set: function(key, value) {
        this.store.set(key, value);

        bespin.publish("settings:set:" + key, { value: value });
    },

    setObject: function(key, value) {
        this.set(key, dojo.toJson(value));
    },

    get: function(key) {
        var fromURL = this.fromURL.get(key); // short circuit
        if (fromURL) return fromURL;

        return this.store.get(key);
    },

    getObject: function(key) {
        try {
            return dojo.fromJson(this.get(key));
        } catch(e) {
            console.log("Error in getObject: " + e)
            return {}
        }
    },

    unset: function(key) {
        this.store.unset(key);
    },

    list: function() {
        if (typeof this.store['list'] == "function") {
            return this.store.list();
        } else {
            return this.toList();
        }
    }

});

// ** {{{ bespin.client.settings.InMemory }}} **
//
// Debugging in memory settings (die when browser is closed)

dojo.declare("bespin.client.settings.InMemory", null, {
    constructor: function(parent) {
        this.parent = parent;
        this.settings = this.parent.defaultSettings();
        bespin.publish("settings:loaded");
    },

    set: function(key, value) {
        this.settings[key] = value;
    },

    get: function(key) {
        return this.settings[key];
    },

    unset: function(key) {
        delete this.settings[key];
    }
});

// ** {{{ bespin.client.settings.Cookie }}} **
//
// Save the settings in a cookie

dojo.declare("bespin.client.settings.Cookie", null, {
    constructor: function(parent) {
        var expirationInHours = 1;
        this.cookieSettings = {
            expires: expirationInHours / 24,
            path: '/'
        };

        var settings = dojo.fromJson(dojo.cookie("settings"));

        if (settings) {
            this.settings = settings;
        } else {
            this.settings = {
                'tabsize': '2',
                'fontsize': '10',
                'autocomplete': 'off',
                'collaborate': 'off'
            };
            dojo.cookie("settings", dojo.toJson(this.settings), this.cookieSettings);
        }
        bespin.publish("settings:loaded");
    },

    set: function(key, value) {
        this.settings[key] = value;
        dojo.cookie("settings", dojo.toJson(this.settings), this.cookieSettings);
    },

    get: function(key) {
        return this.settings[key];
    },

    unset: function(key) {
        delete this.settings[key];
        dojo.cookie("settings", dojo.toJson(this.settings), this.cookieSettings);
    }
});

// ** {{{ bespin.client.settings.ServerAPI }}} **
//
// The real grand-daddy that implements uses {{{Server}}} to access the backend

dojo.declare("bespin.client.settings.ServerAPI", null, {
    constructor: function(parent) {
        this.parent = parent;
        this.server = bespin.get('server');
        this.settings = this.parent.defaultSettings(); // seed defaults just for now!

        // TODO: seed the settings
        this.server.listSettings(dojo.hitch(this, function(settings) {
            this.settings = settings;
            if (settings['tabsize'] === undefined) {
                this.settings = this.parent.defaultSettings();
                this.server.setSettings(this.settings);
            }
            bespin.publish("settings:loaded");
        }));
    },

    set: function(key, value) {
        this.settings[key] = value;
        this.server.setSetting(key, value);
    },

    get: function(key) {
        return this.settings[key];
    },

    unset: function(key) {
        delete this.settings[key];
        this.server.unsetSetting(key);
    }
});


// ** {{{ bespin.client.settings.ServerFile }}} **
//
// Store the settings in the file system

dojo.declare("bespin.client.settings.ServerFile", null, {
    constructor: function(parent) {
        this.parent = parent;
        this.server = bespin.get('server');
        this.settings = this.parent.defaultSettings(); // seed defaults just for now!
        this.loaded = false;

        // Load up settings from the file system
        this._load();
    },

    set: function(key, value) {
        this.settings[key] = value;

        if (key[0] != '_') this._save(); // Save back to the file system unless this is a hidden setting
    },

    get: function(key) {
        return this.settings[key];
    },

    unset: function(key) {
        delete this.settings[key];

        this._save(); // Save back to the file system
    },

    _save: function() {
        if (!this.loaded) return; // short circuit to make sure that we don't save the defaults over your settings

        var settings = "";
        for (var key in this.settings) {
            if (this.settings.hasOwnProperty(key)) {
                settings += key + " " + this.settings[key] + "\n";
            }
        }

        bespin.get('files').saveFile(bespin.userSettingsProject, {
            name: "settings",
            content: settings,
            timestamp: new Date().getTime()
        });
    },

    _load: function() {
        var self = this;

        var checkLoaded = function() {
            if (!self.loaded) { // first time load
                self.loaded = true;
                bespin.publish("settings:loaded");
            }
        };

        var loadSettings = function() {
            bespin.get('files').loadContents(bespin.userSettingsProject, "settings", function(file) {
                dojo.forEach(file.content.split(/\n/), function(setting) {
                    if (setting.match(/^\s*#/)) return; // if comments are added ignore
                    if (setting.match(/\S+\s+\S+/)) {
                        var pieces = setting.split(/\s+/);
                        self.settings[dojo.trim(pieces[0])] = dojo.trim(pieces[1]);
                    }
                });

                checkLoaded();
            }, checkLoaded); // unable to load the file, so kick this off and a save should kick in
        };

        // setTimeout(loadSettings, 0);

        if (bespin.authenticated) {
            loadSettings();
        } else {
            bespin.subscribe("authenticated", function() {
                loadSettings();
            });
        }
    }
});


// ** {{{ bespin.client.settings.DB }}} **
//
// Taken out for now to allow us to not require gears_db.js (and Gears itself).
// Experimental ability to save locally in the SQLite database.
// The plan is to migrate to ActiveRecord.js or something like it to abstract on top
// of various stores (HTML5, Gears, globalStorage, etc.)

/*
// turn off for now so we can take gears_db.js out

Bespin.Settings.DB = Class.create({
    initialize: function(parent) {
        this.parent = parent;
        this.db = new GearsDB('wideboy');

        //this.db.run('drop table settings');
        this.db.run('create table if not exists settings (' +
               'id integer primary key,' +
               'key varchar(255) unique not null,' +
               'value varchar(255) not null,' +
               'timestamp int not null)');

        this.db.run('CREATE INDEX IF NOT EXISTS settings_id_index ON settings (id)');
        bespin.publish("settings:loaded");
    },

    set: function(key, value) {
        this.db.forceRow('settings', { 'key': key, 'value': value, timestamp: new Date().getTime() }, 'key');
    },

    get: function(key) {
        var rs = this.db.run('select distinct value from settings where key = ?', [ key ]);
        try {
            if (rs && rs.isValidRow()) {
              return rs.field(0);
            }
        } catch (e) {
            console.log(e.message);
        } finally {
            rs.close();
        }
    },

    unset: function(key) {
        this.db.run('delete from settings where key = ?', [ key ]);
    },

    list: function() {
        // TODO: Need to override with browser settings
        return this.db.selectRows('settings', '1=1');
    },

    // -- Private-y
    seed: function() {
        this.db.run('delete from settings');

        // TODO: loop through the settings
        this.db.run('insert into settings (key, value, timestamp) values (?, ?, ?)', ['keybindings', 'emacs', 1183878000000]);
        this.db.run('insert into settings (key, value, timestamp) values (?, ?, ?)', ['tabsize', '2', 1183878000000]);
        this.db.run('insert into settings (key, value, timestamp) values (?, ?, ?)', ['fontsize', '10', 1183878000000]);
        this.db.run('insert into settings (key, value, timestamp) values (?, ?, ?)', ['autocomplete', 'off', 1183878000000]);
    }
});
*/

// ** {{{ bespin.client.settings.URL }}} **
//
// Grab the setting from the URL, either via # or ?

dojo.declare("bespin.client.settings.URL", null, {
    constructor: function(queryString) {
        this.results = dojo.queryToObject(this.stripHash(queryString || window.location.hash));
    },

    get: function(key) {
        return this.results[key];
    },

    set: function(key, value) {
        this.results[key] = value;
    },

    stripHash: function(url) {
        var tobe = url.split('');
        tobe.shift();
        return tobe.join('');
    }
});

// ** {{{ bespin.client.settings.Events }}} **
//
// Custom Event holder for the Settings work.
// It deals with both settings themselves, and other events that
// settings need to watch and look for

dojo.declare("bespin.client.settings.Events", null, {
    constructor: function(settings) {
        var editSession = bespin.get('editSession');
        var editor = bespin.get('editor');

        // ** {{{ Event: settings:set }}} **
        //
        // Watch for someone wanting to do a set operation
        bespin.subscribe("settings:set", function(event) {
            var key = event.key;
            var value = event.value;

            settings.set(key, value);
        });

        // ** {{{ Event: editor:openfile:opensuccess }}} **
        //
        // Change the session settings when a new file is opened
        bespin.subscribe("editor:openfile:opensuccess", function(event) {
            editSession.path = event.file.name;

            if (editSession.syncHelper) editSession.syncHelper.syncWithServer();
        });

        // ** {{{ Event: editor:openfile:opensuccess }}} **
        //
        // Change the syntax highlighter when a new file is opened
        bespin.subscribe("editor:openfile:opensuccess", function(event) {
            var split = event.file.name.split('.');
            var type = split[split.length - 1];

            if (type) {
                bespin.publish("settings:language", { language: type });
            }
        });

        // ** {{{ Event: settings:set:language }}} **
        //
        // When the syntax setting is changed, tell the syntax system to change
        bespin.subscribe("settings:set:language", function(event) {
            bespin.publish("settings:language", { language: event.value, fromCommand: true });
        });

        // ** {{{ Event: settings:language }}} **
        //
        // Given a new language command, change the editor.language
        bespin.subscribe("settings:language", function(event) {
            var language = event.language;
            var fromCommand = event.fromCommand;
            var languageSetting = settings.get('language') || "auto";

            if (language == editor.language) return; // already set to be that language

            if (bespin.util.include(['auto', 'on'], language)) {
                var split = window.location.hash.split('.');
                var type = split[split.length - 1];
                if (type) editor.language = type;
            } else if (bespin.util.include(['auto', 'on'], languageSetting) || fromCommand) {
                editor.language = language;
            } else if (languageSetting == 'off') {
                editor.language = 'off';
            }
        });

        // ** {{{ Event: settings:set:collaborate }}} **
        //
        // Turn on the collaboration system if set to be on
        bespin.subscribe("settings:set:collaborate", function(event) {
            editSession.collaborate = settings.isOn(event.value);
        });

        // ** {{{ Event: settings:set:fontsize }}} **
        //
        // Change the font size for the editor
        bespin.subscribe("settings:set:fontsize", function(event) {
            var fontsize = parseInt(event.value);
            editor.theme.editorTextFont = editor.theme.editorTextFont.replace(/[0-9]{1,}pt/, fontsize+'pt');
            editor.theme.lineNumberFont = editor.theme.lineNumberFont.replace(/[0-9]{1,}pt/, fontsize+'pt');
        });

        // ** {{{ Event: settings:set:theme }}} **
        //
        // Change the Theme object used by the editor
        bespin.subscribe("settings:set:theme", function(event) {
            var theme = event.value;

            var checkSetAndExit = function() {
                var themeSettings = bespin.themes[theme];
                if (themeSettings) {
                    if (themeSettings != editor.theme) {
                        editor.theme = themeSettings;
                        bespin.publish("settings:set:fontsize", {value: settings.get('fontsize')});
                    }
                    return true;
                }
                return false;
            }

            if (theme) {
                // Try to load the theme from the themes hash
                if (checkSetAndExit()) return true;

                // Not in the default themes, load from bespin.themes.ThemeName file
                try {
                    var dr = dojo.require;
                    // the build system doesn't like dynamic names.
                    dr("bespin.themes." + theme);
                    if (checkSetAndExit()) return true;
                } catch (e) {
                    //console.log(e);
                }

                // Not in bespin.themes, load from users directory
                bespin.get('files').loadContents(bespin.userSettingsProject, "/themes/" + theme + ".js", dojo.hitch(this, function(file) {
                    try {
                        eval(file.content);
                    } catch (e) {
                        //console.log(e)
                    }

                    if (!checkSetAndExit()) {
                        bespin.publish("message:error", {
                            msg: "Sorry old chap. No theme called '" + theme + "'. Fancy making it?"
                        });
                    }
                }), function() {
                    bespin.publish("message:error", {
                        msg: "Sorry old chap. No theme called '" + theme + "'. Fancy making it?"
                    });
                });
            }
        });

        // ** {{{ Event: settings:set:keybindings }}} **
        //
        // Add in emacs key bindings
        bespin.subscribe("settings:set:keybindings", function(event) {
            var value = event.value;

            if (value == "emacs") {
                bespin.publish("editor:bindkey", {
                    modifiers: "ctrl",
                    key: "b",
                    action: "moveCursorLeft"
                });

                bespin.publish("editor:bindkey", {
                    modifiers: "ctrl",
                    key: "f",
                    action: "moveCursorRight"
                });

                bespin.publish("editor:bindkey", {
                    modifiers: "ctrl",
                    key: "p",
                    action: "moveCursorUp"
                });

                bespin.publish("editor:bindkey", {
                    modifiers: "ctrl",
                    key: "n",
                    action: "moveCursorDown"
                });

                bespin.publish("editor:bindkey", {
                    modifiers: "ctrl",
                    key: "a",
                    action: "moveToLineStart"
                });

                bespin.publish("editor:bindkey", {
                    modifiers: "ctrl",
                    key: "e",
                    action: "moveToLineEnd"
                });
            }
        });

        bespin.subscribe("settings:set:debugmode", function(event) {
            editor.debugMode = settings.isOn(event.value);

            if (editor.debugMode && bespin.debug) {
                bespin.debug.loadBreakpoints(function() {
                    editor.paint(true);
                });
            }

            editor.paint(true);
        });

        // ** {{{ Event: settings:set:cursorblink }}} **
        //
        // The frequency of the cursor blink in milliseconds (defaults to 250)
        bespin.subscribe("settings:set:cursorblink", function(event) {
            var ms = parseInt(event.value); // get the number of milliseconds

            if (ms) {
                editor.ui.toggleCursorFrequency = ms;
            }
        });

        // ** {{{ Event: settings:set:trimonsave }}} **
        //
        // Run the trim command before saving the file
        var _trimOnSave; // store the subscribe handler away

        bespin.subscribe("settings:set:trimonsave", function(event) {
            if (settings.isOn(event.value)) {
                _trimOnSave = bespin.subscribe("editor:savefile:before", function(event) {
                    bespin.publish("command:execute", { name: "trim" });
                });
            } else {
                bespin.unsubscribe(_trimOnSave);
            }
        });

        // ** {{{ Event: settings:set:syntaxcheck }}} **
        //
        // Turn the syntax parser on or off
        bespin.subscribe("settings:set:syntaxcheck", function (data) {
            if (settings.isOff(data.value)) {
                bespin.publish("parser:stop");
            } else {
                bespin.publish("parser:start");
            }
        });

        // ** {{{ Event: settings:init }}} **
        //
        // If we are opening up a new file
        bespin.subscribe("settings:init", function(event) {
            var path    = event.path;
            var project = event.project;

            if (project && (editSession.project != project)) {
                bespin.publish("project:set", { project: project });
            }

            // Now we know what are settings are we can decide if we need to
            // open the new user wizard
            if (!settings.isSettingOn("hidewelcomescreen")) {
                bespin.publish("wizard:show", { type: "newuser", warnOnFail: false, showonce: true });
            }

            // if this is a new file, deal with it and setup the state
            var newfile = settings.fromURL.get('new');
            if (newfile) { // scratch file
                bespin.publish("editor:newfile", {
                   project: project,
                   newfilename: path,
                   content: settings.fromURL.get('content') || " "
                });
            }
            else {
                // existing file, so open it
                if (path) {
                    bespin.publish("editor:openfile", { filename: path });
                }
                else {
                    var lastUsed = settings.getObject("_lastused");
                    if (!lastUsed) {
                        bespin.publish("project:set", { project: "SampleProject" });
                        bespin.publish("editor:openfile", { filename: "readme.txt" });
                    }
                    else {
                        // Warning: Publishing an extra filename member to
                        // project:set and an extra project member to
                        // editor:openfile
                        bespin.publish("project:set", lastUsed[0]);
                        bespin.publish("editor:openfile", lastUsed[0]);
                    }
                }
            }
        });

        // ** {{{ Event: settings:init }}} **
        //
        // For every setting that has a bespin:settings:set:nameofsetting callback, init it
        bespin.subscribe("settings:init", function(event) {
            // Goes deep into internals which is naughty!
            // In this case, going into the Dojo saved "topics" that you subscribe/publish too
            for (var topic in dojo._topics) {
                var settingsTopicBase = "bespin:settings:set:";
                if (topic.indexOf(settingsTopicBase) == 0) {
                    var settingKey = topic.substring(settingsTopicBase.length);
                    bespin.publish("settings:set:" + settingKey, {
                        value: settings.get(settingKey)
                    });
                }
            }
        });

        // ** {{{ Event: bespin:settings:init }}} **
        //
        // Check for auto load
        bespin.subscribe("settings:init", function() {
            if (settings.isOff(settings.get('autoconfig'))) return;

            bespin.publish("editor:config:run");
        });
    }
});

}

if(!dojo._hasResource["bespin.util.navigate"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.util.navigate"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

dojo.provide("bespin.util.navigate");



// = Navigate =
//
// Simple wrapper to force navigation to a project URL without all using location.href

// ** {{{ bespin.util.navigate }}} **
//
// new up an object that will return public methods and hide private ones

(function() {

    // ** {{{ Yup, you can be private }}} **
    //
    // Generic location changer

    var go = function(url, newTab) {
        if (newTab) {
            window.open(url, "_blank");
        } else {
            location.href = url;
        }
    };


    // ** {{{ Public }}} **
    //
    // Simple methods to construct URLs within Bespin and go to them

    dojo.mixin(bespin.util.navigate, {
        dashboard: function(newTab) {
            var pathSelected = (new bespin.client.settings.URL()).get('fromDashboardPath');
            if (pathSelected) {
                go("dashboard.html#path="+pathSelected, newTab);    // this contains the pathSelected parameter!
            } else {
                go("dashboard.html", newTab);
            }
        },

        home: function(newTab) {
            go("index.html", newTab);
        },

        quickEdit: function(newTab) {
    		go("editor.html#new=true", newTab);
    	},

        editor: function(project, path, opts) {
            var url = "editor.html#";
            var args = [];

            if (project) args.push("project=" + project);
            if (path) args.push("path=" + path);
            if (!opts) opts = {};
            if (opts.newFile) args.push("new=true");
            if (opts.content) args.push("content=" + escape(opts.content));

            if (bespin.page.dashboard) {
                var selectedPath = bespin.page.dashboard.tree.getSelectedPath(true);
                if (selectedPath) args.push('fromDashboardPath=' + selectedPath);
            }

            if (args.length > 0) url += args.join("&");

            go(url, opts.newTab);
        }
    });
})();

}

if(!dojo._hasResource["bespin.util.path"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.util.path"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

dojo.provide("bespin.util.path");

// = Path =
//
// Deal with paths that are sent into Bespin

dojo.mixin(bespin.util.path, {
    // ** {{{ bespin.util.path.combine }}} **
    //
    // Take the given arguments and combine them with one path seperator
    //
    // * combine("foo", "bar") -> foo/bar
    // * combine(" foo/", "/bar  ") -> foo/bar
    combine: function() {
        var args = Array.prototype.slice.call(arguments); // clone to a true array

        var path = args.join('/');
        path = path.replace(/\/\/+/g, '/');
        path = path.replace(/^\s+|\s+$/g, '');
        return path;
    },

    // ** {{{ bespin.util.path.directory }}} **
    //
    // Given a {{{path}}} return the directory
    //
    // * directory("/path/to/directory/file.txt") -> /path/to/directory/
    // * directory("/path/to/directory/") -> /path/to/directory/
    // * directory("foo.txt") -> ""
    directory: function(path) {
        var dirs = path.split('/');
        if (dirs.length == 1) { // no directory so return blank
            return "";
        } else if ((dirs.length == 2) && dirs[dirs.length -1] == "") { // a complete directory so return it
            return path;
        } else {
            return dirs.slice(0, dirs.length - 1).join('/');
        }
    },

    // ** {{{ bespin.util.path.makeDirectory }}} **
    //
    // Given a {{{path}}} make sure that it returns as a directory 
    // (As in, ends with a '/')
    //
    // * makeDirectory("/path/to/directory") -> /path/to/directory/
    // * makeDirectory("/path/to/directory/") -> /path/to/directory/
    makeDirectory: function(path) {
        if (!/\/$/.test(path)) path += '/';
        return path;
    },

    // ** {{{ bespin.util.path.combineAsDirectory }}} **
    //
    // Take the given arguments and combine them with one path seperator and
    // then make sure that you end up with a directory
    //
    // * combine("foo", "bar") -> foo/bar/
    // * combine(" foo/", "/bar  ") -> foo/bar/
    combineAsDirectory: function() {
        return this.makeDirectory(this.combine.apply(this, arguments));
    },

    // ** {{{ bespin.util.path.escape }}} **
    //
    // This function doubles down and calls {{{combine}}} and then escapes the output
    escape: function() {
        return escape(this.combine.apply(this, arguments));
    }
});

}

if(!dojo._hasResource["bespin.util.tokenobject"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.util.tokenobject"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

// = bespin.util.TokenObject =
//
// Given a string, make a token object that holds positions and has name access
//
// Examples,
//
// * args = new bespin.util.TokenObject(userString, { params: command.takes.order.join(' ') });
//
// * var test = new bespin.util.TokenObject(document.getElementById("input").value, { 
//	     splitBy: document.getElementById("regex").value,
//	     params: document.getElementById("params").value
// });
//
// * var test = new bespin.util.TokenObject("male 'Dion Almaer'", {
//    params: 'gender name'
// })

dojo.provide("bespin.util.tokenobject");

dojo.declare("bespin.util.TokenObject", null, { 
    constructor: function(input, options) {
        this._input = input;
        this._options = options || {};
        this._splitterRegex = new RegExp(this._options.splitBy || '\\s+');
        this.pieces = this.tokenize(input.split(this._splitterRegex));

        if (this._options.params) { // -- create a hash for name based access
            this._nametoindex = {};
            var namedparams = this._options.params.split(' ');
            for (var x = 0; x < namedparams.length; x++) {
                this._nametoindex[namedparams[x]] = x;

                if (!this._options['noshortcutvalues']) { // side step if you really don't want this
                    this[namedparams[x]] = this.pieces[x];
                }
            }
        }
    },
    
    // Split up the input taking into account ' and "
    tokenize: function(incoming) {
        var tokens = [];
        
        var nextToken;
        while (nextToken = incoming.shift()) {
            if (nextToken[0] == '"' || nextToken[0] == "'") { // it's quoting time
                var eaten = [ nextToken.substring(1, nextToken.length) ];
                var eataway;
                while (eataway = incoming.shift()) {
                    if (eataway[eataway.length - 1] == '"' || eataway[eataway.length - 1] == "'") { // end quoting time
                        eaten.push(eataway.substring(0, eataway.length - 1));
                        break;
                    } else {
                        eaten.push(eataway);
                    }
                }
                tokens.push(eaten.join(' '));
            } else {
                tokens.push(nextToken);
            }
        }
        
        return tokens;
    },
    
    param: function(index) {
        return (typeof index == "number") ? this.pieces[index] : this.pieces[this._nametoindex[index]];
    },

    length: function() {
        return this.pieces.length;
    }
});

}

if(!dojo._hasResource["bespin.util.util"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.util.util"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

dojo.provide("bespin.util.util");

// === Helpful Utilities ===
//
// We gotta keep some of the Prototype spirit around :)

// = queryToObject =
//
// While dojo.queryToObject() is mainly for URL query strings,
// this version allows to specify a seperator character

bespin.util.queryToObject = function(str, seperator) {
    var ret = {};
    var qp = str.split(seperator);
    var dec = decodeURIComponent;
    dojo.forEach(qp, function(item) {
    	if (item.length){
    		var parts = item.split("=");
    		var name = dec(parts.shift());
    		var val = dec(parts.join("="));
    		if (dojo.isString(ret[name])){
    			ret[name] = [ret[name]];
    		}
    		if (dojo.isArray(ret[name])){
    			ret[name].push(val);
    		} else {
    			ret[name] = val;
    		}
    	}
    });
    return ret;
};

// = endsWith =
//
// A la Prototype endsWith(). Takes a regex exclusing the '$' end marker
bespin.util.endsWith = function(str, end) {
    return str.match(new RegExp(end + "$"));
};

// = include =
//
// A la Prototype include().
bespin.util.include = function(array, item) {
    return dojo.indexOf(array, item) > -1;
};

// = last =
//
// A la Prototype last().
bespin.util.last = function(array) {
    if (dojo.isArray(array)) return array[array.length - 1];
};

// = shrinkArray =
//
// Knock off any undefined items from the end of an array
bespin.util.shrinkArray = function(array) {
    var newArray = [];
    
    var stillAtBeginning = true;
    dojo.forEach(array.reverse(), function(item) {
        if (stillAtBeginning && item === undefined) {
            return;
        }

        stillAtBeginning = false;

        newArray.push(item);
    });

    return newArray.reverse();
};

// = makeArray =
//
// {{number}} - The size of the new array to create
// {{character}} - The item to put in the array, defaults to ' '
bespin.util.makeArray = function(number, character) {
    if (number < 1) return []; // give us a normal number please!
    if (!character) character = ' ';

    var newArray = [];
    for (var i = 0; i < number; i++) {
        newArray.push(character);
    }
    return newArray;
};

// = leadingSpaces =
//
// Given a row, find the number of leading spaces.
// E.g. an array with the string "  aposjd" would return 2
//
// {{row}} - The row to hunt through
bespin.util.leadingSpaces = function(row) {
    var numspaces = 0;
    for (var i = 0; i < row.length; i++) {
        if (row[i] == ' ' || row[i] == '' || row[i] === undefined) {
            numspaces++;
        } else {
            return numspaces;
        }
    }
    return numspaces;
};

// = leadingTabs =
//
// Given a row, find the number of leading tabs.
// E.g. an array with the string "\t\taposjd" would return 2
//
// {{row}} - The row to hunt through
bespin.util.leadingTabs = function(row)
{
    var numtabs = 0;
    for (var i = 0; i < row.length; i++) {
        if (row[i] == '\t' || row[i] == '' || row[i] === undefined) {
            numtabs++;
        } else {
            return numtabs;
        }
    }
    return numtabs;
};

// = leadingWhitespace =
//
// Given a row, extract a copy of the leading spaces or tabs.
// E.g. an array with the string "\t    \taposjd" would return an array with the
// string "\t    \t".
//
// {{row}} - The row to hunt through
bespin.util.leadingWhitespace = function(row)
{
    var leading = [];
    for (var i = 0; i < row.length; i++) {
        if (row[i] == ' ' || row[i] == '\t' || row[i] == '' || row[i] === undefined) {
            leading.push(row[i]);
        } else {
            return leading;
        }
    }
    return leading;
};


// = englishFromCamel =
//
// Given a camelCaseWord convert to "Camel Case Word"
bespin.util.englishFromCamel = function(camel) {
    dojo.trim(camel.replace(/([A-Z])/g, function(str) { return " " + str.toLowerCase() }));
}

// = isMac =
//
// I hate doing this, but we need some way to determine if the user is on a Mac
// The reason is that users have different expectations of their key combinations.
//
// Take copy as an example, Mac people expect to use CMD or APPLE + C
// Windows folks expect to use CTRL + C
bespin.util.isMac = function() {
    return navigator.appVersion.indexOf("Macintosh") >= 0;
};

// = contains =
//
// Return true if with contains(a, b) the element b exists within the element a
bespin.util.contains = document.compareDocumentPosition ? function(a, b) {
	return a.compareDocumentPosition(b) & 16;
} : function(a, b) {
	return a !== b && (a.contains ? a.contains(b) : true);
};

}

if(!dojo._hasResource["bespin.util.mousewheelevent"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.util.mousewheelevent"] = true;
/*
 * Orginal: http://adomas.org/javascript-mouse-wheel/
 * prototype extension by "Frank Monnerjahn" themonnie @gmail.com
 *
 * Tweaked to map everyting to Mozilla's event.detail result
 */

dojo.provide("bespin.util.mousewheelevent");

dojo.mixin(bespin.util.mousewheelevent, {
    wheel: function(event) {
        var delta = 0;
        if (!event) event = window.event;
        if (event.wheelDelta) {
            delta = -(event.wheelDelta/620);
            if (window.opera) delta = -delta;
        } else if (event.detail) {
            delta = event.detail;
        }  

        return Math.round(delta); // Safari Round
    },
    
    axis: function(event) {
        var returnType = "vertical";
        if (event.axis) { // Firefox 3.1 world
            if (event.axis == event.HORIZONTAL_AXIS) returnType = "horizontal";
        } else if (event.wheelDeltaY || event.wheelDeltaX) {
            if (event.wheelDeltaX == event.wheelDelta) returnType = "horizontal";
        } else if (event.shiftKey) returnType = "horizontal";
        return returnType;
    }
});

}

if(!dojo._hasResource["bespin.util.urlbar"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.util.urlbar"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

dojo.provide("bespin.util.urlbar");

// = URLBar =
//
// URLBar watches the browser URL navigation bar for changes.
// If it sees a change it tries to open the file
// The common case is using the back/forward buttons
dojo.mixin(bespin.util.urlbar, {
    last: document.location.hash,
    check: function() {
        var hash = document.location.hash;
        if (this.last != hash) {
            var urlchange = new bespin.client.settings.URL(hash);
            bespin.publish("url:changed", { was: this.last, now: urlchange });
            this.last = hash;
        }
    }
});

setInterval(function() {
    dojo.hitch(bespin.util.urlbar, "check")();
}, 200);

}

if(!dojo._hasResource["bespin.client.filesystem"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.client.filesystem"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

// = FileSystem =
//
// This abstracts the remote Web Service file system, and in the future
// local file systems too.
//
// It ties into the {{{bespin.client.Server}}} object for remote access

dojo.provide("bespin.client.filesystem");

dojo.declare("bespin.client.FileSystem", null, {
    constructor: function(server) {
        this.server = server || bespin.get('server');
    },

    // ** {{{ bespin.client.FileSystem.newFile(project, path, callback) }}}
    //
    // Create a new file in the file system using:
    //
    // * {{{project}}} is the name of the project to create the file in
    // * {{{path}}} is the full path to save the file into
    // * {{{onSuccess}}} is a callback to fire if the file is created
    newFile: function(project, path, onSuccess) {
        this.whenFileDoesNotExist(project, path, {
            execute: function() {
                bespin.get('editSession').startSession(project, path || "new.txt");

                onSuccess();
            },
            elseFailed: function() {
                bespin.publish("message:error", { msg: 'The file ' + path + ' already exists my friend.'});
            }
        });
    },

    // ** {{{ bespin.client.FileSystem.loadContents(project, path, callback) }}}
    //
    // Retrieve the contents of a file (in the given project and path) so we can
    // perform some processing on it. Called by collaborateOnFile() if
    // collaboration is turned off.
    //
    // * {{{project}}} is the name of the project that houses the file
    // * {{{path}}} is the full path to load the file into
    // * {{{onSuccess}}} is a callback to fire if the file is loaded
    loadContents: function(project, path, onSuccess, onFailure) {
        this.server.loadFile(project, path, function(content) {
            if (/\n$/.test(content)) {
                content = content.substr(0, content.length - 1);
            }

            onSuccess({
                name: path,
                content: content,
                timestamp: new Date().getTime()
            });
        }, onFailure);
    },

    // ** {{{ bespin.client.FileSystem.collaborateOnFile(project, path, callback) }}}
    //
    // Load the file in the given project so we can begin editing it.
    // This loads the file contents via collaboration, so the callback will not
    // know what the
    //
    // * {{{project}}} is the name of the project that houses the file
    // * {{{path}}} is the full path to load the file into
    // * {{{onSuccess}}} is a callback to fire if the file is loaded
    // * {{{dontStartSession}}} is a flag to turn off starting a session. Used in the config loading for example
    collaborateOnFile: function(project, path, onSuccess) {
        var collab = bespin.get('settings').isSettingOn('collaborate');

        if (collab && !bespin.mobwrite) {
            console.log("Missing bespin.mobwrite: Forcing 'collaborate' to off in filesystem.js:collaborateOnFile");
            collab = false;
        }

        if (collab) {
            bespin.get('editSession').startSession(project, path, onSuccess);
        } else {
            this.loadContents(project, path, onSuccess);
        }
    },

    // ** {{{ bespin.client.FileSystem.forceOpenFile(project, path, content) }}}
    //
    // With the given project and path, open a file if existing, else create a new one
    //
    // * {{{project}}} is the name of the project to create the file in
    // * {{{path}}} is the full path to save the file into
    // * {{{content}}} is the template initial content to put in the new file (if new)
    forceOpenFile: function(project, path, content) {
        this.whenFileDoesNotExist(project, path, {
            execute: function() {
                if (!content) content = " ";
                bespin.publish("editor:newfile", {
                    project: project,
                    newfilename: path,
                    content: content
                });
            },
            elseFailed: function() {
                bespin.publish("editor:openfile", {
                    project: project,
                    filename: path
                });
            }
        });
    },

    // ** {{{ FileSystem.projects(callback) }}}
    //
    // Return a JSON representation of the projects that the user has access too
    //
    // * {{{callback}}} is a callback that fires given the project list
    projects: function(callback) {
        this.server.projects(callback);
    },

    // ** {{{ bespin.client.FileSystem.fileNames(callback) }}}
    //
    // Return a JSON representation of the files at the root of the given project
    //
    // * {{{callback}}} is a callback that fires given the files
    fileNames: function(project, callback) {
        this.server.list(project, '', callback);
    },

    // ** {{{ bespin.client.FileSystem.saveFile(project, file) }}}
    //
    // Save a file to the given project
    //
    // * {{{project}}} is the name of the project to save into
    // * {{{file}}} is the file object that contains the path and content to save
    saveFile: function(project, file) {
        // Unix files should always have a trailing new-line; add if not present
        if (/\n$/.test(file.content)) file.content += "\n";

        this.server.saveFile(project, file.name, file.content, file.lastOp);
    },

    // ** {{{ bespin.client.FileSystem.removeFile(project, path, onSuccess, onFailure) }}}
    //
    // Create a directory
    //
    // * {{{project}}} is the name of the directory to create
    // * {{{path}}} is the full path to the directory to create
    // * {{{onSuccess}}} is the callback to fire if the make works
    // * {{{onFailure}}} is the callback to fire if the make fails
    makeDirectory: function(project, path, onSuccess, onFailure) {
        this.server.makeDirectory(project, path, onSuccess, onFailure);
    },

    // ** {{{ bespin.client.FileSystem.makeDirectory(project, path, onSuccess, onFailure) }}}
    //
    // Remove a directory
    //
    // * {{{project}}} is the name of the directory to remove
    // * {{{path}}} is the full path to the directory to delete
    // * {{{onSuccess}}} is the callback to fire if the remove works
    // * {{{onFailure}}} is the callback to fire if the remove fails
    removeDirectory: function(project, path, onSuccess, onFailure) {
        this.server.removeFile(project, path, onSuccess, onFailure);
    },

    // ** {{{ bespin.client.FileSystem.removeFile(project, path, onSuccess, onFailure) }}}
    //
    // Remove the file from the file system
    //
    // * {{{project}}} is the name of the project to delete the file from
    // * {{{path}}} is the full path to the file to delete
    // * {{{onSuccess}}} is the callback to fire if the remove works
    // * {{{onFailure}}} is the callback to fire if the remove fails
    removeFile: function(project, path, onSuccess, onFailure) {
        this.server.removeFile(project, path, onSuccess, onFailure);
    },

    // ** {{{ bespin.client.FileSystem.removeFile(project, path, onSuccess, onFailure) }}}
    //
    // Close the open session for the file
    //
    // * {{{project}}} is the name of the project to close the file from
    // * {{{path}}} is the full path to the file to close
    // * {{{callback}}} is the callback to fire when closed
    closeFile: function(project, path, callback) {
        this.server.closeFile(project, path, callback);
    },

    // ** {{{ bespin.client.FileSystem.whenFileExists(project, path, callbacks) }}}
    //
    // Check to see if the file exists and then run the appropriate callback
    //
    // * {{{project}}} is the name of the project
    // * {{{path}}} is the full path to the file
    // * {{{callbacks}}} is the pair of callbacks:
    //   execute (file exists)
    //   elseFailed (file does not exist)
    whenFileExists: function(project, path, callbacks) {
        this.server.list(project, bespin.util.path.directory(path), function(files) {
            if (files && dojo.some(files, function(file){ return (file.name == path); })) {
                callbacks['execute']();
            } else {
                if (callbacks['elseFailed']) callbacks['elseFailed']();
            }
        }, function(xhr) {
            if (callbacks['elseFailed']) callbacks['elseFailed'](xhr);
        });
    },

    // ** {{{ bespin.client.FileSystem.whenFileDoesNotExist(project, path, callbacks) }}}
    //
    // The opposite of {{{ bespin.client.FileSystem.whenFileExists() }}}
    //
    // * {{{project}}} is the name of the project
    // * {{{path}}} is the full path to the file
    // * {{{callbacks}}} is the pair of callbacks:
    //   execute (file does not exist)
    //   elseFailed (file exists)
    whenFileDoesNotExist: function(project, path, callbacks) {
        this.server.list(project, bespin.util.path.directory(path), function(files) {
            if (!files || !dojo.some(files, function(file){ return (file.name == path); })) {
                callbacks['execute']();
            } else {
                if (callbacks['elseFailed']) callbacks['elseFailed']();
            }
        }, function(xhr) {
            callbacks['execute'](); // the list failed which means it didn't exist
        });
    }
});

}

if(!dojo._hasResource["bespin.client.status"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.client.status"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

dojo.provide("bespin.client.status");

// = StatusChecker =
//
// This is currently just a mock to randomly share status messages.
// In the future the server will serve up interesting data.
// For now, it is turned off.

dojo.declare("bespin.client.settings.StatusChecker", null, {
    constructor: function() {
        this.interval = 0;
        this.statusMessages = [
            "Bob is editing the file brick.html",
            "Emily is creating a new tag called 'v3.4'",
            "Jessica is saving the file kidly.html",
            "John is idle. Lazy git!",
            "Mickey has checked in a set of 4 files to project 'Bank'",
            "Don has created the function 'doCalculation' in class 'Bank'",
            "Benji is deleting the function 'doCalculation' in class 'Bank'"
        ];
    },

    start: function() {
        this.interval = setInterval(dojo.hitch(this, "updateStatus"), 12000);
    },

    stop: function() {
        clearInterval(this.interval);
    },

    updateStatus: function() {
        var randomMessage = this.randomStatus();
        this.setStatus(randomMessage);
    },

    randomStatus: function() {
        var random = Math.floor(Math.random() * this.statusMessages.length);
        return this.statusMessages[random];
    },

    setStatus: function(message) {
        dojo.byId('message').innerHTML = message;
    }
});

}

if(!dojo._hasResource["bespin.client.server"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.client.server"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

dojo.provide("bespin.client.server");

// = Server =
//
// The Server object implements the [[https://wiki.mozilla.org/BespinServerAPI|Bespin Server API]]
// giving the client access to the backend store. The {{{FileSystem}}} object uses this to talk back.

dojo.declare("bespin.client.Server", null, {
    // ** {{{ initialize(base) }}}
    //
    // Object creation initialization
    //
    // * {{{base}}} is the base server URL to access
    constructor: function(base) {
        this.SERVER_BASE_URL = base || '.';

        // Stores the outstanding asynchronous tasks that we've submitted
        this._jobs = {};
        this._jobsCount = 0;
    },

    // == Helpers ==

    // ** {{{ request(method, url, payload, callbackOptions) }}}
    //
    // The core way to access the backend system.
    // Similar to the Prototype Ajax.Request wrapper
    //
    // * {{{method}}} is the HTTP method (GET|POST|PUT|DELETE)
    // * {{{url}}} is the sub url to hit (after the base url)
    // * {{{payload}}} is what to send up for POST requests
    // * {{{options}}} is how you pass in various callbacks.
    //   options['evalJSON'] = true or false to auto eval
    //   options['onSuccess'] = the main success callback
    //   options['onFailure'] = call for general failures
    //   options['on' + STATUS CODE] = call for specific failures
    //   options['log'] = just log the following
    request: function(method, url, payload, options) {
        var server = this;
        var xhr = new XMLHttpRequest();

        if (location.href.indexOf("file:") == 0){ // if developing and using this locally only!
           try {
               if (netscape.security.PrivilegeManager.enablePrivilege) {
                   netscape.security.PrivilegeManager.enablePrivilege('UniversalBrowserRead');
               }
           } catch (ex) {
           }
        }

        if (options) { // do it async (best)
            var onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    if (xhr.status && xhr.status != 0 && (xhr.status >= 200 && xhr.status < 300)) {
                        var response = xhr.responseText;

                        if (options['evalJSON'] && response) {
                            try {
                                response = dojo.fromJson(response);
                            } catch (syntaxException) {
                                console.log("Couldn't eval the JSON: " + response + " (SyntaxError: " + syntaxException + ")");
                            }
                        }

                        if (dojo.isFunction(options['onSuccess'])) {
                            options['onSuccess'](response, xhr);
                        } else if (options['log']) {
                            console.log(options['log']);
                        }
                    } else {
                        var onStatus = 'on' + xhr.status;
                        if (options[onStatus]) {
                            options[onStatus](xhr);
                        } else if (options['onFailure']) {
                            options['onFailure'](xhr);
                        }
                    }
                }
            };
            var cl = bespin.get("commandLine");
            if (cl) onreadystatechange = cl.link(onreadystatechange);
            xhr.onreadystatechange = onreadystatechange;
            xhr.open(method, this.SERVER_BASE_URL + url, true); // url must have leading /
            var token = dojo.cookie("Domain-Token");
            if (!token) {
                token = server._randomPassword();
                dojo.cookie("Domain-Token", token);
            }
            xhr.setRequestHeader("X-Domain-Token", token);
            xhr.setRequestHeader("Content-Type", 'application/x-www-form-urlencoded');
            if (options.headers) {
                for (var key in options.headers) {
                    if (options.headers.hasOwnProperty(key)) {
                        xhr.setRequestHeader(key, options.headers[key]);
                    }
                }
            }
            xhr.send(payload);
        } else {
            var fullUrl = this.SERVER_BASE_URL + url;
            console.log("Are you sure you want to do a synchronous Ajax call? Really? " + fullUrl);
            xhr.open(method, fullUrl, false);
            xhr.send(payload);
            return xhr.responseText;
        }
    },

    _randomPassword: function() {
        chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
        pass = "";
        for (var x = 0; x < 16; x++) {
            var charIndex = Math.floor(Math.random() * chars.length);
            pass += chars.charAt(charIndex);
        }
        return pass;
    },

    // ** {{{ requestDisconnected() }}}
    // As request() except that the response is fetched without a connection,
    // instead using the /messages URL
    requestDisconnected: function(method, url, payload, options) {
        var self = this;
        if (!options.evalJSON) {
            console.error("Disconnected calls must use JSON");
        }
        options.evalJSON = true;

        // The response that we get from the server isn't a 'done it' response
        // any more - it's just a 'working on it' response.
        options.originalOnSuccess = options.onSuccess;
        options.onSuccess = function(response, xhr) {
            if (response.jobid == null) {
                console.error("Missing jobid", response);
                options.onFailure(xhr);
                return;
            }

            if (response.taskname) {
                bespin.publish("message:output", { incomplete:true, msg: "Server is running : " + response.taskname });
            }

            self._jobs[response.jobid] = {
                jobid: response.jobid,
                options: options
            };
            self._jobsCount++;
            self._checkPolling();
        };

        this.request(method, url, payload, options);
    },

    // ** {{{ _checkPolling() }}}
    // Do we need to set off another poll?
    _checkPolling: function() {
        if (this._jobsCount == 0) return;
        if (this._timeout != null) return;

        this._poll();
    },

    _processResponse: function(message) {
        var eventName = message.eventName;
        if (eventName) {
            bespin.publish(eventName, message);
        }

        var jobid = message.jobid;
        if (jobid) {
            var job = this._jobs[jobid];
            if (!job) {
                throw new Error("Unknown jobid: " + jobid);
            }

            delete this._jobs[jobid];

            if (message.asyncDone) {
                if (dojo.isArray(job.partials)) {
                    // We're done, and we've got outstanding messages
                    // that we need to pass on. We aggregate the
                    // messages and call onSuccess
                    //
                    // TODO: I'm not sure that this is how we combine
                    // the messages
                    job.partials.push(message.message);
                    job.options.onSuccess(job.partials);
                } else {
                    // We're done, and all we have is what we've just
                    // been sent, so just call onSuccess
                    job.options.onSuccess(message.message);
                }
            }
            else {
                if (dojo.isFunction(job.options.onPartial)) {
                    // In progress, and we have somewhere to send the
                    // messages that we've just been sent
                    job.options.onPartial(message.message);
                } else {
                    // In progress, and no-where to send the messages,
                    // so we store them for onSuccess when we're done
                    job.partials.push(message.message);
                }
            }
        }

        if (message.asyncDone) {
            if (this._jobsCount > 0) {
                this._jobsCount--;
            }
        }
    },

    // ** {{{ _poll() }}}
    // Starts up message retrieve for this user. Call this only once.
    _poll: function() {
        var self = this;
        this.request('POST', '/messages/', null, {
            evalJSON: true,
            onSuccess: function(messages) {
                for (var i=0; i < messages.length; i++) {
                    self._processResponse(messages[i]);
                }

                setTimeout(function() {
                    self._checkPolling();
                }, 1000);
            },
            onFailure: function(message) {
                self._processResponse(message);

                setTimeout(function() {
                    self._checkPolling();
                }, 1000);
            }
        });
    },

    // ** {{{ fetchResource() }}}
    //
    // Generic system to read resources from a URL and return the read data to
    // a callback.
    fetchResource: function(name, onSuccess, onFailure) {
        this.request('GET', name, null, {
            onSuccess: onSuccess,
            onFailure: onFailure
        });
    },

    // == USER ==

    // ** {{{ login(user, pass, token, onSuccess, notloggedin) }}}
    //
    // Try to login to the backend system.
    //
    // * {{{user}}} is the username
    // * {{{pass}}} is the password
    // * {{{onSuccess}}} fires when the user is logged in
    // * {{{onFailure}}} fires when the user failed to login
    login: function(user, pass, onSuccess, onFailure) {
        var url = "/register/login/" + user;
        this.request('POST', url, "password=" + escape(pass), {
            onSuccess: onSuccess,
            on401: onFailure,
            log: 'Login complete.'
        });
    },

    // ** {{{ signup(user, pass, email, onSuccess, notloggedin, userconflict) }}}
    //
    // Signup / Register the user to the backend system
    //
    // * {{{user}}} is the username
    // * {{{pass}}} is the password
    // * {{{email}}} is the email
    // * {{{onSuccess}}} fires when the user is logged in
    // * {{{notloggedin}}} fires when not logged in
    // * {{{userconflict}}} fires when the username exists
    signup: function(user, pass, email, onSuccess, notloggedin, userconflict) {
        var url = "/register/new/" + user;
        var data = "password=" + escape(pass) + "&email=" + escape(email);
        this.request('POST', url, data, {
            onSuccess: onSuccess,
            on401: notloggedin,
            on409: userconflict,
            log: 'Login complete.'
        });
    },

    // ** {{{ logout(onSuccess) }}}
    //
    // Logout from the backend
    //
    // * {{{onSuccess}}} fires after the logout attempt
    logout: function(onSuccess) {
        var url = "/register/logout/";
        this.request('POST', url, null, { log: 'Logout complete.', onSuccess: onSuccess });
    },

    // ** {{{ currentuser(onSuccess, notloggedin) }}}
    //
    // Return info on the current logged in user
    //
    // * {{{onSuccess}}} fires after the user attempt
    // * {{{notloggedin}}} fires if the user isn't logged in
    currentuser: function(whenLoggedIn, whenNotloggedin) {
        var url = "/register/userinfo/";
        return this.request('GET', url, null,
                { onSuccess: whenLoggedIn, on401: whenNotloggedin, evalJSON: true });
    },

    // == FILES ==

    // ** {{{ list(project, path, onSuccess, onFailure) }}}
    //
    // List the path in the given project
    //
    // * {{{project}}} is the project to list
    // * {{{path}}} is the path to list out
    // * {{{onSuccess}}} fires if the list returns something
    // * {{{onFailure}}} fires if there is an error getting a list from the server
    list: function(project, path, onSuccess, onFailure) {
        var project = project || '';
        var url = bespin.util.path.combine('/file/list/', project, path || '/');
        var opts = { onSuccess: onSuccess, evalJSON: true, log: "Listing files in: " + url };
        if (dojo.isFunction(onFailure)) opts.onFailure = onFailure;

        this.request('GET', url, null, opts);
    },

    // ** {{{ listAllFiles(project, onSuccess, onFailure) }}}
    //
    // List *all* files in the given project. Be *aware*: this will be a huge json-result!
    //
    // * {{{project}}} is the project to list all files from
    // * {{{onSuccess}}} fires if the list returns something
    // * {{{onFailure}}} fires if there is an error getting a list from the server
    listAllFiles: function(project, onSuccess, onFailure) {
        var project = project || '';
        var url = bespin.util.path.combine('/file/list_all/', project, '/');
        var opts = { onSuccess: onSuccess, evalJSON: true, log: "Listing all files in: " + url };
        if (dojo.isFunction(onFailure)) opts.onFailure = onFailure;

        this.request('GET', url, null, opts);
    },

    // ** {{{ projects(onSuccess) }}}
    //
    // Return the list of projects that you have access too
    //
    // * {{{onSuccess}}} gets fired with the project list
    projects: function(onSuccess) {
        this.request('GET', '/file/list/', null, { onSuccess: onSuccess, evalJSON: true });
    },

    // ** {{{ saveFile(project, path, contents, lastOp) }}}
    //
    // Save the given file
    //
    // * {{{project}}} is the project to save
    // * {{{path}}} is the path to save to
    // * {{{contents}}} fires after the save returns
    // * {{{lastOp}}} contains the last edit operation
    saveFile: function(project, path, contents, lastOp) {
        if (!project || !path) return;

        var url = bespin.util.path.combine('/file/at', project, (path || ''));
        if (lastOp) url += "?lastEdit=" + lastOp;

        this.request('PUT', url, contents, { log: 'Saved file "' + project + '/' + path+ '"' });
    },

    // ** {{{ loadFile(project, path, contents) }}}
    //
    // Load the given file
    //
    // * {{{project}}} is the project to load from
    // * {{{path}}} is the path to load
    // * {{{onSuccess}}} fires after the file is loaded
    loadFile: function(project, path, onSuccess, onFailure) {
        var project = project || '';
        var path = path || '';
        var url = bespin.util.path.combine('/file/at', project, path);
        var opts = { onSuccess: onSuccess };
        if (dojo.isFunction(onFailure)) opts.onFailure = onFailure;

        this.request('GET', url, null, opts);
    },

    // ** {{{ removeFile(project, path, onSuccess, onFailure) }}}
    //
    // Remove the given file
    //
    // * {{{project}}} is the project to remove from
    // * {{{path}}} is the path to remove
    // * {{{onSuccess}}} fires if the deletion works
    // * {{{onFailure}}} fires if the deletion failed
    removeFile: function(project, path, onSuccess, onFailure) {
        var project = project || '';
        var path = path || '';
        var url = bespin.util.path.combine('/file/at', project, path);
        var opts = { onSuccess: onSuccess };
        if (dojo.isFunction(onFailure)) opts.onFailure = onFailure;

        this.request('DELETE', url, null, opts);
    },

    // ** {{{ makeDirectory(project, path, onSuccess, onFailure) }}}
    //
    // Create a new directory
    //
    // * {{{project}}} is the project to save
    // * {{{path}}} is the path to save to
    // * {{{onSuccess}}} fires if the deletion works
    // * {{{onFailure}}} fires if the deletion failed
    makeDirectory: function(project, path, onSuccess, onFailure) {
        if (!project) return;

        var url = bespin.util.path.combineAsDirectory('/file/at', project, (path || ''));
        var opts = {};
        if (dojo.isFunction(onSuccess)) {
            opts.onSuccess = onSuccess;
        } else {
            opts['log'] = "Made a directory: [project=" + project + ", path=" + path + "]";
        }
        if (dojo.isFunction(onFailure)) opts.onFailure = onFailure;

        this.request('PUT', url, null, opts);
    },

    // ** {{{ removeDirectory(project, path, onSuccess, onFailure) }}}
    //
    // Removed a directory
    //
    // * {{{project}}} is the project to save
    // * {{{path}}} is the path to save to
    // * {{{onSuccess}}} fires if the deletion works
    // * {{{onFailure}}} fires if the deletion failed
    removeDirectory: function(project, path, onSuccess, onFailure) {
        if (!project) return;
        if (!path) path = '';

        var url = bespin.util.path.combineAsDirectory('/file/at', project, path);
        var opts = {};
        if (dojo.isFunction(onSuccess)) {
            opts.onSuccess = onSuccess;
        } else {
            opts['log'] = "Removed directory: [project=" + project + ", path=" + path + "]";
        }
        if (dojo.isFunction(onFailure)) opts.onFailure = onFailure;

        this.request('DELETE', url, null, opts);
    },

     // ** {{{ listOpen(onSuccess) }}}
     //
     // Returns JSON with the key of filename, and the value of an array of usernames:
     // { "foo.txt": ["ben"], "SomeAjaxApp/foo.txt": ["dion"] }
     //
     // * {{{onSuccess}}} fires after listing the open files
    listOpen: function(onSuccess) {
        this.request('GET', '/file/listopen/', null, {
            onSuccess: onSuccess, evalJSON: true, log: 'List open files.'
        });
    },

    // ** {{{ closeFile(project, path, onSuccess) }}}
    //
    // Close the given file (remove from open sessions)
    //
    // * {{{project}}} is the project to close from
    // * {{{path}}} is the path to close
    // * {{{onSuccess}}} fires after the file is closed
    closeFile: function(project, path, onSuccess) {
        var path = path || '';
        var url = bespin.util.path.combine('/file/close', project, path);
        this.request('POST', url, null, { onSuccess: onSuccess });
    },

    // ** {{{ searchFiles(project, searchstring, onSuccess) }}}
    //
    // Search for files within the given project
    //
    // * {{{project}}} is the project to look from
    // * {{{searchstring}}} to compare files with
    // * {{{onSuccess}}} fires after the file is closed
    searchFiles: function(project, searchkey, onSuccess) {
        var url = bespin.util.path.combine('/file/search', project+'?q='+escape(searchkey));
        var opts = { onSuccess: onSuccess, evalJSON: true, log: "Listing searchfiles for: " + project + ", searchkey: " + searchkey};
        this.request('GET', url, null, opts);
    },

    // == EDIT ==

    // ** {{{ editActions(project, path, onSuccess) }}}
    //
    // Get the list of edit actions
    //
    // * {{{project}}} is the project to edit from
    // * {{{path}}} is the path to edit
    // * {{{onSuccess}}} fires after the edit is done
    editActions: function(project, path, onSuccess) {
        var path = path || '';
        var url = bespin.util.path.combine('/edit/list', project, path);
        this.request('GET', url, null, { onSuccess: onSuccess, log: "Edit Actions Complete." });
    },

    // ** {{{ editAfterActions(project, path, onSuccess) }}}
    //
    // Get the list of edit after actions
    //
    // * {{{project}}} is the project to edit from
    // * {{{path}}} is the path to edit
    // * {{{onSuccess}}} fires after the edit is done
    editAfterActions: function(project, path, index, onSuccess) {
        var path = path || '';
        var url = bespin.util.path.combine('/edit/recent', index, project, path);
        this.request('GET', url, null, { onSuccess: onSuccess, log: "Edit After Actions Complete." });
    },

    // ** {{{ doAction(project, path, actions) }}}
    //
    // Store actions to the edit queue
    //
    // * {{{project}}} is the project
    // * {{{path}}} is the path
    // * {{{actions}}} contain the actions to store
    doAction: function(project, path, actions) {
        var path = path || '';
        var url = bespin.util.path.combine('/edit', project, path);

        var sp = "[" + actions.join(",") + "]";

        this.request('PUT', url, sp, { onSuccess: function(){} });
    },

    // == PROJECTS ==
    //
    // still needed: owners, authorize, deauthorize

    // ** {{{ exportProject(project, archivetype) }}}
    //
    // Export the project as either a zip file or tar + gz
    //
    // * {{{project}}} is the project to export
    // * {{{archivetype}}} is either zip | tgz
    exportProject: function(project, archivetype) {
        if (bespin.util.include(['zip','tgz','tar.gz'], archivetype)) {
            var iframe = document.createElement("iframe");
            iframe.src = bespin.util.path.combine('/project/export', project + "." + archivetype);
            iframe.style.display = 'none';
            iframe.style.height = iframe.style.width = "0";
            document.getElementsByTagName("body")[0].appendChild(iframe);
        }
    },

    // ** {{{ importProject(project, url, opts) }}}
    //
    // Import the given file into the given project
    //
    // * {{{project}}} is the project to export
    // * {{{url}}} is the URL to the file to import
    // * {{{archivetype}}} is either zip | tgz
    importProject: function(project, url, opts) {
        if (opts) { // wrap the import success call in an event to say that the import is complete
            var userCall = opts.onSuccess;
            opts.onSuccess = function(text, xhr) {
                userCall(text, xhr);
                bespin.publish("project:imported", {
                    project: project,
                    url: url
                });
            };
        }

        this.request('POST', '/project/fromurl/' + project, url, opts || {});
    },

    // ** {{{ renameProject(currentProject, newProject) }}}
    //
    // Import the given file into the given project
    //
    // * {{{currentProject}}} is the current name of the project
    // * {{{newProject}}} is the new name
    renameProject: function(currentProject, newProject, opts) {
        if (!opts) opts = { log: "Renaming project from " + currentProject + " to " + newProject };
        if (currentProject && newProject) {
            this.request('POST', '/project/rename/' + currentProject + "/", newProject, opts);
        }
    },

    // == SETTINGS ==
    //
    //
    // * GET /settings/ to list all settings for currently logged in user as json dict
    // * GET /settings/[setting] to get the value for a single setting as json string
    // * POST /settings/ with HTTP POST DATA (in standard form post syntax) to set the value for a collection of settings (all values are strings)
    // * DELETE /settings/[setting] to delete a single setting

    listSettings: function(onSuccess) {
        if (typeof onSuccess == "function") {
            this.request('GET', '/settings/', null, { onSuccess: onSuccess, evalJSON: true });
        }
    },

    getSetting: function(name, onSuccess) {
        if (typeof onSuccess == "function") {
            this.request('GET', '/settings/' + name, null, { onSuccess: onSuccess });
        }
    },

    setSetting: function(name, value, onSuccess) {
        var settings = {};
        settings[name] = value;
        this.setSettings(settings, (onSuccess || function(){}));
    },

    setSettings: function(settings, onSuccess) {
        this.request('POST', '/settings/', dojo.objectToQuery(settings), { onSuccess: (onSuccess || function(){}) });
    },

    unsetSetting: function(name, onSuccess) {
        this.request('DELETE', '/settings/' + name, null, { onSuccess: (onSuccess || function(){}) });
    },

    // ** {{{ fileTemplate() }}}
    // Starts up message retrieve for this user. Call this only once.
    fileTemplate: function(project, path, templateOptions, opts) {
        var url = bespin.util.path.combine('/file/template', project, path);
        this.request('PUT', url,
                    dojo.toJson(templateOptions), opts || {});
    },

    // ** {{{ projectTemplate() }}}
    // Create a new project based on a template. templateOptions
    // must include templateName to specify which template to use.
    // templateOptions can include other values that will be plugged
    // in to the template.
    projectTemplate: function(project, templateOptions, opts) {
        var url = bespin.util.path.combine('/project/template/', project, "");
        this.request('POST', url,
                    dojo.toJson(templateOptions), opts || {});
    }
});

}

if(!dojo._hasResource["bespin.client.session"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.client.session"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

// = Session =
//
// This session module provides functionality that both stores session information
// and handle collaboration.
//
// This module includes:
//
// * {{{ bespin.client.session.EditSession }}}: Wraps a file edit session
// * {{{ bespin.client.session.SyncHelper }}}: Deals with syncing edits back to the server

dojo.provide("bespin.client.session");

// ** {{{ bespin.client.session.EditSession }}} **
//
// EditSession represents a file edit session with the Bespin back-end server. It is responsible for
// sending changes to the server as well as receiving changes from the server and mutating the document
// model with received changes.

dojo.declare("bespin.client.session.EditSession", null, {
    constructor: function(editor) {
        this.editor = editor;
    },

    setUserinfo: function(userinfo) {
        this.username = userinfo.username;
        this.amountUsed = userinfo.amountUsed;
        this.quota = userinfo.quota;
    },

    checkSameFile: function(project, path) {
        return ((this.project == project) && (this.path == path));
    },

    startSession: function(project, path, onSuccess) {
        this.project = project;
        this.path = path;

        if (typeof mobwrite !== "undefined") mobwrite.share(this); // was causing an error!

        if (dojo.isFunction(onSuccess)) onSuccess({
            name: path,
            timestamp: new Date().getTime()
        });
    },

    reportCollaborators: function(usernames) {
        var contents = "";
        dojo.forEach(usernames, function(username) {
            contents += "<div class='collab_person'>";
            contents += "  <div class='collab_icon'></div>";
            contents += "  <div class='collab_name'>" + username + "</div>";
            contents += "  <div class='collab_description'>Editing</div>";
            contents += "</div>";
        });
        dojo.byId("collab_list").innerHTML = contents;
    },

    stopSession: function() {
        this.project = undefined;
        this.path = undefined;
    }
});

}

if(!dojo._hasResource["bespin.editor.actions"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.editor.actions"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

dojo.provide("bespin.editor.actions");

// = Actions =
//
// The editor can run various actions. They are defined here and you can add or change them dynamically. Cool huh?
//
// An action mutates the model or editor state in some way. The only way the editor state or model should be manipulated is via
// the execution of actions.
//
// Actions integrate with the undo manager by including instructions for how to undo (and redo) the action. These instructions
// take the form of a hash containing the necessary state for undo/redo. A key "action" corresponds to the function name of the
// action that should be executed to undo or redo the operation and the remaining keys correspond to state necessary to perform
// the action. See below for various examples.

dojo.declare("bespin.editor.Actions", null, {
    constructor: function(editor) {
        this.editor = editor;
        this.model = this.editor.model;
        this.cursorManager = this.editor.cursorManager;
        this.ignoreRepaints = false;
    },

    // this is a generic helper method used by various cursor-moving methods
    handleCursorSelection: function(args) {
        if (args.event.shiftKey) {
            if (!this.editor.selection) this.editor.setSelection({ startPos: bespin.editor.utils.copyPos(args.pos) });
            this.editor.setSelection({ startPos: this.editor.selection.startPos, endPos: bespin.editor.utils.copyPos(this.cursorManager.getCursorPosition()) });
        } else {
            this.editor.setSelection(undefined);
        }
    },

    moveCursor: function(moveType, args) {
        var posData = this.cursorManager[moveType](args);
        this.handleCursorSelection(args);
        this.repaint();
        args.pos = posData.newPos;
        return args;
    },

    moveCursorLeft: function(args) {
        return this.moveCursor("moveLeft", args);
    },

    moveCursorRight: function(args) {
        return this.moveCursor("moveRight", args);
    },

    moveCursorUp: function(args) {
        return this.moveCursor("moveUp", args);
    },

    moveCursorDown: function(args) {
        return this.moveCursor("moveDown", args);
    },

    moveToLineStart: function(args) {
        return this.moveCursor("moveToLineStart", args);
    },

    moveToLineEnd: function(args) {
        return this.moveCursor("moveToLineEnd", args);
    },

    moveToFileTop: function(args) {
        return this.moveCursor("moveToTop", args);
    },

    moveToFileBottom: function(args) {
        return this.moveCursor("moveToBottom", args);
    },

    movePageUp: function(args) {
        return this.moveCursor("movePageUp", args);
    },

    movePageDown: function(args) {
        return this.moveCursor("movePageDown", args);
    },

    moveWordLeft: function(args) {
        return this.moveCursor("smartMoveLeft", args);
    },

    moveWordRight: function(args) {
        return this.moveCursor("smartMoveRight", args);
    },

    deleteWordLeft: function(args) {
        this.deleteChunk({
            endPos: args.pos,
            pos: this.moveCursor("smartMoveLeft", args).pos
        });
        return args;
    },

    deleteWordRight: function(args) {
        this.deleteChunk({
            pos: args.pos,
            endPos: this.moveCursor("smartMoveRight", args).pos
        });
        return args;
    },

    undo: function() {
        this.editor.undoManager.undo();
    },

    redo: function() {
        this.editor.undoManager.redo();
    },

    selectAll: function(args) {
        // do nothing with an empty doc
        if (this.model.isEmpty()) return;

        args.startPos = { row: 0, col: 0 };
        args.endPos = { row: this.model.getRowCount() - 1, col: this.editor.ui.getRowScreenLength(this.model.getRowCount() - 1) };

        this.select(args);
    },

    select: function(args) {
        if (args.startPos) {
            this.editor.setSelection({ startPos: args.startPos, endPos: args.endPos });
            this.cursorManager.moveCursor(args.endPos);
        } else {
            this.editor.setSelection(undefined);
        }
    },

    insertTab: function(args) {
        if (this.editor.readonly) return;

        var settings = bespin.get("settings");

        if (this.editor.getSelection() && !args.undoInsertTab) {
            this.indent(args);
            return;
        }

        var tab = args.tab;
        var tablength = this.cursorManager.getCharacterLength("\t");

        if (!tab || !tablength) {
            if (settings && settings.isSettingOn('tabmode')) {
                // do something tabby
                tab = "\t";
            } else {
                tab = "";
                var tabSizeCount = tablength;
                while (tabSizeCount-- > 0) {
                    tab += " ";
                }
                tablength = tab.length;
            }
        }

        delete this.editor.selection;
        this.model.insertCharacters(this.cursorManager.getModelPosition({ row: args.pos.row, col: args.pos.col }), tab);
        this.cursorManager.moveCursor({ row: args.pos.row, col: args.pos.col + tablength });
        this.repaint();

        // undo/redo
        args.action = "insertTab";
        var redoOperation = args;
        var undoArgs = {
            action: "removeTab",
            queued: args.queued,
            pos: bespin.editor.utils.copyPos(args.pos),
            tab: tab
        };
        var undoOperation = undoArgs;
        this.editor.undoManager.addUndoOperation(new bespin.editor.UndoItem(undoOperation, redoOperation));
    },

    // this function can only be called by editor.undoManager for undo insertTab in the case of beeing nothing selected
    removeTab: function(args) {
        delete this.editor.selection;
        this.model.deleteCharacters(this.cursorManager.getModelPosition({ row: args.pos.row, col: args.pos.col }), args.tab.length);
        this.cursorManager.moveCursor({ row: args.pos.row, col: args.pos.col });
        this.repaint();

        // undo/redo
        args.action = "removeTab";
        var redoOperation = args;
        var undoArgs = {
            action: "insertTab",
            undoInsertTab: true,
            queued: args.queued,
            pos: bespin.editor.utils.copyPos(args.pos),
            tab: args.tab
        };
        var undoOperation = undoArgs;
        this.editor.undoManager.addUndoOperation(new bespin.editor.UndoItem(undoOperation, redoOperation));
    },

    indent: function(args) {
        var historyIndent = args.historyIndent || false;
        var useHistoryIndent = !!historyIndent;
        if (!historyIndent) historyIndent = new Array();
        var settings = bespin.get('settings');
        var selection = args.selection || this.editor.getSelection();
        var fakeSelection = args.fakeSelection || false;
        var startRow = selection.startPos.row;
        var endRow = selection.endPos.row;
        var endRowLength = this.cursorManager.getStringLength(this.model.getRowArray(endRow).join(""));
        var cursorRowLength = this.cursorManager.getStringLength(this.model.getRowArray(args.pos.row).join(""));
        var charsToInsert;
        var tab = '';
        if (settings && settings.isSettingOn('tabmode')) {
            tab = "\t";
        } else {
            var tabsize = this.editor.getTabSize();
            while (tabsize-- > 0) {
                tab += " ";
            }
        }

        for (var y = startRow; y <= endRow; y++) {
            if (useHistoryIndent) {
                charsToInsert = historyIndent[y - startRow];
            } else if (tab != '\t') {
                charsToInsert = this.cursorManager.getLeadingWhitespace(y);
                charsToInsert = this.cursorManager.getNextTablevelRight(charsToInsert) - charsToInsert;
                charsToInsert = tab.substring(0, charsToInsert);
            } else {
                // in the case of "real" tabs we just insert the tabs
                charsToInsert = '\t';
            }
            this.model.insertCharacters(this.cursorManager.getModelPosition({ row: y, col: 0 }), charsToInsert);
            historyIndent[y - startRow] = charsToInsert;
        }

        var delta = this.cursorManager.getStringLength(this.model.getRowArray(args.pos.row).join("")) - cursorRowLength;
        if (!fakeSelection) {
            args.pos.col += delta;
            selection.endPos.col += this.cursorManager.getStringLength(this.model.getRowArray(endRow).join("")) - endRowLength;
            console.debug(selection.endPos);
            this.editor.setSelection(selection);
        } else {
            args.pos.col += delta;//(historyIndent[historyIndent.length-1] == '\t' ? this.editor.getTabSize() : historyIndent[historyIndent.length-1].length);
        }
        this.cursorManager.moveCursor({ col: args.pos.col });
        this.repaint();

        // undo/redo
        args.action = "indent";
        args.selection = selection;
        var redoOperation = args;
        var undoArgs = { action: "unindent", queued: args.queued, selection: selection, fakeSelection: fakeSelection, historyIndent: historyIndent, pos: bespin.editor.utils.copyPos(args.pos) };
        var undoOperation = undoArgs;
        this.editor.undoManager.addUndoOperation(new bespin.editor.UndoItem(undoOperation, redoOperation));
    },

    unindent: function(args) {
        var historyIndent = args.historyIndent || false;
        if (!historyIndent) {
            var newHistoryIndent = [];
        }
        var selection = args.selection || this.editor.getSelection();
        var fakeSelection = args.fakeSelection || false;
        if (!selection) {
            fakeSelection = true;
            selection = { startPos: { row: args.pos.row, col: args.pos.col }, endPos: { row: args.pos.row, col: args.pos.col } };
        }
        var startRow = selection.startPos.row;
        var endRow = selection.endPos.row;
        var endRowLength = this.cursorManager.getStringLength(this.model.getRowArray(endRow).join(""));
        var row = false;
        var charsToDelete;
        var charsWidth;

        for (var y = startRow; y <= endRow; y++) {
            if (historyIndent) {
                charsToDelete = historyIndent[y - startRow].length;
                charsWidth = (historyIndent[y - startRow] == '\t' ? this.editor.getTabSize() : historyIndent[y - startRow].length);
            } else {
                row = this.model.getRowArray(y);
                if (row.length > 0 && row[0] == '\t') {
                    charsToDelete = 1;
                    charsWidth = this.editor.getTabSize();
                } else {
                    var leadingWhitespaceLength = this.cursorManager.getLeadingWhitespace(y);
                    charsToDelete = this.cursorManager.getContinuousSpaceCount(0, this.editor.getTabSize(), y);
                    charsWidth = charsToDelete;
                }
                newHistoryIndent.push(row.join("").substring(0, charsToDelete));
            }

            if (charsToDelete) {
                this.model.deleteCharacters(this.cursorManager.getModelPosition({ row: y, col: 0 }), charsToDelete);
            }
            if (y == startRow) {
                selection.startPos.col = Math.max(0, selection.startPos.col - charsWidth);
            }
            if (y == endRow) {
                if (!row) row = this.model.getRowArray(y);
                var delta = endRowLength - this.cursorManager.getStringLength(row.join(""));
                selection.endPos.col = Math.max(0, selection.endPos.col - delta);
                args.pos.col = Math.max(0, args.pos.col - delta);
            }
        }
        this.cursorManager.moveCursor({ col: args.pos.col });

        if (!fakeSelection) {
            this.editor.setSelection(selection);
        }
        historyIndent = historyIndent ? historyIndent : newHistoryIndent;
        this.repaint();

        // undo/redo
        args.action = "unindent";
        args.selection = selection;
        var redoOperation = args;
        var undoArgs = { action: "indent", queued: args.queued, selection: selection, fakeSelection: fakeSelection, historyIndent: historyIndent, pos: bespin.editor.utils.copyPos(args.pos) };
        var undoOperation = undoArgs;
        this.editor.undoManager.addUndoOperation(new bespin.editor.UndoItem(undoOperation, redoOperation));
    },

    // NOTE: Actually, clipboard.js is taking care of this unless EditorOnly mode is set
    cutSelection: function(args) {
        if (this.editor.readonly) return;

        this.copySelection(args);
        this.deleteSelection(args);
    },

    // NOTE: Actually, clipboard.js is taking care of this unless EditorOnly mode is set
    copySelection: function(args) {
        var selectionObject = this.editor.getSelection();
        if (selectionObject) {
            var selectionText = this.model.getChunk(selectionObject);
            if (selectionText) {
                bespin.editor.clipboard.Manual.copy(selectionText);
            }
        }
    },

    deleteSelectionAndInsertChunk: function(args) {
        if (this.editor.readonly) return;

        var oldqueued = args.queued;

        args.queued = true;

        var selection = this.editor.getSelection();
        var chunk = this.deleteSelection(args);
        args.pos = bespin.editor.utils.copyPos(this.editor.getCursorPos());
        var endPos = this.insertChunk(args);

        args.queued = oldqueued;

        // undo/redo
        // Redo is done with a separate function
        var redoArgs = {
            action: "deleteChunkAndInsertChunk",
            pos: bespin.editor.utils.copyPos(args.pos),
            queued: args.queued,
            selection: selection,
            chunk: args.chunk,
            newChunk: chunk
        };
        var redoOperation = redoArgs;
        var undoArgs = {
            action: "deleteChunkAndInsertChunkAndSelect",
            pos: bespin.editor.utils.copyPos(args.pos),
            endPos: endPos,
            queued: args.queued,
            selection: selection,
            chunk: chunk,
            newChunk: args.chunk
        };
        var undoOperation = undoArgs;
        this.editor.undoManager.addUndoOperation(new bespin.editor.UndoItem(undoOperation, redoOperation));
    },

    deleteChunkAndInsertChunkAndSelect: function(args) {
        if (this.editor.readonly) return;

        var oldqueued = args.queued;

        args.queued = true;

        var chunk = args.chunk;
        this.deleteChunk(args);
        this.insertChunkAndSelect(args);

        args.queued = oldqueued;

        // undo/redo
        args.action = "deleteChunkAndInsertChunkAndSelect";
        var redoOperation = args;
        var undoArgs = {
            action: "deleteChunkAndInsertChunk",
            pos: bespin.editor.utils.copyPos(args.pos),
            queued: args.queued,
            selection: args.selection,
            chunk: args.chunk,
            newChunk: chunk
        };
        var undoOperation = undoArgs;
        this.editor.undoManager.addUndoOperation(new bespin.editor.UndoItem(undoOperation, redoOperation));
    },

    // Do not assume that the text to be deleted is currently selected
    deleteChunkAndInsertChunk: function(args) {
        if (this.editor.readonly) return;

        // Ignore whatever is currently selected; we've got our selection already
        this.editor.setSelection(undefined);
        this.repaint();

        var oldqueued = args.queued;

        args.queued = true;

        this.deleteChunk(args.selection);
        args.pos = bespin.editor.utils.copyPos(this.editor.getCursorPos());
        var endPos = this.insertChunk(args);

        args.queued = oldqueued;

        // undo/redo
        args.action = "deleteChunkAndInsertChunk";
        var redoOperation = args;
        var undoArgs = {
            action: "deleteCharacterAndInsertChunkAndSelectChunk",
            pos: bespin.editor.utils.copyPos(args.pos),
            endPos: endPos,
            queued: args.queued,
            selection: args.selection,
            chunk: args.newChunk,
            newChunk: args.chunk
        };
        var undoOperation = undoArgs;
        this.editor.undoManager.addUndoOperation(new bespin.editor.UndoItem(undoOperation, redoOperation));
    },

    // NOTE: Actually, clipboard.js is taking care of this unless EditorOnly mode is set
    pasteFromClipboard: function(args) {
        if (this.editor.readonly) return;

        var clipboard = (args.clipboard) ? args.clipboard : bespin.editor.clipboard.Manual.data();
        if (clipboard === undefined) return; // darn it clipboard!
        args.chunk = clipboard;
        this.insertChunk(args);
    },

    insertChunk: function(args) {
        if (this.editor.readonly) return;

        if (this.editor.selection) {
            this.deleteSelectionAndInsertChunk(args);
        } else {
            var pos = bespin.editor.utils.copyPos(this.cursorManager.getCursorPosition());
            pos = this.model.insertChunk(this.cursorManager.getModelPosition(pos), args.chunk);
            pos = this.cursorManager.getCursorPosition(pos);
            this.cursorManager.moveCursor(pos);
            this.repaint();

            // undo/redo
            args.action = "insertChunk";
            var redoOperation = args;
            var undoArgs = { action: "deleteChunk", pos: bespin.editor.utils.copyPos(args.pos), queued: args.queued, endPos: pos };
            var undoOperation = undoArgs;
            this.editor.undoManager.addUndoOperation(new bespin.editor.UndoItem(undoOperation, redoOperation));

            return pos;
        }
    },

    deleteChunk: function(args) {
        if (this.editor.readonly) return;

        // Sometimes we're passed a selection, and sometimes we're not.
        var startPos = (args.startPos != undefined) ? args.startPos : bespin.editor.utils.copyPos(args.pos);

        var selection = this.editor.getSelection({ startPos: startPos, endPos: args.endPos });
        var chunk = this.model.deleteChunk(selection);
        this.cursorManager.moveCursor(selection.startPos);
        this.repaint();

        // undo/redo
        args.action = "deleteChunk";
        var redoOperation = args;
        var undoArgs = { action: "insertChunk", pos: bespin.editor.utils.copyPos(selection.startPos), queued: args.queued, chunk: chunk };
        var undoOperation = undoArgs;
        this.editor.undoManager.addUndoOperation(new bespin.editor.UndoItem(undoOperation, redoOperation));
    },

    //deleteLine: function(args) {
    //    if (this.editor.readonly) return;
    //    this.editor.lines.splice(args.pos.row);
    //    if (args.pos.row >= this.editor.lines.length) this.cursorManager.moveCursor({ row: args.pos.row - 1, col: args.pos.col });
    //    this.repaint();
    //},

    joinLine: function(args) {
        if (this.editor.readonly) return;

        if (args.joinDirection == "up") {
            if (args.pos.row == 0) return;

            var newcol = this.editor.ui.getRowScreenLength(args.pos.row - 1);
            this.model.joinRow(args.pos.row - 1, args.autounindentSize);
            this.cursorManager.moveCursor({ row: args.pos.row - 1, col: newcol });
        } else {
            if (args.pos.row >= this.model.getRowCount() - 1) return;

            this.model.joinRow(args.pos.row);
        }

        // undo/redo
        args.action = "joinLine";
        var redoOperation = args;
        var undoArgs = { action: "newline", pos: bespin.editor.utils.copyPos(this.editor.getCursorPos()), queued: args.queued };
        var undoOperation = undoArgs;
        this.editor.undoManager.addUndoOperation(new bespin.editor.UndoItem(undoOperation, redoOperation));

        this.repaint();
    },

    killLine: function(args) {
        if (this.editor.readonly) return;

        // select the current row
        this.editor.setSelection({ startPos: { row: args.pos.row, col: 0 }, endPos: { row: args.pos.row + 1, col: 0 } });
        this.cutSelection(args); // cut (will save and redo will work)
    },

    deleteSelection: function(args) {
        if (this.editor.readonly || !this.editor.selection) return;

        var selection = this.editor.getSelection();
        var chunk = this.model.getChunk(selection);
        this.model.deleteChunk(selection);

        // undo/redo
        args.action = "deleteSelection";
        var redoOperation = args;
        var undoArgs = { action: "insertChunkAndSelect", pos: bespin.editor.utils.copyPos(selection.startPos), queued: args.queued, chunk: chunk };
        var undoOperation = undoArgs;
        this.editor.undoManager.addUndoOperation(new bespin.editor.UndoItem(undoOperation, redoOperation));

        // setting the selection to undefined has to happen *after* we enqueue the undoOp otherwise replay breaks
        this.editor.setSelection(undefined);
        this.cursorManager.moveCursor(selection.startPos);
        this.repaint();

        return chunk;
    },

    insertChunkAndSelect: function(args) {
        if (this.editor.readonly) return;

        var endPos = this.cursorManager.getCursorPosition(this.model.insertChunk(this.cursorManager.getModelPosition(args.pos), args.chunk));

        args.action = "insertChunkAndSelect";
        var redoOperation = args;
        var undoArgs = { action: "deleteSelection", pos: bespin.editor.utils.copyPos(endPos), queued: args.queued };
        var undoOperation = undoArgs;
        this.editor.undoManager.addUndoOperation(new bespin.editor.UndoItem(undoOperation, redoOperation));

        this.editor.setSelection({ startPos: args.pos, endPos: endPos });
        this.cursorManager.moveCursor(endPos);
        this.repaint();
    },

    backspace: function(args) {
        if (this.editor.readonly) return;

        if (this.editor.selection) {
            this.deleteSelection(args);
        } else {
            if (args.pos.col > 0) {
                var settings = bespin.get('settings');
                if (settings && settings.isSettingOn('smartmove')) {
                    var tabsize = this.editor.getTabSize();
                    var freeSpaces = this.cursorManager.getContinuousSpaceCount(args.pos.col, this.cursorManager.getNextTablevelLeft(args.pos.col));
                    if (freeSpaces == tabsize) {
                        var pos = args.pos;
                        this.editor.selection = { startPos: { row: pos.row, col: pos.col - tabsize}, endPos: {row: pos.row, col: pos.col}};
                        this.deleteSelection(args);
                        return;
                    }
                }
                this.cursorManager.moveCursor({ col:  Math.max(0, args.pos.col - 1) });
                args.pos.col -= 1;
                this.deleteCharacter(args);
            } else {
                args.joinDirection = "up";
                this.joinLine(args);
            }
        }
    },

    deleteKey: function(args) {
        if (this.editor.readonly) return;

        if (this.editor.selection) {
            this.deleteSelection(args);
        } else {
            if (args.pos.col < this.editor.ui.getRowScreenLength(args.pos.row)) {
                var settings = bespin.get('settings');
                if (settings && settings.isSettingOn('smartmove')) {
                    var tabsize = this.editor.getTabSize();
                    var freeSpaces = this.cursorManager.getContinuousSpaceCount(args.pos.col, this.cursorManager.getNextTablevelRight(args.pos.col));
                    if (freeSpaces == tabsize) {
                        var pos = args.pos;
                        this.editor.selection = { startPos: { row: pos.row, col: pos.col}, endPos: {row: pos.row, col: pos.col + tabsize}};
                        this.deleteSelection(args);
                        return;
                    }
                }
                this.deleteCharacter(args);
            } else {
                args.joinDirection = "down";
                this.joinLine(args);
            }
        }
    },

    deleteCharacter: function(args) {
        if (this.editor.readonly) return;

        if (args.pos.col < this.editor.ui.getRowScreenLength(args.pos.row)) {
            var modelPos = this.cursorManager.getModelPosition(args.pos);
            var deleted = this.model.deleteCharacters(modelPos, 1);
            this.repaint();

            // undo/redo
            args.action = "deleteCharacter";
            var redoOperation = args;
            var undoArgs = { action: "insertCharacter", pos: bespin.editor.utils.copyPos(args.pos), queued: args.queued, newchar: deleted };
            var undoOperation = undoArgs;
            this.editor.undoManager.addUndoOperation(new bespin.editor.UndoItem(undoOperation, redoOperation));
        }
    },

    newline: function(args) {
        if (this.editor.readonly) return;

        var settings = bespin.get("settings");
        var autoindent = bespin.util.leadingWhitespace(this.model.getRowArray(args.pos.row));
        var autoindentSize = 0, tabsize = this.editor.getTabSize();;
        //calculate equivalent number of spaces in autoindent
        for (var i = 0; i < autoindent.length; i++) {
            if (autoindent[i] == ' ' || autoindent[i] == '' || autoindent[i] === undefined) autoindentSize++;
            else if (autoindent[i] == '\t') autoindentSize += tabsize;
            else break;
        }

        this.model.splitRow(this.cursorManager.getModelPosition(args.pos), autoindent);
        this.cursorManager.moveCursor({ row: this.cursorManager.getCursorPosition().row + 1, col: autoindentSize });

        // undo/redo
        args.action = "newline";
        var redoOperation = args;
        var undoArgs = { 
            action: "joinLine",
            joinDirection: "up", 
            pos: bespin.editor.utils.copyPos(this.cursorManager.getCursorPosition()),
            queued: args.queued,
            autounindentSize: autoindent.length
        };
        var undoOperation = undoArgs;
        this.editor.undoManager.addUndoOperation(new bespin.editor.UndoItem(undoOperation, redoOperation));

        this.repaint();
    },

    // it seems kinda silly, but when you have a region selected and you insert a character, I have a separate action that is invoked.
    // this is because it's really two operations: deleting the selected region and then inserting a character. Each of these two
    // actions adds an operation to the undo queue. So I have two choices for
    deleteSelectionAndInsertCharacter: function(args) {
        if (this.editor.readonly) return;

        var oldqueued = args.queued;

        args.queued = true;

        var selection = this.editor.getSelection();
        var chunk = this.deleteSelection(args);
        args.pos = bespin.editor.utils.copyPos(this.editor.getCursorPos());
        this.insertCharacter(args);

        args.queued = oldqueued;

        // undo/redo
        // Redo is done with a separate function
        var redoArgs = {
            action: "deleteChunkAndInsertCharacter",
            pos: bespin.editor.utils.copyPos(args.pos),
            queued: args.queued,
            selection: selection,
            newchar: args.newchar,
            chunk: chunk
        };
        var redoOperation = redoArgs;
        var undoArgs = {
            action: "deleteCharacterAndInsertChunkAndSelect",
            pos: bespin.editor.utils.copyPos(args.pos),
            queued: args.queued,
            selection: selection,
            newchar: args.newchar,
            chunk: chunk
        };
        var undoOperation = undoArgs;
        this.editor.undoManager.addUndoOperation(new bespin.editor.UndoItem(undoOperation, redoOperation));
    },

    deleteCharacterAndInsertChunkAndSelect: function(args) {
        if (this.editor.readonly) return;

        var oldqueued = args.queued;

        args.queued = true;

        this.deleteCharacter(args);
        this.insertChunkAndSelect(args);

        args.queued = oldqueued;

        // undo/redo
        args.action = "deleteCharacterAndInsertChunkAndSelect";
        var redoOperation = args;
        var undoArgs = {
            action: "deleteChunkAndInsertCharacter",
            pos: bespin.editor.utils.copyPos(args.pos),
            queued: args.queued,
            selection: args.selection,
            newchar: args.newchar,
            chunk: args.chunk
        };
        var undoOperation = undoArgs;
        this.editor.undoManager.addUndoOperation(new bespin.editor.UndoItem(undoOperation, redoOperation));
    },

    // Do not assume that the text to be deleted is currently selected
    deleteChunkAndInsertCharacter: function(args) {
        if (this.editor.readonly) return;

        // Ignore whatever is currently selected; we've got our selection already
        this.editor.setSelection(undefined);
        this.repaint();

        var oldqueued = args.queued;

        args.queued = true;

        this.deleteChunk(args.selection);
        args.pos = bespin.editor.utils.copyPos(this.editor.getCursorPos());
        this.insertCharacter(args);

        args.queued = oldqueued;

        // undo/redo
        args.action = "deleteChunkAndInsertCharacter";
        var redoOperation = args;
        var undoArgs = {
            action: "deleteCharacterAndInsertChunkAndSelectChunk",
            pos: bespin.editor.utils.copyPos(args.pos),
            queued: args.queued,
            selection: args.selection,
            newchar: args.newchar,
            chunk: args.chunk
        };
        var undoOperation = undoArgs;
        this.editor.undoManager.addUndoOperation(new bespin.editor.UndoItem(undoOperation, redoOperation));
    },

    insertCharacter: function(args) {
        if (this.editor.readonly) return;

        if (this.editor.selection) {
            this.deleteSelectionAndInsertCharacter(args);
        } else {
            this.model.insertCharacters(this.cursorManager.getModelPosition(args.pos), args.newchar);
            this.cursorManager.moveRight(true);
            this.repaint();

            // undo/redo
            args.action = "insertCharacter";
            var redoOperation = args;
            var undoArgs = { action: "deleteCharacter", pos: bespin.editor.utils.copyPos(args.pos), queued: args.queued };
            var undoOperation = undoArgs;
            this.editor.undoManager.addUndoOperation(new bespin.editor.UndoItem(undoOperation, redoOperation));
        }
    },

    moveCursorRowToCenter: function(args) {
        var saveCursorRow = this.editor.getCursorPos().row;
        var halfRows = Math.floor(this.editor.ui.visibleRows / 2);
        if (saveCursorRow > (this.editor.ui.firstVisibleRow + halfRows)) { // bottom half, so move down
            this.cursorManager.moveCursor({ row: this.editor.getCursorPos().row + halfRows });
        } else { // top half, so move up
            this.cursorManager.moveCursor({ row: this.editor.getCursorPos().row - halfRows });
        }
        this.editor.ui.ensureCursorVisible();
        this.cursorManager.moveCursor({ row: saveCursorRow });
    },

    getOppositeCase: function(stringCase) {
        if (!stringCase) return undefined;

        switch (stringCase) {
            case 'u':
                return 'l';
            break;

            case 'l':
                return 'u';
            break;
        }
    },

    selectionChangeCase: function(args) {
        if (this.editor.readonly) return;

        //console.log('selectionChangeCase Fired!');
        if (this.editor.selection) {
            if (!args.selectionObject) {
                args.selectionObject = this.editor.getSelection();
            }

            var selection = this.model.getChunk(args.selectionObject);
            var stringArray = selection.split("\n");
            for (i in stringArray) {
                switch (args.stringCase) {
                    case 'l':
                        stringArray[i] = stringArray[i].toLowerCase();
                    break;

                    case 'u':
                        stringArray[i] = stringArray[i].toUpperCase();
                    break;
                }
            }
            var outText = stringArray.join("\n");

            this.model.deleteChunk(args.selectionObject);
            this.model.insertChunk(args.selectionObject.startModelPos, outText);
            this.select(args.selectionObject);

            args.action = "selectionChangeCase";
            var redoOperation = args;
            var undoArgs = { action: "undoSelectionChangeCase", selectionObject: args.selectionObject, text: selection, stringCase: this.getOppositeCase(args.stringCase) };
            var undoOperation = undoArgs;
            this.editor.undoManager.addUndoOperation(new bespin.editor.UndoItem(undoOperation, redoOperation));
        }
    },

    undoSelectionChangeCase: function(args) {
        if (this.editor.readonly) return;

        this.model.deleteChunk(args.selectionObject);
        var selection = this.model.insertChunk(args.selectionObject.startModelPos, args.text);
        this.select(args.selectionObject);

/*        args.action = "undoSelectionChangeCase";
        var redoOperation = args;
        var undoArgs = { action: "selectionChangeCase", selectionObject: args.selectionObject, text: selection, stringCase: this.getOppositeCase(args.stringCase) };
        var undoOperation = undoArgs;
        this.editor.undoManager.addUndoOperation(new bespin.editor.UndoItem(undoOperation, redoOperation));*/
    },

    // START SEARCH ACTIONS
    startSearch: function(str, displayType, shiftKey) {
        if (str == '') {
            // nothing to search for? Reset the searchString
            this.editor.ui.setSearchString(false);
            this.editor.paint(true);
            dojo.byId('searchresult').style.display = 'none';
            return false;
        }

        if (str == this.editor.ui.searchString && displayType == 'toolbar') {
            if (!shiftKey) {
                this.findNext();
            } else {
                this.findPrev();
            }
            dojo.byId('searchresult').style.display = 'block';
            return;
        }

        // go and search for the searchString
        this.editor.ui.setSearchString(str);
        var count = this.editor.model.getCountOfString(str);
        if (count != 0) {
            // okay, there are matches, so go on...
            var pos = bespin.editor.utils.copyPos(this.editor.cursorManager.getCursorPosition());

            // first try to find the searchSting from the current position
            if (!this.editor.ui.actions.findNext(true)) {
                // there was nothing found? Search from the beginning
                this.editor.cursorManager.moveCursor({col: 0, row: 0 });
                this.editor.ui.actions.findNext();
            }
        }

        // display the count of matches in different ways
        switch (displayType) {
            case 'commandLine':
                var msg = "Found " + count + " match";
                if (count > 1) { msg += 'es'; }
                msg += " for your search for <em>" + str + "</em>";

                bespin.get('commandLine').showHint(msg);
            break;

            case 'searchwindow':
                var filesearch = bespin.get('filesearch');
                if (filesearch) {
                    filesearch.setMatchesCount(count);
                }
            break;

            case 'toolbar':
                var msg = + count + " Match";
                if (count > 1) { msg += 'es'; }
                dojo.byId('searchfeedback').innerHTML = msg;
                dojo.byId('searchresult').style.display = 'block';
            break;
        }

        // repaint the editor
        this.editor.paint(true);
    },

    // find the next match in the file
    findNext: function(canBeSamePosition) {
        if (!this.editor.ui.searchString) return;
        var pos = bespin.editor.utils.copyPos(this.cursorManager.getModelPosition());
        var sel = this.editor.getSelection();
        if (canBeSamePosition && sel !== undefined) {
            pos.col -= sel.endModelPos.col - sel.startModelPos.col + 1;
        }
        var found = this.model.findNext(pos.row, pos.col, this.editor.ui.searchString);
        if (!found) found = this.model.findNext(0, 0, this.editor.ui.searchString);
        if (found) {
            this.editor.setSelection({startPos: this.cursorManager.getCursorPosition(found.startPos), endPos: this.cursorManager.getCursorPosition(found.endPos)});
            this.cursorManager.moveCursor(this.cursorManager.getCursorPosition(found.endPos));
            this.editor.ui.ensureCursorVisible(true);
            this.repaint();

            return true;
        } else {
            return false;
        }
    },

    // find the previous match in the file
    findPrev: function() {
        if (!this.editor.ui.searchString) return;

        var pos = this.cursorManager.getModelPosition();
        var found = this.model.findPrev(pos.row, pos.col, this.editor.ui.searchString);
        if (!found) {
            var lastRow = this.model.getRowCount() - 1;
            found = this.model.findPrev(lastRow, this.model.getRowArray(lastRow).length - 1, this.editor.ui.searchString);
        }
        if (found) {
            this.editor.setSelection({startPos: this.cursorManager.getCursorPosition(found.startPos), endPos: this.cursorManager.getCursorPosition(found.endPos)});
            this.cursorManager.moveCursor(this.cursorManager.getCursorPosition(found.endPos));
            this.editor.ui.ensureCursorVisible(true);
            this.repaint();
        }
    },

    // Fire an escape message so various parts of the UI can choose to clear
    escape: function() {
        bespin.publish("ui:escape");
    },
    // END SEARCH ACTIONS

    toggleQuickopen: function() {
        var quickopen = bespin.get('quickopen');
        if (quickopen) {
            quickopen.window.toggle();
        }
    },

    togglePieMenu: function() {
        var piemenu = bespin.get('piemenu');
        if (piemenu) {
            piemenu.toggle();
        }
    },

    toggleFilesearch: function() {
        var settings = bespin.get("settings");

        if (settings && !settings.isSettingOn('searchwindow')) {
            dojo.byId('searchquery').focus();
            dojo.byId('searchquery').select();
        } else {
            var filesearch = bespin.get('filesearch');
            if (filesearch) {
                filesearch.window.toggle();
            }
        }
    },

    focusCommandline: function() {
        var piemenu = bespin.get('piemenu');
        if (piemenu) {
            piemenu.show(piemenu.slices.commandLine);
        } else {
            var commandLine = bespin.get('commandLine');
            if (commandLine) {
                commandLine.commandLine.focus();
            }
        }
    },

    repaint: function() {
        if (!this.ignoreRepaints) {
            this.editor.ui.ensureCursorVisible();
            this.editor.paint();
        }
    }
});

}

if(!dojo._hasResource["bespin.editor.clipboard"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.editor.clipboard"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

dojo.provide("bespin.editor.clipboard");

// = Clipboard =
//
// Handle clipboard operations.
// If using WebKit (I know, feature detection would be nicer, but e.clipboardData is deep) use DOMEvents
// Else try the bad tricks.

// ** {{{ bespin.editor.clipboard }}} **
//
// The factory that is used to install, and setup the adapter that does the work

dojo.mixin(bespin.editor.clipboard, {
    // ** {{{ install }}} **
    //
    // Given a clipboard adapter implementation, save it, an call install() on it
    install: function(editor, newImpl) {
        if (this.uses && typeof this.uses['uninstall'] == "function") this.uses.uninstall();
        this.uses = newImpl;
        this.uses.install(editor);
    },

    // ** {{{ setup }}} **
    //
    // Do the first setup. Right now checks for WebKit and inits a DOMEvents solution if that is true
    // else install the default.
    setup: function(editor) {
        if (dojo.isWebKit) {
            this.install(editor, new bespin.editor.clipboard.DOMEvents());
        } else {
            this.install(editor, new bespin.editor.clipboard.HiddenWorld());
        }
    }
});

// ** {{{ bespin.editor.clipboard.DOMEvents }}} **
//
// This adapter configures the DOMEvents that only WebKit seems to do well right now.
// There is trickery involved here. The before event changes focus to the hidden
// copynpaster text input, and then the real event does its thing and we focus back

dojo.declare("bespin.editor.clipboard.DOMEvents", null, {
    install: function(editor) {

        // * Configure the hidden copynpaster element
        var copynpaster = dojo.create("input", {
            type: 'text',
            id: 'copynpaster',
            style: "position: absolute; z-index: -400; top: -100px; left: -100px; width: 0; height: 0; border: none;"
        }, dojo.body());

        // * Defensively stop doing copy/cut/paste magic if you are in the command line
        var stopAction = function(e) {
            return e.target.id == "command";
        };

        // Copy
        this.beforecopyHandle = dojo.connect(document, "beforecopy", function(e) {
            if (stopAction(e)) return;
            e.preventDefault();
            copynpaster.focus();
        });

        this.copyHandle = dojo.connect(document, "copy", function(e) {
            if (stopAction(e)) return;

            var selectionText = editor.getSelectionAsText();

            if (selectionText && selectionText != '') {
                e.preventDefault();
                e.clipboardData.setData('text/plain', selectionText);
            }

            dojo.byId('canvas').focus();
        });

        // Cut
        this.beforecutHandle = dojo.connect(document, "beforecut", function(e) {
            if (stopAction(e)) return;

            e.preventDefault();
            copynpaster.focus();
        });

        this.cutHandle = dojo.connect(document, "cut", function(e) {
            if (stopAction(e)) return;

            var selectionObject = editor.getSelection();

            if (selectionObject) {
                var selectionText = editor.model.getChunk(selectionObject);

                if (selectionText && selectionText != '') {
                    e.preventDefault();
                    e.clipboardData.setData('text/plain', selectionText);
                    editor.ui.actions.deleteSelection(selectionObject);
                }
            }

            dojo.byId('canvas').focus();
        });

        // Paste
        this.beforepasteHandle = dojo.connect(document, "beforepaste", function(e) {
            if (stopAction(e)) return;

            e.preventDefault();
            copynpaster.focus();
        });

        this.pasteHandle = dojo.connect(document, "paste", function(e) {
            if (stopAction(e)) return;

            e.preventDefault();
            var args = bespin.editor.utils.buildArgs();
            args.chunk = e.clipboardData.getData('text/plain');
            if (args.chunk) editor.ui.actions.insertChunk(args);

            dojo.byId('canvas').focus();
            copynpaster.value = '';
        });

        dojo.connect(document, "dom:loaded", dojo.hitch(this, function() {
            this.keydownHandle = dojo.connect(copynpaster, "keydown", function(e) {
                e.stopPropagation();
            });

            this.keypressHandle = dojo.connect(copynpaster, "keypress", function(e) {
                e.stopPropagation();
            });
        }));
    },

    uninstall: function() {
        dojo.disconnect(this.keypressHandle);
        dojo.disconnect(this.keydownHandle);
        dojo.disconnect(this.beforepasteHandle);
        dojo.disconnect(this.pasteHandle);
        dojo.disconnect(this.beforecutHandle);
        dojo.disconnect(this.cutHandle);
        dojo.disconnect(this.beforecopyHandle);
        dojo.disconnect(this.copyHandle);
    }
});

// ** {{{ bespin.editor.clipboard.HiddenWorld }}} **
//
// Exclusively grab the C, X, and V key combos and use a hidden input to move data around

dojo.declare("bespin.editor.clipboard.HiddenWorld", null, {
    install: function(editor) {

        // * Configure the hidden copynpaster element
        var copynpaster = dojo.create("textarea", {
            id: 'copynpaster',
            tabIndex: '-1',
            autocomplete: 'off',
            style: "position:absolute; z-index:999; top:-10000px; width:0; height:0; border:none;"
        }, dojo.body());

        var copyToClipboard = function(text) {
            copynpaster.value = text;

            copynpaster.select();
            setTimeout(function() {
                //copynpaster.value = "";
                editor.setFocus(true);
            }, 0);
        };

        this.keyDown = dojo.connect(editor.opts.actsAsComponent ? editor.canvas : document, "keydown", function(e) {
            if ((bespin.util.isMac() && e.metaKey) || e.ctrlKey) {
                // Copy
                if (e.keyCode == 67 /*c*/) {
                    // place the selection into the input
                    var selectionText = editor.getSelectionAsText();

                    if (selectionText && selectionText != '') {
                        copyToClipboard(selectionText);
                    }

                // Cut
                } else if (e.keyCode == 88 /*x*/) {
                    // place the selection into the input
                    var selectionObject = editor.getSelection();

                    if (selectionObject) {
                        var selectionText = editor.model.getChunk(selectionObject);

                        if (selectionText && selectionText != '') {
                            copyToClipboard(selectionText);
                            editor.ui.actions.deleteSelection(selectionObject);
                        }
                    }

                // Paste
                } else if (e.keyCode == 86 /*v*/) {
                    if (e.target == dojo.byId("command")) return; // let the paste happen in the command

                    copynpaster.select(); // select and hope that the paste goes in here

                    setTimeout(function() {
                        var args = bespin.editor.utils.buildArgs();
                        args.chunk = copynpaster.value;
                        if (args.chunk) editor.ui.actions.insertChunk(args);
                        editor.setFocus(true);
                    }, 0);
                }
            }
        });
    },

    uninstall: function() {
        dojo.disconnect(this.keyDown);
    }
});

// ** {{{ bespin.editor.clipboard.EditorOnly }}} **
//
// Turn on the key combinations to access the Bespin.Clipboard.Manual class which basically only works
// with the editor only. Not in favour.

dojo.declare("bespin.editor.clipboard.EditorOnly", null, {
    install: function() {
        var copyArgs = bespin.util.keys.fillArguments("CMD C");
        copyArgs.action = "copySelection";
        bespin.publish("editor:bindkey", copyArgs);

        var pasteArgs = bespin.util.keys.fillArguments("CMD V");
        pasteArgs.action = "pasteFromClipboard";
        bespin.publish("editor:bindkey", pasteArgs);

        var cutArgs = bespin.util.keys.fillArguments("CMD X");
        cutArgs.action = "cutSelection";
        bespin.publish("editor:bindkey", cutArgs);
    }
});

// ** {{{ Bespin.Clipboard.Manual }}} **
//
// The ugly hack that tries to use XUL to get work done, but will probably fall through to in-app copy/paste only
bespin.editor.clipboard.Manual = function() {
    var clipdata;

    return {
        copy: function(copytext) {
            try {
                if (netscape.security.PrivilegeManager.enablePrivilege) {
                    netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
                } else {
                    clipdata = copytext;
                    return;
                }
            } catch (ex) {
                clipdata = copytext;
                return;
            }

            var str = Components.classes["@mozilla.org/supports-string;1"].
                                      createInstance(Components.interfaces.nsISupportsString);
            str.data = copytext;

            var trans = Components.classes["@mozilla.org/widget/transferable;1"].
                                   createInstance(Components.interfaces.nsITransferable);
            if (!trans) return false;

            trans.addDataFlavor("text/unicode");
            trans.setTransferData("text/unicode", str, copytext.length * 2);

            var clipid = Components.interfaces.nsIClipboard;
            var clip   = Components.classes["@mozilla.org/widget/clipboard;1"].getService(clipid);
            if (!clip) return false;

            clip.setData(trans, null, clipid.kGlobalClipboard);

            /*
            // Flash doesn't work anymore :(
            if (inElement.createTextRange) {
                var range = inElement.createTextRange();
                if (range && BodyLoaded==1)
                    range.execCommand('Copy');
            } else {
                var flashcopier = 'flashcopier';
                if (!document.getElementById(flashcopier)) {
                    var divholder = document.createElement('div');
                    divholder.id = flashcopier;
                    document.body.appendChild(divholder);
                }
                document.getElementById(flashcopier).innerHTML = '';

                var divinfo = '<embed src="_clipboard.swf" FlashVars="clipboard='+escape(inElement.value)+'" width="0" height="0" type="application/x-shockwave-flash"></embed>';
                document.getElementById(flashcopier).innerHTML = divinfo;
            }
            */
        },

        data: function() {
            try {
                if (netscape.security.PrivilegeManager.enablePrivilege) {
                    netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
                } else {
                    return clipdata;
                }
            } catch (ex) {
                return clipdata;
            }

            var clip = Components.classes["@mozilla.org/widget/clipboard;1"].getService(Components.interfaces.nsIClipboard);
            if (!clip) return false;

            var trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
            if (!trans) return false;
            trans.addDataFlavor("text/unicode");

            clip.getData(trans, clip.kGlobalClipboard);

            var str       = {};
            var strLength = {};
            var pastetext = "";

            trans.getTransferData("text/unicode", str, strLength);
            if (str) str = str.value.QueryInterface(Components.interfaces.nsISupportsString);
            if (str) pastetext = str.data.substring(0, strLength.value / 2);
            return pastetext;
        }
    };
}();

}

if(!dojo._hasResource["bespin.editor.cursor"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.editor.cursor"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */
dojo.provide("bespin.editor.cursor");

// ** {{{ bespin.editor.CursorManager }}} **
//
// Handles the position of the cursor, hiding the complexity of translating between screen and model positions and so forth
dojo.declare("bespin.editor.CursorManager", null, {
    constructor: function(editor) {
        this.editor = editor;
        this.position = { row: 0, col: 0 };
        this.virtualCol = 0;
    },

    // Returns 'this.position' or 'pos' from optional input 'modelPos'
    getCursorPosition: function(modelPos) {
        if (modelPos != undefined) {
            var pos = bespin.editor.utils.copyPos(modelPos);
            var line = this.editor.model.getRowArray(pos.row);
            var tabsize = this.editor.getTabSize();

            // Special tab handling
            if (line.indexOf("\t") != -1) {
//              console.log( 'Cursor modelPos.col/pos.col begin: ', modelPos.col, pos.col );
                var tabs = 0, nottabs = 0;

                for (var i = 0; i < modelPos.col; i++) {
                    if (line[i] == "\t") {
                        pos.col += tabsize - 1 - ( nottabs % tabsize );
                        tabs++;
                        nottabs = 0;
                    } else {
                        nottabs++;
                        tabs = 0;
                    }
//                  console.log( 'tabs: ' + tabs, 'nottabs: ' + nottabs, 'pos.col: ' + pos.col );
                }

//              console.log( 'Cursor modelPos.col/pos.col end: ' + modelPos.col, pos.col );
            }

            return pos;
        } else {
            return this.position;
        }
    },

    // Returns 'modelPos' from optional input 'pos' or 'this.position'
    getModelPosition: function(pos) {
        pos = (pos != undefined) ? pos : this.position;
        var modelPos = bespin.editor.utils.copyPos(pos);
        var line = this.editor.model.getRowArray(pos.row);
        var tabsize = this.editor.getTabSize();

        // Special tab handling
        if (line.indexOf("\t") != -1) {
//          console.log( 'Model modelPos.col/pos.col begin: ', modelPos.col, pos.col );
            var tabs = 0, nottabs = 0;

            for (var i = 0; i < modelPos.col; i++) {
                if (line[i] == "\t") {
                    modelPos.col -= tabsize - 1 - ( nottabs % tabsize );
                    tabs++;
                    nottabs = 0;
                } else {
                    nottabs++;
                    tabs = 0;
                }
//              console.log( 'tabs: ' + tabs, 'nottabs: ' + nottabs, 'modelPos.col: ' + modelPos.col );
            }

//          console.log( 'Model modelPos.col/pos.col end: ' + modelPos.col, pos.col );
        }

        return modelPos;
    },
    
    getCharacterLength: function(character, column) {
        if (character.length > 1) return;
        if (column == undefined) column = this.position.col;
        if (character == "\t") {
            var tabsize = this.editor.getTabSize();
            return (tabsize - (column % tabsize));
        } else {
            return 1;
        }
    },

    // Returns the length of a given string. This takes '\t' in account!
    getStringLength: function(str) {
        if (!str || str.length == 0) return 0;
        var count = 0;
        str = str.split("");
        for (var x = 0; x < str.length; x++) {
            count += this.getCharacterLength(str[x], count);
        }
        return count;
    },
    
    // returns the numbers of white spaces from the beginning of the line
    // tabs are counted as whitespace
    getLeadingWhitespace: function(rowIndex) {
        var row = this.editor.model.getRowArray(rowIndex).join("");
        var match = /^(\s+).*/.exec(row);
        return (match && match.length == 2 ? this.getStringLength(match[1]) : 0);
    },
    
    // Returns the numbers of white spaces (NOT '\t'!!!) in a row
    // if the string between <from> and <to> is "  ab     " this will give you 2, as
    // there are 2 white spaces together from the beginning
    getContinuousSpaceCount: function(from, to, rowIndex) {
        rowIndex = rowIndex || this.position.row;
        var settings = bespin.get('settings');
        var row = this.editor.model.getRowArray(rowIndex);
        var delta = (from < to ? 1 : -1);
        var length = row.length;
        from = from + (delta == 1 ? 0 : -1);
        to = to + (delta == 1 ? 0 : -1);
        from = this.getModelPosition({col: from, row: rowIndex}).col;
        to = this.getModelPosition({col: to, row: rowIndex}).col;
        if (settings && settings.isSettingOn('strictlines')) {
            from = Math.min(from, length);
            to = Math.min(to, length);            
        }
        var count = 0;
        for (var x = from; x != to; x += delta) {
            if (x < length) {
                if (row[x] != ' ') {
                    break;
                }   
            }
            count++;
        }
        return count;
    },
    
    getNextTablevelLeft: function(col) {
        var tabsize = this.editor.getTabSize();
        col = col || this.position.col;
        col--;
        return Math.floor(col / tabsize) * tabsize;
    },
    
    getNextTablevelRight: function(col) {
        var tabsize = this.editor.getTabSize();
        col = col || this.position.col;
        col++;
        return Math.ceil(col / tabsize) * tabsize;
    },

    moveToLineStart: function() {
        var oldPos = bespin.editor.utils.copyPos(this.position);
        var leadingWhitespaceLength = this.getLeadingWhitespace(oldPos.row);

        if (this.position.col == 0) {
            this.moveCursor({ col:  leadingWhitespaceLength });
        } else if (this.position.col == leadingWhitespaceLength) {
            this.moveCursor({ col: 0 });
        } else if(leadingWhitespaceLength != this.editor.ui.getRowScreenLength(this.editor.cursorManager.getCursorPosition().row)){
            this.moveCursor({ col: leadingWhitespaceLength });
        } else {
            this.moveCursor({ col: 0 });
        }

        return { oldPos: oldPos, newPos: bespin.editor.utils.copyPos(this.position) };
    },

    moveToLineEnd: function() {
        var oldPos = bespin.editor.utils.copyPos(this.position);

        this.moveCursor({ col: this.editor.ui.getRowScreenLength(oldPos.row) });

        return { oldPos: oldPos, newPos: bespin.editor.utils.copyPos(this.position) };
    },

    moveToTop: function() {
        var oldPos = bespin.editor.utils.copyPos(this.position);

        this.editor.cursorManager.moveCursor({ row: 0, col: 0 });

        return { oldPos: oldPos, newPos: bespin.editor.utils.copyPos(this.position) };
    },

    moveToBottom: function() {
        var oldPos = bespin.editor.utils.copyPos(this.position);

        var row = this.editor.model.getRowCount() - 1;
        this.editor.cursorManager.moveCursor({ row: row, col: this.editor.ui.getRowScreenLength(row) });

        return { oldPos: oldPos, newPos: bespin.editor.utils.copyPos(this.position) };
    },

    moveUp: function() {
        var settings = bespin.get("settings");
        var selection = this.editor.getSelection();
        var oldPos = bespin.editor.utils.copyPos(this.position);
        var oldVirualCol = this.virtualCol;

        this.moveCursor({ row: oldPos.row - 1, col: Math.max(oldPos.col, this.virtualCol) });

        if ((settings && settings.isSettingOn('strictlines')) && this.position.col > this.editor.ui.getRowScreenLength(this.position.row)) {
            this.moveToLineEnd();   // this sets this.virtulaCol = 0!
            this.virtualCol = Math.max(oldPos.col, oldVirualCol);
        }

        return { oldPos: oldPos, newPos: bespin.editor.utils.copyPos(this.position) };
    },

    moveDown: function() {
        var settings = bespin.get("settings");
        var selection = this.editor.getSelection();

        var oldPos = bespin.editor.utils.copyPos(this.position);
        var oldVirualCol = this.virtualCol;

        this.moveCursor({ row: Math.max(0, oldPos.row + 1), col: Math.max(oldPos.col, this.virtualCol) });

        if ((settings && settings.isSettingOn('strictlines')) && this.position.col > this.editor.ui.getRowScreenLength(this.position.row)) {
            this.moveToLineEnd();   // this sets this.virtulaCol = 0!
            this.virtualCol = Math.max(oldPos.col, oldVirualCol);
        }

        return { oldPos: oldPos, newPos: bespin.editor.utils.copyPos(this.position) };
    },

    moveLeft: function(args) {
        var settings = bespin.get("settings");
        var oldPos = bespin.editor.utils.copyPos(this.position);
        var shiftKey = (args.event ? args.event.shiftKey : false);

        if (!this.editor.getSelection() || shiftKey) {
            if (settings && settings.isSettingOn('smartmove')) {
                var freeSpaces = this.getContinuousSpaceCount(oldPos.col, this.getNextTablevelLeft());
                if (freeSpaces == this.editor.getTabSize()) {
                    this.moveCursor({ col: oldPos.col - freeSpaces });  
                    return { oldPos: oldPos, newPos: bespin.editor.utils.copyPos(this.position) }
                } // else {
                //  this case is handled by the code following
                //}
            }

            // start of the line so move up
            if ((settings && settings.isSettingOn('strictlines')) && (this.position.col == 0)) {
                this.moveUp();
                if (oldPos.row > 0) this.moveToLineEnd();
            } else {
                this.moveCursor({ row: oldPos.row, col: Math.max(0, oldPos.col - 1) });
            }
        } else {
            this.moveCursor(this.editor.getSelection().startPos);
        }

        return { oldPos: oldPos, newPos: bespin.editor.utils.copyPos(this.position) };
    },

    moveRight: function(args) {
        var settings = bespin.get("settings");
        var oldPos = bespin.editor.utils.copyPos(this.position);
        var shiftKey = (args.event ? args.event.shiftKey : false);

        if (!this.editor.getSelection() || shiftKey) {
            if ((settings && settings.isSettingOn('smartmove')) && args != true) {
                var freeSpaces = this.getContinuousSpaceCount(oldPos.col, this.getNextTablevelRight());                       
                if (freeSpaces == this.editor.getTabSize()) {
                    this.moveCursor({ col: oldPos.col + freeSpaces })  
                    return { oldPos: oldPos, newPos: bespin.editor.utils.copyPos(this.position) }
                }// else {
                //  this case is handled by the code following
                //}
            }

            // end of the line, so go to the start of the next line
            if ((settings && settings.isSettingOn('strictlines')) && (this.position.col >= this.editor.ui.getRowScreenLength(this.position.row))) {
                this.moveDown();
                if (oldPos.row < this.editor.model.getRowCount() - 1) this.moveToLineStart();
            } else {
                this.moveCursor({ col: this.position.col + 1 });
            }
        } else {
            this.moveCursor(this.editor.getSelection().endPos);
        }

        return { oldPos: oldPos, newPos: bespin.editor.utils.copyPos(this.position) };
    },

    movePageUp: function() {
        var oldPos = bespin.editor.utils.copyPos(this.position);

        this.moveCursor({ row: Math.max(this.editor.ui.firstVisibleRow - this.editor.ui.visibleRows, 0) });

        return { oldPos: oldPos, newPos: bespin.editor.utils.copyPos(this.position) };
    },

    movePageDown: function() {
        var oldPos = bespin.editor.utils.copyPos(this.position);

        this.moveCursor({ row: Math.min(this.position.row + this.editor.ui.visibleRows, this.editor.model.getRowCount() - 1) });

        return { oldPos: oldPos, newPos: bespin.editor.utils.copyPos(this.position) };
    },

    smartMoveLeft: function() {
        var oldPos = bespin.editor.utils.copyPos(this.position);

        var row = this.editor.ui.getRowString(oldPos.row);

        var c, charCode;

        if (this.position.col == 0) { // -- at the start to move up and to the end
            this.moveUp();
            this.moveToLineEnd();
        } else {
            // Short circuit if cursor is ahead of actual spaces in model
            if (row.length < this.position.col) this.moveToLineEnd();

            var newcol = this.position.col;

            // This slurps up trailing spaces
            var wasSpaces = false;
            while (newcol > 0) {
                newcol--;

                c = row.charAt(newcol);
                charCode = c.charCodeAt(0);
                if (charCode == 32 /*space*/) {
                    wasSpaces = true;
                } else {
                    newcol++;
                    break;
                }
            }

            // This jumps to stop words
            if (!wasSpaces) {
                while (newcol > 0) {
                    newcol--;
                    c = row.charAt(newcol);
                    charCode = c.charCodeAt(0);
                    if ( (charCode < 65) || (charCode > 122) ) { // if you get to an alpha you are done
                        if (newcol != this.position.col - 1) newcol++; // right next to a stop char, move back one
                        break;
                    }
                }
            }

            this.moveCursor({ col: newcol });
        }

        return { oldPos: oldPos, newPos: bespin.editor.utils.copyPos(this.position) };
    },

    smartMoveRight: function() {
        var oldPos = bespin.editor.utils.copyPos(this.position);

        var row = this.editor.ui.getRowString(oldPos.row);

        if (row.length <= this.position.col) { // -- at the edge so go to the next line
            this.moveDown();
            this.moveToLineStart();
        } else {
            var c, charCode;

            var newcol = this.position.col;

            // This slurps up leading spaces
            var wasSpaces = false;
            while (newcol < row.length) {
                c = row[newcol];
                charCode = c.charCodeAt(0);
                if (charCode == 32 /*space*/) {
                    wasSpaces = true;
                    newcol++;
                } else {
                    break;
                }
            }

            // This jumps to stop words
            if (!wasSpaces) {
                while (newcol < row.length) {
                    newcol++;

                    if (row.length == newcol) { // one more to go
                        this.moveToLineEnd();
                        newcol = -1;
                        break;
                    }

                    c = row[newcol];
                    charCode = c.charCodeAt(0);

                    if ( (charCode < 65) || (charCode > 122) ) {
                        break;
                    }
                }
            }

            if (newcol != -1) this.moveCursor({ col: newcol });
        }

        return { oldPos: oldPos, newPos: bespin.editor.utils.copyPos(this.position) };
    },

    moveCursor: function(newpos) {
        if (!newpos) return; // guard against a bad position (certain redo did this)
        if (newpos.col === undefined) newpos.col = this.position.col;
        if (newpos.row === undefined) newpos.row = this.position.row;

        this.virtualCol = 0;
        var oldpos = this.position;

        var row = Math.min(newpos.row, this.editor.model.getRowCount() - 1); // last row if you go over
        if (row < 0) row = 0; // can't move negative off screen

        var invalid = this.isInvalidCursorPosition(row, newpos.col);
        if (invalid) {
            // console.log('Comparing (' + oldpos.row + ',' + oldpos.col + ') to (' + newpos.row + ',' + newpos.col + ') ...');
            // console.log("invalid position: " + invalid.left + ", " + invalid.right + "; half: " + invalid.half);
            if (oldpos.row != newpos.row) {
                newpos.col = invalid.right;
            } else if (oldpos.col < newpos.col) {
                newpos.col = invalid.right;
            } else if (oldpos.col > newpos.col) {
                newpos.col = invalid.left;
            } else {
                // default
                newpos.col = invalid.right;
            }
        }

        this.position = { row: row, col: newpos.col };
        // console.log('Position: (' + this.position.row + ', ' + this.position.col + ')', '[' + this.getModelPosition().col + ']');

        // keeps the editor's cursor from blinking while moving it
        var editorUI = bespin.get('editor').ui;
        editorUI.showCursor = true;
        editorUI.toggleCursorAllowed = false;
    },

    // Pass in a screen position; returns undefined if the postion is valid, otherwise returns closest left and right valid positions
    isInvalidCursorPosition: function(row, col) {
        var rowArray = this.editor.model.getRowArray(row);

        // we need to track the cursor position separately because we're stepping through the array, not the row string
        var curCol = 0;
        for (var i = 0; i < rowArray.length; i++) {
            if (rowArray[i].charCodeAt(0) == 9) {
                // if current character in the array is a tab, work out the white space between here and the tab stop
                var toInsert = this.editor.getTabSize() - (curCol % this.editor.getTabSize());

                // if the passed column is in the whitespace between the tab and the tab stop, it's an invalid position
                if ((col > curCol) && (col < (curCol + toInsert))) {
                    return { left: curCol, right: curCol + toInsert, half: toInsert / 2 };
                }

                curCol += toInsert - 1;
            }
            curCol++;
        }

        return undefined;
    }
});

}

if(!dojo._hasResource["bespin.editor.editor"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.editor.editor"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

dojo.provide("bespin.editor.editor");



// = Editor =
//
// This is the guts. The metal. The core editor has most of its classes living in here:
//
// * {{{bespin.editor.API}}} : The editor API itself
// * {{{bespin.editor.UI}}} : Knowledge of the UI pieces of the editor is here, bulk of the code. paints!
// * {{{bespin.editor.Scrollbar}}} : The custom scrollbar (to be factored out and use TH scrollbar instead)
// * {{{bespin.editor.SelectionHelper}}} : Handle text selection
// * {{{bespin.editor.DefaultEditorKeyListener}}} : Key listener operations
// * {{{bespin.editor.Rect}}} : Helper to hold a rectangle
// * {{{bespin.editor.Events}}} : Helper to hold a rectangle
// * {{{bespin.editor.Utils}}} : Blobby utility object to do common things
//
// * {{{bespin.editor.Actions}}} : The actions that the editor can do (can be added too) are are in actions.js

// ** {{{ bespin.editor.Scrollbar }}} **
//
// some state mgmt. for scrollbars; not a true component
dojo.declare("bespin.editor.Scrollbar", null, {
    HORIZONTAL: "horizontal",
    VERTICAL: "vertical",
    MINIMUM_HANDLE_SIZE: 20,

    constructor: function(ui, orientation, rect, value, min, max, extent) {
        this.ui = ui;
        this.orientation = orientation; // "horizontal" or "vertical"
        this.rect = rect;       // position/size of the scrollbar track
        this.value = value;     // current offset value
        this.min = min;         // minimum offset value
        this.max = max;         // maximum offset value
        this.extent = extent;   // size of the current visible subset

        this.mousedownScreenPoint;    // used for scroll bar dragging tracking; point at which the mousedown first occurred
        this.mousedownValue;          // value at time of scroll drag start
    },

    // return a Rect for the scrollbar handle
    getHandleBounds: function() {
        var sx = (this.isH()) ? this.rect.x : this.rect.y;
        var sw = (this.isH()) ? this.rect.w : this.rect.h;

        var smultiple = this.extent / (this.max + this.extent);
        var asw = smultiple * sw;
        if (asw < this.MINIMUM_HANDLE_SIZE) asw = this.MINIMUM_HANDLE_SIZE;

        sx += (sw - asw) * (this.value / (this.max - this.min));

        return (this.isH()) ? new bespin.editor.Rect(Math.floor(sx), this.rect.y, asw, this.rect.h) : new bespin.editor.Rect(this.rect.x, sx, this.rect.w, asw);
    },

    isH: function() {
        return (!(this.orientation == this.VERTICAL));
    },

    fixValue: function(value) {
        if (value < this.min) value = this.min;
        if (value > this.max) value = this.max;
        return value;
    },

    onmousewheel: function(e) {
        // We need to move the editor unless something else needs to scroll.
        // We need a clean way to define that behaviour, but for now we hack and put in other elements that can scroll
        var command_output = dojo.byId("command_output");
        var target = e.target || e.originalTarget;
        if (command_output && (target.id == "command_output" || bespin.util.contains(command_output, target))) return;

        var wheel = bespin.util.mousewheelevent.wheel(e);
        var axis = bespin.util.mousewheelevent.axis(e);

        if (this.orientation == this.VERTICAL && axis == this.VERTICAL) {
            this.setValue(this.value + (wheel * this.ui.lineHeight));
        } else if (this.orientation == this.HORIZONTAL && axis == this.HORIZONTAL) {
            this.setValue(this.value + (wheel * this.ui.charWidth));
        }
    },

    onmousedown: function(e) {
        var clientY = e.clientY - this.ui.getTopOffset();
        var clientX = e.clientX - this.ui.getLeftOffset();

        var bar = this.getHandleBounds();
        if (bar.contains({ x: clientX, y: clientY })) {
            this.mousedownScreenPoint = (this.isH()) ? e.screenX : e.screenY;
            this.mousedownValue = this.value;
        } else {
            var p = (this.isH()) ? clientX : clientY;
            var b1 = (this.isH()) ? bar.x : bar.y;
            var b2 = (this.isH()) ? bar.x2 : bar.y2;

            if (p < b1) {
                this.setValue(this.value -= this.extent);
            } else if (p > b2) {
                this.setValue(this.value += this.extent);
            }
        }
    },

    onmouseup: function(e) {
        this.mousedownScreenPoint = null;
        this.mousedownValue = null;
        if (this.valueChanged) this.valueChanged(); // make the UI responsive when the user releases the mouse button (in case arrow no longer hovers over scrollbar)
    },

    onmousemove: function(e) {
        if (this.mousedownScreenPoint) {
            var diff = ((this.isH()) ? e.screenX : e.screenY) - this.mousedownScreenPoint;
            var multiplier = diff / (this.isH() ? this.rect.w : this.rect.h);
            this.setValue(this.mousedownValue + Math.floor(((this.max + this.extent) - this.min) * multiplier));
        }
    },

    setValue: function(value) {
        this.value = this.fixValue(value);
        if (this.valueChanged) this.valueChanged();
    }
});

// ** {{{ bespin.editor.Rect }}} **
//
// treat as immutable (pretty please)
dojo.declare("bespin.editor.Rect", null, {
    constructor: function(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.x2 = x + w;
        this.y2 = y + h;
    },

    // inclusive of bounding lines
    contains: function(point) {
        if (!this.x) return false;
        return ((this.x <= point.x) && ((this.x + this.w) >= point.x) && (this.y <= point.y) && ((this.y + this.h) >= point.y));
    }
});

// ** {{{ bespin.editor.SelectionHelper }}} **
dojo.declare("bespin.editor.SelectionHelper", null, {
    constructor: function(editor) {
        this.editor = editor;
    },

    // returns an object with the startCol and endCol of the selection. If the col is -1 on the endPos, the selection goes for the entire line
    // returns undefined if the row has no selection
    getRowSelectionPositions: function(rowIndex) {
        var startCol;
        var endCol;

        var selection = this.editor.getSelection();
        if (!selection) return undefined;
        if ((selection.endPos.row < rowIndex) || (selection.startPos.row > rowIndex)) return undefined;

        startCol = (selection.startPos.row < rowIndex) ? 0 : selection.startPos.col;
        endCol = (selection.endPos.row > rowIndex) ? -1 : selection.endPos.col;

        return { startCol: startCol, endCol: endCol };
    }
});

// ** {{{ bespin.editor.utils }}} **
//
// Mess with positions mainly
dojo.mixin(bespin.editor, { utils: {
    buildArgs: function(oldPos) {
        return { pos: bespin.editor.utils.copyPos(oldPos || bespin.get('editor').getCursorPos()) };
    },

    changePos: function(args, pos) {
        return { pos: bespin.editor.utils.copyPos(oldPos || bespin.get('editor').getCursorPos()) };
    },

    copyPos: function(oldPos) {
        return { row: oldPos.row, col: oldPos.col };
    },

    posEquals: function(pos1, pos2) {
        if (pos1 == pos2) return true;
        if (!pos1 || !pos2) return false;
        return (pos1.col == pos2.col) && (pos1.row == pos2.row);
    },

    diffObjects: function(o1, o2) {
        var diffs = {};

        if (!o1 || !o2) return undefined;

        for (var key in o1) {
            if (o2[key]) {
                if (o1[key] != o2[key]) {
                    diffs[key] = o1[key] + " => " + o2[key];
                }
            } else {
                diffs[key] = "o1: " + key + " = " + o1[key];
            }
        }

        for (var key2 in o2) {
            if (!o1[key2]) {
                diffs[key2] = "o2: " + key2 + " = " + o2[key2];
            }
        }
        return diffs;
    }
}});

// ** {{{ bespin.editor.DefaultEditorKeyListener }}} **
//
// Core key listener to decide which actions to run
dojo.declare("bespin.editor.DefaultEditorKeyListener", null, {
    constructor: function(editor) {
        this.editor = editor;
        this.actions = editor.ui.actions;
        this.skipKeypress = false;

        this.defaultKeyMap = {};

        // Allow for multiple key maps to be defined
        this.keyMap = this.defaultKeyMap;
        this.keyMapDescriptions = {};
    },

    bindKey: function(keyCode, metaKey, ctrlKey, altKey, shiftKey, action, name) {
        this.defaultKeyMap[[keyCode, metaKey, ctrlKey, altKey, shiftKey]] =
            (typeof action == "string") ?
                function() {
                    var toFire = bespin.events.toFire(action);
                    bespin.publish(toFire.name, toFire.args);
                } : dojo.hitch(this.actions, action);

        if (name) this.keyMapDescriptions[[keyCode, metaKey, ctrlKey, altKey, shiftKey]] = name;
    },

    bindKeyString: function(modifiers, keyCode, action, name) {
        var ctrlKey = (modifiers.toUpperCase().indexOf("CTRL") != -1);
        var altKey = (modifiers.toUpperCase().indexOf("ALT") != -1);
        var metaKey = (modifiers.toUpperCase().indexOf("META") != -1) || (modifiers.toUpperCase().indexOf("APPLE") != -1);
        var shiftKey = (modifiers.toUpperCase().indexOf("SHIFT") != -1);

        // Check for the platform specific key type
        // The magic "CMD" means metaKey for Mac (the APPLE or COMMAND key)
        // and ctrlKey for Windows (CONTROL)
        if (modifiers.toUpperCase().indexOf("CMD") != -1) {
            if (bespin.util.isMac()) {
                metaKey = true;
            } else {
                ctrlKey = true;
            }
        }
        return this.bindKey(keyCode, metaKey, ctrlKey, altKey, shiftKey, action, name);
    },

    bindKeyStringSelectable: function(modifiers, keyCode, action, name) {
        this.bindKeyString(modifiers, keyCode, action, name);
        this.bindKeyString("SHIFT " + modifiers, keyCode, action);
    },

    onkeydown: function(e) {
        // handle keys only if editor has the focus!
        if (!this.editor.focus) return;

        var args = { event: e,
                     pos: bespin.editor.utils.copyPos(this.editor.cursorManager.getCursorPosition()) };
        this.skipKeypress = false;
        this.returnValue = false;

        var action = this.keyMap[[e.keyCode, e.metaKey, e.ctrlKey, e.altKey, e.shiftKey]];

        var hasAction = false;

        if (dojo.isFunction(action)) {
            hasAction = true;
            action(args);
            this.lastAction = action;
        }

        // If a special key is pressed OR if an action is assigned to a given key (e.g. TAB or BACKSPACE)
        if (e.metaKey || e.ctrlKey || e.altKey) {
            this.skipKeypress = true;
            this.returnValue = true;
        }

        // stop going, but allow special strokes to get to the browser
        if (hasAction || !bespin.util.keys.passThroughToBrowser(e)) dojo.stopEvent(e);
    },

    onkeypress: function(e) {
        // handle keys only if editor has the focus!
        if (!this.editor.focus) return;

        // This is to get around the Firefox bug that happens the first time of jumping between command line and editor
        // Bug https://bugzilla.mozilla.org/show_bug.cgi?id=478686
        var commandLine = bespin.get('commandLine');
        if (commandLine && e.charCode == 'j'.charCodeAt() && e.ctrlKey) {
            dojo.stopEvent(e);
            return false;
        }
        // -- End of commandLine short cut

        // If key should be skipped, BUT there are some chars like "@|{}[]\" that NEED the ALT- or CTRL-key to be accessable
        // on some platforms and keyboardlayouts (german?). This is not working for "^"
        if ([64 /*@*/, 91/*[*/, 92/*\*/, 93/*]*/, 94/*^*/, 123/*{*/, 124/*|*/, 125/*}*/, 126/*~*/ ].indexOf(e.charCode) != -1) {
            this.skipKeypress = false;
        } else if (this.skipKeypress) {
            if (!bespin.util.keys.passThroughToBrowser(e)) dojo.stopEvent(e);
            return this.returnValue;
        }

        var args = { event: e,
                     pos: bespin.editor.utils.copyPos(this.editor.cursorManager.getCursorPosition()) };
        var actions = this.editor.ui.actions;

        // Only allow ascii through
        if ((e.charCode >= 32) && (e.charCode <= 126) || e.charCode >= 160) {
            args.newchar = String.fromCharCode(e.charCode);
            actions.insertCharacter(args);
        } else { // Allow user to move with the arrow continuously
            var action = this.keyMap[[e.keyCode, e.metaKey, e.ctrlKey, e.altKey, e.shiftKey]];

            if (this.lastAction == action) {
                delete this.lastAction;
            } else if (typeof action == "function") {
               action(args);
            }
        }

        dojo.stopEvent(e);
    }
});

// ** {{{ bespin.editor.UI }}} **
//
// Holds the UI. The editor itself, the syntax highlighter, the actions, and more
dojo.declare("bespin.editor.UI", null, {
    constructor: function(editor) {
        this.editor = editor;
        this.model = this.editor.model;

        var settings = bespin.get("settings");
        this.syntaxModel = bespin.syntax.Resolver.setEngine("simple").getModel();

        this.selectionHelper = new bespin.editor.SelectionHelper(editor);
        this.actions = new bespin.editor.Actions(editor);

        this.rowLengthCache = [];
        this.searchString = null;

        this.toggleCursorFullRepaintCounter = 0; // tracks how many cursor toggles since the last full repaint
        this.toggleCursorFrequency = 250;        // number of milliseconds between cursor blink
        this.toggleCursorAllowed = true;         // is the cursor allowed to toggle? (used by cursorManager.moveCursor)

        // these two canvases are used as buffers for the scrollbar images, which are then composited onto the
        // main code view. we could have saved ourselves some misery by just prerendering slices of the scrollbars and
        // combining them like sane people, but... meh
        this.horizontalScrollCanvas = dojo.create("canvas");
        this.verticalScrollCanvas   = dojo.create("canvas");

        // gutterWidth used to be a constant, but is now dynamically calculated in each paint() invocation. I set it to a silly
        // default value here in case some of the code expects it to be populated before the first paint loop kicks in. the
        // default value ought to eventually become 0
        this.gutterWidth = 54;

        this.LINE_HEIGHT = 23;
        this.GUTTER_INSETS = { top: 0, left: 6, right: 10, bottom: 6 };
        this.LINE_INSETS = { top: 0, left: 5, right: 0, bottom: 6 };
        this.FALLBACK_CHARACTER_WIDTH = 10;
        this.NIB_WIDTH = 15;
        this.NIB_INSETS = { top: Math.floor(this.NIB_WIDTH / 2),
                            left: Math.floor(this.NIB_WIDTH / 2),
                            right: Math.floor(this.NIB_WIDTH / 2),
                            bottom: Math.floor(this.NIB_WIDTH / 2) };
        this.NIB_ARROW_INSETS = { top: 3, left: 3, right: 3, bottom: 5 };

        this.DEBUG_GUTTER_WIDTH = 18;
        this.DEBUG_GUTTER_INSETS = { top: 2, left: 2, right: 2, bottom: 2 };

        //this.lineHeight;        // reserved for when line height is calculated dynamically instead of with a constant; set first time a paint occurs
        //this.charWidth;         // set first time a paint occurs
        //this.visibleRows;       // the number of rows visible in the editor; set each time a paint occurs
        //this.firstVisibleRow;   // first row that is visible in the editor; set each time a paint occurs

        //this.nibup;             // rect
        //this.nibdown;           // rect
        //this.nibleft;           // rect
        //this.nibright;          // rect

        //this.selectMouseDownPos;        // position when the user moused down

        this.xoffset = 0;       // number of pixels to translate the canvas for scrolling
        this.yoffset = 0;

        this.showCursor = true;

        this.overXScrollBar = false;
        this.overYScrollBar = false;
        this.hasFocus = false;

        var source = this.editor.container;
        dojo.connect(source, "mousemove", this, "handleScrollBars");
        dojo.connect(source, "mouseout", this, "handleScrollBars");
        dojo.connect(source, "click", this, "handleScrollBars");
        dojo.connect(source, "mousedown", this, "handleScrollBars");

        dojo.connect(source, "mousedown", this, "mouseDownSelect");
        dojo.connect(source, "mousemove", this, "mouseMoveSelect");
        dojo.connect(source, "mouseup", this, "mouseUpSelect");

        // painting optimization state
        this.lastLineCount = 0;
        this.lastCursorPos = null;
        this.lastxoffset = 0;
        this.lastyoffset = 0;

        this.xscrollbar = new bespin.editor.Scrollbar(this, "horizontal");
        this.xscrollbar.valueChanged = dojo.hitch(this, function() {
            this.xoffset = -this.xscrollbar.value;
            this.editor.paint();
        });
        dojo.connect(window, "mousemove", this.xscrollbar, "onmousemove");
        dojo.connect(window, "mouseup", this.xscrollbar, "onmouseup");
        dojo.connect(window, (!dojo.isMozilla ? "onmousewheel" : "DOMMouseScroll"), this.xscrollbar, "onmousewheel");

        this.yscrollbar = new bespin.editor.Scrollbar(this, "vertical");
        this.yscrollbar.valueChanged = dojo.hitch(this, function() {
            this.yoffset = -this.yscrollbar.value;
            this.editor.paint();
        });

        var scope = editor.opts.actsAsComponent ? editor.canvas : window;
        dojo.connect(scope, "mousemove", this.yscrollbar, "onmousemove");
        dojo.connect(scope, "mouseup", this.yscrollbar, "onmouseup");
        dojo.connect(scope, (!dojo.isMozilla ? "onmousewheel" : "DOMMouseScroll"), this.yscrollbar, "onmousewheel");

        setTimeout(dojo.hitch(this, function() { this.toggleCursor(this); }), this.toggleCursorFrequency);
    },

    // col is -1 if user clicked in gutter; clicking below last line maps to last line
    convertClientPointToCursorPoint: function(pos) {
        var settings = bespin.get("settings");
        var x, y;

        if (pos.y > (this.lineHeight * this.editor.model.getRowCount())) {
            y = this.editor.model.getRowCount() - 1;
        } else {
            var ty = pos.y;
            y = Math.floor(ty / this.lineHeight);
        }

        if (pos.x <= (this.gutterWidth + this.LINE_INSETS.left)) {
            x = -1;
        } else {
            var tx = pos.x - this.gutterWidth - this.LINE_INSETS.left;
            x = Math.floor(tx / this.charWidth);

            // With strictlines turned on, don't select past the end of the line
            if ((settings && settings.isSettingOn('strictlines'))) {
                var maxcol = this.getRowScreenLength(y);

                if (x >= maxcol) {
                    x = this.getRowScreenLength(y);
                }
            }
        }
        return { row: y, col: x };
    },

    mouseDownSelect: function(e) {
        // only select if the editor has the focus!
        if (!this.editor.focus) return;

        var clientY = e.clientY - this.getTopOffset();
        var clientX = e.clientX - this.getLeftOffset();

        if (this.overXScrollBar || this.overYScrollBar) return;

        if (this.editor.debugMode) {
            if (clientX < this.DEBUG_GUTTER_WIDTH) {
                var point = { x: clientX, y: clientY };
                point.y += Math.abs(this.yoffset);
                var p = this.convertClientPointToCursorPoint(point);

                var editSession = bespin.get("editSession");
                if (p && editSession) {
                    bespin.debug.toggleBreakpoint({ project: editSession.project, path: editSession.path, lineNumber: p.row });
                    this.editor.paint(true);
                    return;
                }
            }
        }

        if (e.shiftKey) {
            this.selectMouseDownPos = (this.editor.selection) ? this.editor.selection.startPos : this.editor.getCursorPos();
            this.setSelection(e);
        } else {
            var point = { x: clientX, y: clientY };
            point.x += Math.abs(this.xoffset);
            point.y += Math.abs(this.yoffset);

            if ((this.xscrollbar.rect.contains(point)) || (this.yscrollbar.rect.contains(point))) return;
            this.selectMouseDownPos = this.convertClientPointToCursorPoint(point);
        }
    },

    mouseMoveSelect: function(e) {
        // only select if the editor has the focus!
        if (!this.editor.focus) return;

        this.setSelection(e);
    },

    mouseUpSelect: function(e) {
        // only select if the editor has the focus!
        if (!this.editor.focus) return;

        this.setSelection(e);
        this.selectMouseDownPos = undefined;
    },

    setSelection: function(e) {
        var clientY = e.clientY - this.getTopOffset();
        var clientX = e.clientX - this.getLeftOffset();

        if (!this.selectMouseDownPos) return;

        var down = bespin.editor.utils.copyPos(this.selectMouseDownPos);

        var point = { x: clientX, y: clientY };
        point.x += Math.abs(this.xoffset);
        point.y += Math.abs(this.yoffset);
        var up = this.convertClientPointToCursorPoint(point);

        if (down.col == -1) {
            down.col = 0;
            // clicked in gutter; show appropriate lineMarker message
            var lineMarkers = bespin.get("parser").getLineMarkers();
            var message;
            for (var i = 0; i < lineMarkers.length; i++) {
                if (lineMarkers[i].line === down.row + 1) {
                    message = lineMarkers[i];
                    bespin.publish("message:hint", {
                        msg: 'Syntax ' + message.type +
                             (isFinite(message.line) ? ' at line ' + message.line + ' character ' + (message.character + 1) : ' ') +
                             ': ' + message.reason + '<p>' +
                             (message.evidence && (message.evidence.length > 80 ? message.evidence.slice(0, 77) + '...' : message.evidence).
                                 replace(/&/g, '&amp;').
                                 replace(/</g, '&lt;').
                                 replace(/>/g, '&gt;'))
                    });
                }
            }
        }
        if (up.col == -1) up.col = 0;

        if (!bespin.editor.utils.posEquals(down, up)) {
            this.editor.setSelection({ startPos: down, endPos: up });
        } else {
            if (e.detail == 1) {
                this.editor.setSelection(undefined);
            } else if (e.detail == 2) {
                var row = this.editor.model.rows[down.row];
                var cursorAt = row[down.col];
                if (!cursorAt || cursorAt.charAt(0) == ' ') { // empty space
                    // For now, don't select anything, but think about copying Textmate and grabbing around it
                } else {
                    var startPos = (up = this.editor.model.findBefore(down.row, down.col));

                    var endPos = this.editor.model.findAfter(down.row, down.col);

                    this.editor.setSelection({ startPos: startPos, endPos: endPos });
                }
            } else if (e.detail > 2) {
                // select the line
                this.editor.setSelection({ startPos: { row: down.row, col: 0 }, endPos: { row: down.row + 1, col: 0 } });
            }
        }

        this.editor.cursorManager.moveCursor(up);
        this.editor.paint();
    },

    toggleCursor: function(ui) {
        if (ui.toggleCursorAllowed) {
            ui.showCursor = !ui.showCursor;
        } else {
            ui.toggleCursorAllowed = true;
        }

        if (++this.toggleCursorFullRepaintCounter > 0) {
            this.toggleCursorFullRepaintCounter = 0;
            ui.editor.paint(true);
        } else {
            ui.editor.paint();
        }

        setTimeout(function() { ui.toggleCursor(ui); }, ui.toggleCursorFrequency);
    },

    ensureCursorVisible: function(softEnsure) {
        if ((!this.lineHeight) || (!this.charWidth)) return;    // can't do much without these

        if(bespin.get('settings')) {
            var pageScroll = parseFloat(bespin.get('settings').get('pagescroll')) || 0;
        } else {
            var pageScroll = 0;
        }
        pageScroll = (!softEnsure ? Math.max(0, Math.min(1, pageScroll)) : 0.25);

        var y = this.lineHeight * this.editor.cursorManager.getCursorPosition().row;
        var x = this.charWidth * this.editor.cursorManager.getCursorPosition().col;

        var cheight = this.getHeight();
        var cwidth = this.getWidth() - this.gutterWidth;

        if (Math.abs(this.yoffset) > y) {               // current row before top-most visible row
            this.yoffset = Math.min(-y + cheight * pageScroll, 0);
        } else if ((Math.abs(this.yoffset) + cheight) < (y + this.lineHeight)) {       // current row after bottom-most visible row
            this.yoffset = -((y + this.lineHeight) - cheight * (1 - pageScroll));
            this.yoffset = Math.max(this.yoffset, cheight - this.lineHeight * this.model.getRowCount());
        }

        if (Math.abs(this.xoffset) > x) {               // current col before left-most visible col
            this.xoffset = -x;
        } else if ((Math.abs(this.xoffset) + cwidth) < (x + (this.charWidth * 2))) { // current col after right-most visible col
            this.xoffset = -((x + (this.charWidth * 2)) - cwidth);
        }
    },

    handleFocus: function(e) {
        this.editor.model.clear();
        this.editor.model.insertCharacters({ row: 0, col: 0 }, e.type);
    },

    handleScrollBars: function(e) {
        var clientY = e.clientY - this.getTopOffset();
        var clientX = e.clientX - this.getLeftOffset();

        var oldX = this.overXScrollBar;
        var oldY = this.overYScrollBar;
        var scrolled = false;

        var w = this.editor.container.clientWidth;
        var h = this.editor.container.clientHeight;
        var sx = w - this.NIB_WIDTH - this.NIB_INSETS.right;    // x start of the vert. scroll bar
        var sy = h - this.NIB_WIDTH - this.NIB_INSETS.bottom;   // y start of the hor. scroll bar

        var p = { x: clientX, y:clientY };

        if (e.type == "mousedown") {
            // dispatch to the scrollbars
            if ((this.xscrollbar) && (this.xscrollbar.rect.contains(p))) {
                this.xscrollbar.onmousedown(e);
            } else if ((this.yscrollbar) && (this.yscrollbar.rect.contains(p))) {
                this.yscrollbar.onmousedown(e);
            }
        }

        if (e.type == "mouseout") {
            this.overXScrollBar = false;
            this.overYScrollBar = false;
        }

        if ((e.type == "mousemove") || (e.type == "click")) {
            this.overYScrollBar = p.x > sx;
            this.overXScrollBar = p.y > sy;
        }

        if (e.type == "click") {
            if ((typeof e.button != "undefined") && (e.button == 0)) {
                var button;
                if (this.nibup.contains(p)) {
                    button = "up";
                } else if (this.nibdown.contains(p)) {
                    button = "down";
                } else if (this.nibleft.contains(p)) {
                    button = "left";
                } else if (this.nibright.contains(p)) {
                    button = "right";
                }

                if (button == "up") {
                    this.yoffset += this.lineHeight;
                    scrolled = true;
                } else if (button == "down") {
                    this.yoffset -= this.lineHeight;
                    scrolled = true;
                } else if (button == "left") {
                    this.xoffset += this.charWidth * 2;
                    scrolled = true;
                } else if (button == "right") {
                    this.xoffset -= this.charWidth * 2;
                    scrolled = true;
                }
            }
        }

        if ((oldX != this.overXScrollBar) || (oldY != this.overYScrollBar) || scrolled) this.editor.paint();
    },

    installKeyListener: function(listener) {
        var Key = bespin.util.keys.Key; // alias

        if (this.oldkeydown) dojo.disconnect(this.oldkeydown);
        if (this.oldkeypress) dojo.disconnect(this.oldkeypress);

        this.oldkeydown  = dojo.hitch(listener, "onkeydown");
        this.oldkeypress = dojo.hitch(listener, "onkeypress");

        var scope = this.editor.opts.actsAsComponent ? this.editor.canvas : document;

        dojo.connect(scope, "keydown", this, "oldkeydown");
        dojo.connect(scope, "keypress", this, "oldkeypress");

        // Modifiers, Key, Action

        listener.bindKeyStringSelectable("", Key.LEFT_ARROW, this.actions.moveCursorLeft, "Move Cursor Left");
        listener.bindKeyStringSelectable("", Key.RIGHT_ARROW, this.actions.moveCursorRight, "Move Cursor Right");
        listener.bindKeyStringSelectable("", Key.UP_ARROW, this.actions.moveCursorUp, "Move Cursor Up");
        listener.bindKeyStringSelectable("", Key.DOWN_ARROW, this.actions.moveCursorDown, "Move Cursor Down");

        listener.bindKeyStringSelectable("ALT", Key.LEFT_ARROW, this.actions.moveWordLeft, "Move Word Left");
        listener.bindKeyStringSelectable("ALT", Key.RIGHT_ARROW, this.actions.moveWordRight, "Move Word Right");

        listener.bindKeyStringSelectable("", Key.HOME, this.actions.moveToLineStart, "Move to start of line");
        listener.bindKeyStringSelectable("CMD", Key.LEFT_ARROW, this.actions.moveToLineStart, "Move to start of line");
        listener.bindKeyStringSelectable("", Key.END, this.actions.moveToLineEnd, "Move to end of line");
        listener.bindKeyStringSelectable("CMD", Key.RIGHT_ARROW, this.actions.moveToLineEnd, "Move to end of line");

        listener.bindKeyString("CTRL", Key.K, this.actions.killLine, "Kill entire line");
        listener.bindKeyString("CTRL", Key.L, this.actions.moveCursorRowToCenter, "Move cursor to center of page");

        listener.bindKeyString("", Key.BACKSPACE, this.actions.backspace, "Backspace");
        listener.bindKeyString("CTRL", Key.BACKSPACE, this.actions.deleteWordLeft, "Delete a word to the left");

        listener.bindKeyString("", Key.DELETE, this.actions.deleteKey, "Delete");
        listener.bindKeyString("CTRL", Key.DELETE, this.actions.deleteWordRight, "Delete a word to the right");

        listener.bindKeyString("", Key.ENTER, this.actions.newline, "Insert newline");
        listener.bindKeyString("", Key.TAB, this.actions.insertTab, "Indent / insert tab");
        listener.bindKeyString("SHIFT", Key.TAB, this.actions.unindent, "Unindent");

        // SEARCH / FIND
        listener.bindKeyString("", Key.ESCAPE, this.actions.escape, "Clear fields and dialogs");
        // This is at the moment done by a observe(window) within init.js
        // listener.bindKeyString("CMD", Key.F, this.actions.findSelectInputField, "Show find dialog");
        // listener.bindKeyString("SHIFT CMD", Key.G, this.actions.findPrev, "Find the previous match");
        // listener.bindKeyString("CMD", Key.G, this.actions.findNext, "Go on to the next match");

        listener.bindKeyString("CMD", Key.A, this.actions.selectAll, "Select All");

        // handle key to jump between editor and other windows / commandline
        listener.bindKeyString("ALT", Key.O, this.actions.toggleQuickopen, "Toggle Quickopen");
        listener.bindKeyString("CTRL", Key.J, this.actions.focusCommandline, "Open Commandline");
        listener.bindKeyString("CTRL", Key.M, this.actions.togglePieMenu, "Open Pie Menu");

        listener.bindKeyString("CMD", Key.Z, this.actions.undo, "Undo");
        listener.bindKeyString("SHIFT CMD", Key.Z, this.actions.redo, "Redo");
        listener.bindKeyString("CMD", Key.Y, this.actions.redo, "Redo");

        listener.bindKeyStringSelectable("CMD", Key.UP_ARROW, this.actions.moveToFileTop, "Move to top of file");
        listener.bindKeyStringSelectable("CMD", Key.DOWN_ARROW, this.actions.moveToFileBottom, "Move to bottom of file");
        listener.bindKeyStringSelectable("CMD", Key.HOME, this.actions.moveToFileTop, "Move to top of file");
        listener.bindKeyStringSelectable("CMD", Key.END, this.actions.moveToFileBottom, "Move to bottom of file");

        listener.bindKeyStringSelectable("", Key.PAGE_UP, this.actions.movePageUp, "Move a page up");
        listener.bindKeyStringSelectable("", Key.PAGE_DOWN, this.actions.movePageDown, "Move a page down");

        // Other key bindings can be found in commands themselves.
        // For example, this:
        // listener.bindKeyString("CTRL SHIFT", Key.N, "editor:newfile", "Create a new file");
        // has been moved to the 'newfile' command withKey
        // Also, the clipboard.js handles C, V, and X
    },

    getWidth: function() {
        return parseInt(dojo.style(this.editor.canvas.parentNode, "width"));
    },

    getHeight: function() {
        return parseInt(dojo.style(this.editor.canvas.parentNode, "height"));
    },

    getTopOffset: function() {
        return dojo.coords(this.editor.canvas.parentNode).y || this.editor.canvas.parentNode.offsetTop;
    },

    getLeftOffset: function() {
        return dojo.coords(this.editor.canvas.parentNode).x || this.editor.canvas.parentNode.offsetLeft;
    },

    getCharWidth: function(ctx) {
        if (ctx.measureText) {
            return ctx.measureText("M").width;
        } else {
            return this.FALLBACK_CHARACTER_WIDTH;
        }
    },

    getLineHeight: function(ctx) {
        var lh = -1;
        if (ctx.measureText) {
            var t = ctx.measureText("M");
            if (t.ascent) lh = Math.floor(t.ascent * 2.8);
        }
        if (lh == -1) lh = this.LINE_HEIGHT;
        return lh;
    },

    // ** {{{ paint }}} **
    //
    // This is where the editor is painted from head to toe. The optional "fullRefresh" argument triggers a complete repaint
    // of the editor canvas; otherwise, pitiful tricks are used to draw as little as possible.

    paint: function(ctx, fullRefresh) {
        // DECLARE VARIABLES

        // these are convenience references so we don't have to type so much
        var ed = this.editor;
        var c = dojo.byId(ed.canvas);
        var theme = ed.theme;

        // these are commonly used throughout the rendering process so are defined up here to make it clear they are shared
        var x, y;
        var cy;
        var currentLine;
        var lastLineToRender;

        var Rect = bespin.editor.Rect;

        // SETUP STATE

        var refreshCanvas = fullRefresh;        // if the user explicitly requests a full refresh, give it to 'em

        if (!refreshCanvas) refreshCanvas = (this.selectMouseDownPos);

        if (!refreshCanvas) refreshCanvas = (this.lastLineCount != ed.model.getRowCount());  // if the line count has changed, full refresh

        this.lastLineCount = ed.model.getRowCount();        // save the number of lines for the next time paint

        // get the line and character metrics; calculated for each paint because this value can change at run-time
        ctx.font = theme.editorTextFont;
        this.charWidth = this.getCharWidth(ctx);
        this.lineHeight = this.getLineHeight(ctx);

        // cwidth and cheight are set to the dimensions of the parent node of the canvas element; we'll resize the canvas element
        // itself a little bit later in this function
        var cwidth = this.getWidth();
        var cheight = this.getHeight();

        // adjust the scrolling offsets if necessary; negative values are good, indicate scrolling down or to the right (we look for overflows on these later on)
        // positive values are bad; they indicate scrolling up past the first line or to the left past the first column
        if (this.xoffset > 0) this.xoffset = 0;
        if (this.yoffset > 0) this.yoffset = 0;

        // only paint those lines that can be visible
        this.visibleRows = Math.ceil(cheight / this.lineHeight);
        this.firstVisibleRow = Math.floor(Math.abs(this.yoffset / this.lineHeight));
        lastLineToRender = this.firstVisibleRow + this.visibleRows;
        if (lastLineToRender > (ed.model.getRowCount() - 1)) lastLineToRender = ed.model.getRowCount() - 1;

        var virtualheight = this.lineHeight * ed.model.getRowCount();    // full height based on content

        // virtual width *should* be based on every line in the model; however, with the introduction of tab support, calculating
        // the width of a line is now expensive, so for the moment we will only calculate the width of the visible rows
        //var virtualwidth = this.charWidth * (Math.max(this.getMaxCols(), ed.cursorManager.getCursorPosition().col) + 2);       // full width based on content plus a little padding
        var virtualwidth = this.charWidth * (Math.max(this.getMaxCols(this.firstVisibleRow, lastLineToRender), ed.cursorManager.getCursorPosition().col) + 2);

        // calculate the gutter width; for now, we'll make it fun and dynamic based on the lines visible in the editor.
        this.gutterWidth = this.GUTTER_INSETS.left + this.GUTTER_INSETS.right;  // first, add the padding space
        this.gutterWidth += ("" + lastLineToRender).length * this.charWidth;    // make it wide enough to display biggest line number visible
        if (this.editor.debugMode) this.gutterWidth += this.DEBUG_GUTTER_WIDTH;

        // these next two blocks make sure we don't scroll too far in either the x or y axis
        if (this.xoffset < 0) {
            if ((Math.abs(this.xoffset)) > (virtualwidth - (cwidth - this.gutterWidth))) this.xoffset = (cwidth - this.gutterWidth) - virtualwidth;
        }
        if (this.yoffset < 0) {
            if ((Math.abs(this.yoffset)) > (virtualheight - cheight)) this.yoffset = cheight - virtualheight;
        }

        // if the current scrolled positions are different than the scroll positions we used for the last paint, refresh the entire canvas
        if ((this.xoffset != this.lastxoffset) || (this.yoffset != this.lastyoffset)) {
            refreshCanvas = true;
            this.lastxoffset = this.xoffset;
            this.lastyoffset = this.yoffset;
        }

        // these are boolean values indicating whether the x and y (i.e., horizontal or vertical) scroll bars are visible
        var xscroll = ((cwidth - this.gutterWidth) < virtualwidth);
        var yscroll = (cheight < virtualheight);

        // the scroll bars are rendered off-screen into their own canvas instances; these values are used in two ways as part of
        // this process:
        //   1. the x position of the vertical scroll bar image when painted onto the canvas and the y position of the horizontal
        //      scroll bar image (both images span 100% of the width/height in the other dimension)
        //   2. the amount * -1 to translate the off-screen canvases used by the scrollbars; this lets us flip back to rendering
        //      the scroll bars directly on the canvas with relative ease (by omitted the translations and passing in the main context
        //      reference instead of the off-screen canvas context)
        var verticalx = cwidth - this.NIB_WIDTH - this.NIB_INSETS.right - 2;
        var horizontaly = cheight - this.NIB_WIDTH - this.NIB_INSETS.bottom - 2;

        // these are boolean values that indicate whether special little "nibs" should be displayed indicating more content to the
        // left, right, top, or bottom
        var showLeftScrollNib = (xscroll && (this.xoffset != 0));
        var showRightScrollNib = (xscroll && (this.xoffset > ((cwidth - this.gutterWidth) - virtualwidth)));
        var showUpScrollNib = (yscroll && (this.yoffset != 0));
        var showDownScrollNib = (yscroll && (this.yoffset > (cheight - virtualheight)));

        // check and see if the canvas is the same size as its immediate parent in the DOM; if not, resize the canvas
        if (((dojo.attr(c, "width")) != cwidth) || (dojo.attr(c, "height") != cheight)) {
            refreshCanvas = true;   // if the canvas changes size, we'll need a full repaint
            dojo.attr(c, { width: cwidth, height: cheight });
        }

        // get debug metadata
        var breakpoints = {};

        if (this.editor.debugMode && bespin.get("editSession")) {
            var points = bespin.debug.getBreakpoints(bespin.get('editSession').project, bespin.get('editSession').path);
            dojo.forEach(points, function(point) {
                breakpoints[point.lineNumber] = point;
            });
            delete points;
        }

        // IF YOU WANT TO FORCE A COMPLETE REPAINT OF THE CANVAS ON EVERY PAINT, UNCOMMENT THE FOLLOWING LINE:
        // refreshCanvas = true;

        // START RENDERING

        // if we're not doing a full repaint, work out which rows are "dirty" and need to be repainted
        if (!refreshCanvas) {
            var dirty = ed.model.getDirtyRows();

            // if the cursor has changed rows since the last paint, consider the previous row dirty
            if ((this.lastCursorPos) && (this.lastCursorPos.row != ed.cursorManager.getCursorPosition().row)) dirty[this.lastCursorPos.row] = true;

            // we always repaint the current line
            dirty[ed.cursorManager.getCursorPosition().row] = true;
        }

        // save this state for the next paint attempt (see above for usage)
        this.lastCursorPos = bespin.editor.utils.copyPos(ed.cursorManager.getCursorPosition());

        // if we're doing a full repaint...
        if (refreshCanvas) {
            // ...paint the background color over the whole canvas and...
            ctx.fillStyle = theme.backgroundStyle;
            ctx.fillRect(0, 0, c.width, c.height);

            // ...paint the gutter
            ctx.fillStyle = theme.gutterStyle;
            ctx.fillRect(0, 0, this.gutterWidth, c.height);
        }

        // translate the canvas based on the scrollbar position; for now, just translate the vertical axis
        ctx.save(); // take snapshot of current context state so we can roll back later on

        // the Math.round(this.yoffset) makes the painting nice and not to go over 2 pixels
        // see for more informations:
        //  - https://developer.mozilla.org/en/Canvas_tutorial/Applying_styles_and_colors, section "Line styles"
        //  - https://developer.mozilla.org/@api/deki/files/601/=Canvas-grid.png
        ctx.translate(0, Math.round(this.yoffset));

        // paint the line numbers
        if (refreshCanvas) {
            //line markers first
            if (bespin.get("parser")) {
                var lineMarkers = bespin.get("parser").getLineMarkers();
                for (var i = 0; i < lineMarkers.length; i++) {
                    if (lineMarkers[i].line >= this.firstVisibleRow && lineMarkers[i].line <= lastLineToRender + 1) {
                        y = this.lineHeight * (lineMarkers[i].line - 1);
                        cy = y + (this.lineHeight - this.LINE_INSETS.bottom);
                        if (lineMarkers[i].type === "error") {
                            ctx.fillStyle = this.editor.theme.lineMarkerErrorColor;
                        } else {
                            ctx.fillStyle = this.editor.theme.lineMarkerWarningColor;
                        }
                        ctx.fillRect(0, y, this.gutterWidth, this.lineHeight);
                    }
                 }
            }
            y = (this.lineHeight * this.firstVisibleRow);
            for (currentLine = this.firstVisibleRow; currentLine <= lastLineToRender; currentLine++) {
                x = 0;

                // if we're in debug mode...
                if (this.editor.debugMode) {
                    // ...check if the current line has a breakpoint
                    if (breakpoints[currentLine]) {
                        var bpx = x + this.DEBUG_GUTTER_INSETS.left;
                        var bpy = y + this.DEBUG_GUTTER_INSETS.top;
                        var bpw = this.DEBUG_GUTTER_WIDTH - this.DEBUG_GUTTER_INSETS.left - this.DEBUG_GUTTER_INSETS.right;
                        var bph = this.lineHeight - this.DEBUG_GUTTER_INSETS.top - this.DEBUG_GUTTER_INSETS.bottom;

                        var bpmidpointx = bpx + parseInt(bpw / 2);
                        var bpmidpointy = bpy + parseInt(bph / 2);

                        ctx.strokeStyle = "rgb(128, 0, 0)";
                        ctx.fillStyle = "rgb(255, 102, 102)";
                        ctx.beginPath();
                        ctx.arc(bpmidpointx, bpmidpointy, bpw / 2, 0, Math.PI*2, true);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                    }

                    // ...and push the line number to the right, leaving a space for breakpoint stuff
                    x += this.DEBUG_GUTTER_WIDTH;
                }

                x += this.GUTTER_INSETS.left;

                cy = y + (this.lineHeight - this.LINE_INSETS.bottom);

                ctx.fillStyle = theme.lineNumberColor;
                ctx.font = this.editor.theme.lineNumberFont;
                ctx.fillText(currentLine + 1, x, cy);

                y += this.lineHeight;
            }
         }

        // and now we're ready to translate the horizontal axis; while we're at it, we'll setup a clip to prevent any drawing outside
        // of code editor region itself (protecting the gutter). this clip is important to prevent text from bleeding into the gutter.
        ctx.save();
        ctx.beginPath();
        ctx.rect(this.gutterWidth, -this.yoffset, cwidth - this.gutterWidth, cheight);
        ctx.closePath();
        ctx.translate(this.xoffset, 0);
        ctx.clip();

        // calculate the first and last visible columns on the screen; these values will be used to try and avoid painting text
        // that the user can't actually see
        var firstColumn = Math.floor(Math.abs(this.xoffset / this.charWidth));
        var lastColumn = firstColumn + (Math.ceil((cwidth - this.gutterWidth) / this.charWidth));

        // create the state necessary to render each line of text
        y = (this.lineHeight * this.firstVisibleRow);
        var cc; // the starting column of the current region in the region render loop below
        var ce; // the ending column in the same loop
        var ri; // counter variable used for the same loop
        var regionlen;  // length of the text in the region; used in the same loop
        var tx, tw, tsel;
        var settings = bespin.get("settings");
        var searchStringLength = (this.searchString ? this.searchString.length : -1);

        // paint each line
        for (currentLine = this.firstVisibleRow; currentLine <= lastLineToRender; currentLine++) {
            x = this.gutterWidth;

            // if we aren't repainting the entire canvas...
            if (!refreshCanvas) {
                // ...don't bother painting the line unless it is "dirty" (see above for dirty checking)
                if (!dirty[currentLine]) {
                    y += this.lineHeight;
                    continue;
                }

                // setup a clip for the current line only; this makes drawing just that piece of the scrollbar easy
                ctx.save(); // this is restore()'d in another if (!refreshCanvas) block at the end of the loop
                ctx.beginPath();
                ctx.rect(x + (Math.abs(this.xoffset)), y, cwidth, this.lineHeight);
                ctx.closePath();
                ctx.clip();

                if ((currentLine % 2) == 1) { // only repaint the line background if the zebra stripe won't be painted into it
                    ctx.fillStyle = theme.backgroundStyle;
                    ctx.fillRect(x + (Math.abs(this.xoffset)), y, cwidth, this.lineHeight);
                }
            }

            // if highlight line is on, paint the highlight color
            if ((settings && settings.isSettingOn('highlightline')) &&
                    (currentLine == ed.cursorManager.getCursorPosition().row)) {
                ctx.fillStyle = theme.highlightCurrentLineColor;
                ctx.fillRect(x + (Math.abs(this.xoffset)), y, cwidth, this.lineHeight);
            // if not on highlight, see if we need to paint the zebra
            } else if ((currentLine % 2) == 0) {
                ctx.fillStyle = theme.zebraStripeColor;
                ctx.fillRect(x + (Math.abs(this.xoffset)), y, cwidth, this.lineHeight);
            }

            x += this.LINE_INSETS.left;
            cy = y + (this.lineHeight - this.LINE_INSETS.bottom);

            // paint the selection bar if the line has selections
            var selections = this.selectionHelper.getRowSelectionPositions(currentLine);
            if (selections) {
                tx = x + (selections.startCol * this.charWidth);
                tw = (selections.endCol == -1) ? (lastColumn - firstColumn) * this.charWidth : (selections.endCol - selections.startCol) * this.charWidth;
                ctx.fillStyle = theme.editorSelectedTextBackground;
                ctx.fillRect(tx, y, tw, this.lineHeight);
            }

            var lineMetadata = this.model.getRowMetadata(currentLine);
            var lineText = lineMetadata.lineText;
            var searchIndices = lineMetadata.searchIndices;

            // the following two chunks of code do the same thing; only one should be uncommented at a time

            // CHUNK 1: this code just renders the line with white text and is for testing
//            ctx.fillStyle = "white";
//            ctx.fillText(this.editor.model.getRowArray(currentLine).join(""), x, cy);

            // CHUNK 2: this code uses the SyntaxModel API to render the line
            // syntax highlighting
            var lineInfo = this.syntaxModel.getSyntaxStylesPerLine(lineText, currentLine, this.editor.language);

            // Define a fill that is aware of the readonly attribute and fades out if applied
            var readOnlyAwareFille = ed.readonly ? function(text, x, y) {
                ctx.globalAlpha = 0.3;
                ctx.fillText(text, x, y);
                ctx.globalAlpha = 1.0;
            } : function(text, x, y) {
                ctx.fillText(text, x, y);
            };

            for (ri = 0; ri < lineInfo.regions.length; ri++) {
                var styleInfo = lineInfo.regions[ri];

                for (var style in styleInfo) {
                    if (!styleInfo.hasOwnProperty(style)) continue;

                    var thisLine = "";

                    var styleArray = styleInfo[style];
                    var currentColumn = 0; // current column, inclusive
                    for (var si = 0; si < styleArray.length; si++) {
                        var range = styleArray[si];

                        for ( ; currentColumn < range.start; currentColumn++) thisLine += " ";
                        thisLine += lineInfo.text.substring(range.start, range.stop);
                        currentColumn = range.stop;
                    }

                    ctx.fillStyle = this.editor.theme[style] || "white";
                    ctx.font = this.editor.theme.editorTextFont;
                    readOnlyAwareFille(thisLine, x, cy);
                }
            }

            // highlight search string
            if (searchIndices) {
                // in some cases the selections are -1 => set them to a more "realistic" number
                if (selections) {
                    tsel = { startCol: 0, endCol: lineText.length };
                    if (selections.startCol != -1) tsel.startCol = selections.startCol;
                    if (selections.endCol   != -1) tsel.endCol = selections.endCol;
                } else {
                    tsel = false;
                }

                for (var i = 0; i < searchIndices.length; i++) {
                    var index = ed.cursorManager.getCursorPosition({col: searchIndices[i], row: currentLine}).col;
                    tx = x + index * this.charWidth;

                    // highlight the area
                    ctx.fillStyle = this.editor.theme.searchHighlight;
                    ctx.fillRect(tx, y, searchStringLength * this.charWidth, this.lineHeight);

                    // figure out, whether the selection is in this area. If so, colour it different
                    if (tsel) {
                        var indexStart = index;
                        var indexEnd = index + searchStringLength;

                        if (tsel.startCol < indexEnd && tsel.endCol > indexStart) {
                            indexStart = Math.max(indexStart, tsel.startCol);
                            indexEnd = Math.min(indexEnd, tsel.endCol);

                            ctx.fillStyle = this.editor.theme.searchHighlightSelected;
                            ctx.fillRect(x + indexStart * this.charWidth, y, (indexEnd - indexStart) * this.charWidth, this.lineHeight);
                        }
                    }

                    // print the overpainted text again
                    ctx.fillStyle = this.editor.theme.editorTextColor || "white";
                    ctx.fillText(lineText.substring(index, index + searchStringLength), tx, cy);
                }

            }

            // paint tab information, if applicable and the information should be displayed
            if (settings && (settings.isSettingOn("tabarrow") || settings.isSettingOn("tabshowspace"))) {
                if (lineMetadata.tabExpansions.length > 0) {
                    for (var i = 0; i < lineMetadata.tabExpansions.length; i++) {
                        var expansion = lineMetadata.tabExpansions[i];

                        // the starting x position of the tab character; the existing value of y is fine
                        var lx = x + (expansion.start * this.charWidth);

                        // check if the user wants us to highlight tabs; useful if you need to mix tabs and spaces
                        var showTabSpace = settings && settings.isSettingOn("tabshowspace");
                        if (showTabSpace) {
                            var sw = (expansion.end - expansion.start) * this.charWidth;
                            ctx.fillStyle = this.editor.theme["tabSpace"] || "white";
                            ctx.fillRect(lx, y, sw, this.lineHeight);
                        }

                        var showTabNib = settings && settings.isSettingOn("tabarrow");
                        if (showTabNib) {
                            // the center of the current character position's bounding rectangle
                            var cy = y + (this.lineHeight / 2);
                            var cx = lx + (this.charWidth / 2);

                            // the width and height of the triangle to draw representing the tab
                            var tw = 4;
                            var th = 6;

                            // the origin of the triangle
                            var tx = parseInt(cx - (tw / 2));
                            var ty = parseInt(cy - (th / 2));

                            // draw the rectangle
                            ctx.beginPath();
                            ctx.fillStyle = this.editor.theme["plain"] || "white";
                            ctx.moveTo(tx, ty);
                            ctx.lineTo(tx, ty + th);
                            ctx.lineTo(tx + tw, ty + parseInt(th / 2));
                            ctx.closePath();
                            ctx.fill();
                        }
                    }
                }
            }


            if (!refreshCanvas) {
                ctx.drawImage(this.verticalScrollCanvas, verticalx + Math.abs(this.xoffset), Math.abs(this.yoffset));
                ctx.restore();
            }

            y += this.lineHeight;
        }


        // paint the cursor
        if (this.editor.focus) {
            if (this.showCursor) {
                if (ed.theme.cursorType == "underline") {
                    x = this.gutterWidth + this.LINE_INSETS.left + ed.cursorManager.getCursorPosition().col * this.charWidth;
                    y = (ed.getCursorPos().row * this.lineHeight) + (this.lineHeight - 5);
                    ctx.fillStyle = ed.theme.cursorStyle;
                    ctx.fillRect(x, y, this.charWidth, 3);
                } else {
                    x = this.gutterWidth + this.LINE_INSETS.left + ed.cursorManager.getCursorPosition().col * this.charWidth;
                    y = (ed.cursorManager.getCursorPosition().row * this.lineHeight);
                    ctx.fillStyle = ed.theme.cursorStyle;
                    ctx.fillRect(x, y, 1, this.lineHeight);
                }
            }
        } else {
            x = this.gutterWidth + this.LINE_INSETS.left + ed.cursorManager.getCursorPosition().col * this.charWidth;
            y = (ed.cursorManager.getCursorPosition().row * this.lineHeight);

            ctx.fillStyle = ed.theme.unfocusedCursorFillStyle;
            ctx.strokeStyle = ed.theme.unfocusedCursorStrokeStyle;
            ctx.fillRect(x, y, this.charWidth, this.lineHeight);
            ctx.strokeRect(x, y, this.charWidth, this.lineHeight);
        }

        // scroll bars - x axis
        ctx.restore();

        // scrollbars - y axis
        ctx.restore();

        // paint scroll bars unless we don't need to :-)
        if (!refreshCanvas) return;

        // temporary disable of scrollbars
        //if (this.xscrollbar.rect) return;

        if (this.horizontalScrollCanvas.width != cwidth) this.horizontalScrollCanvas.width = cwidth;
        if (this.horizontalScrollCanvas.height != this.NIB_WIDTH + 4) this.horizontalScrollCanvas.height = this.NIB_WIDTH + 4;

        if (this.verticalScrollCanvas.height != cheight) this.verticalScrollCanvas.height = cheight;
        if (this.verticalScrollCanvas.width != this.NIB_WIDTH + 4) this.verticalScrollCanvas.width = this.NIB_WIDTH + 4;

        var hctx = this.horizontalScrollCanvas.getContext("2d");
        hctx.clearRect(0, 0, this.horizontalScrollCanvas.width, this.horizontalScrollCanvas.height);
        hctx.save();

        var vctx = this.verticalScrollCanvas.getContext("2d");
        vctx.clearRect(0, 0, this.verticalScrollCanvas.width, this.verticalScrollCanvas.height);
        vctx.save();

        var ythemes = (this.overYScrollBar) || (this.yscrollbar.mousedownValue != null) ?
                      { n: ed.theme.fullNibStyle, a: ed.theme.fullNibArrowStyle, s: ed.theme.fullNibStrokeStyle } :
                      { n: ed.theme.partialNibStyle, a: ed.theme.partialNibArrowStyle, s: ed.theme.partialNibStrokeStyle };
        var xthemes = (this.overXScrollBar) || (this.xscrollbar.mousedownValue != null) ?
                      { n: ed.theme.fullNibStyle, a: ed.theme.fullNibArrowStyle, s: ed.theme.fullNibStrokeStyle } :
                      { n: ed.theme.partialNibStyle, a: ed.theme.partialNibArrowStyle, s: ed.theme.partialNibStrokeStyle };

        var midpoint = Math.floor(this.NIB_WIDTH / 2);

        this.nibup = new Rect(cwidth - this.NIB_INSETS.right - this.NIB_WIDTH,
                this.NIB_INSETS.top, this.NIB_WIDTH, this.NIB_WIDTH);

        this.nibdown = new Rect(cwidth - this.NIB_INSETS.right - this.NIB_WIDTH,
                cheight - (this.NIB_WIDTH * 2) - (this.NIB_INSETS.bottom * 2),
                this.NIB_INSETS.top,
                this.NIB_WIDTH, this.NIB_WIDTH);

        this.nibleft = new Rect(this.gutterWidth + this.NIB_INSETS.left, cheight - this.NIB_INSETS.bottom - this.NIB_WIDTH,
                this.NIB_WIDTH, this.NIB_WIDTH);

        this.nibright = new Rect(cwidth - (this.NIB_INSETS.right * 2) - (this.NIB_WIDTH * 2),
                cheight - this.NIB_INSETS.bottom - this.NIB_WIDTH,
                this.NIB_WIDTH, this.NIB_WIDTH);

        vctx.translate(-verticalx, 0);
        hctx.translate(0, -horizontaly);

        if (xscroll && ((this.overXScrollBar) || (this.xscrollbar.mousedownValue != null))) {
            hctx.save();

            hctx.beginPath();
            hctx.rect(this.nibleft.x + midpoint + 2, 0, this.nibright.x - this.nibleft.x - 1, cheight); // y points don't matter
            hctx.closePath();
            hctx.clip();

            hctx.fillStyle = ed.theme.scrollTrackFillStyle;
            hctx.fillRect(this.nibleft.x, this.nibleft.y - 1, this.nibright.x2 - this.nibleft.x, this.nibleft.h + 1);

            hctx.strokeStyle = ed.theme.scrollTrackStrokeStyle;
            hctx.strokeRect(this.nibleft.x, this.nibleft.y - 1, this.nibright.x2 - this.nibleft.x, this.nibleft.h + 1);

            hctx.restore();
        }

        if (yscroll && ((this.overYScrollBar) || (this.yscrollbar.mousedownValue != null))) {
            vctx.save();

            vctx.beginPath();
            vctx.rect(0, this.nibup.y + midpoint + 2, cwidth, this.nibdown.y - this.nibup.y - 1); // x points don't matter
            vctx.closePath();
            vctx.clip();

            vctx.fillStyle = ed.theme.scrollTrackFillStyle;
            vctx.fillRect(this.nibup.x - 1, this.nibup.y, this.nibup.w + 1, this.nibdown.y2 - this.nibup.y);

            vctx.strokeStyle = ed.theme.scrollTrackStrokeStyle;
            vctx.strokeRect(this.nibup.x - 1, this.nibup.y, this.nibup.w + 1, this.nibdown.y2 - this.nibup.y);

            vctx.restore();
        }

        if (yscroll) {
            // up arrow
            if ((showUpScrollNib) || (this.overYScrollBar) || (this.yscrollbar.mousedownValue != null)) {
                vctx.save();
                vctx.translate(this.nibup.x + midpoint, this.nibup.y + midpoint);
                this.paintNib(vctx, ythemes.n, ythemes.a, ythemes.s);
                vctx.restore();
            }

            // down arrow
            if ((showDownScrollNib) || (this.overYScrollBar) || (this.yscrollbar.mousedownValue != null)) {
                vctx.save();
                vctx.translate(this.nibdown.x + midpoint, this.nibdown.y + midpoint);
                vctx.rotate(Math.PI);
                this.paintNib(vctx, ythemes.n, ythemes.a, ythemes.s);
                vctx.restore();
            }
        }

        if (xscroll) {
            // left arrow
            if ((showLeftScrollNib) || (this.overXScrollBar) || (this.xscrollbar.mousedownValue != null)) {
                hctx.save();
                hctx.translate(this.nibleft.x + midpoint, this.nibleft.y + midpoint);
                hctx.rotate(Math.PI * 1.5);
                this.paintNib(hctx, xthemes.n, xthemes.a, xthemes.s);
                hctx.restore();
            }

            // right arrow
            if ((showRightScrollNib) || (this.overXScrollBar) || (this.xscrollbar.mousedownValue != null)) {
                hctx.save();
                hctx.translate(this.nibright.x + midpoint, this.nibright.y + midpoint);
                hctx.rotate(Math.PI * 0.5);
                this.paintNib(hctx, xthemes.n, xthemes.a, xthemes.s);
                hctx.restore();
            }
        }

        // the bar
        var sx = this.nibleft.x2 + 4;
        var sw = this.nibright.x - this.nibleft.x2 - 9;
        this.xscrollbar.rect = new Rect(sx, this.nibleft.y - 1, sw, this.nibleft.h + 1);
        this.xscrollbar.value = -this.xoffset;
        this.xscrollbar.min = 0;
        this.xscrollbar.max = virtualwidth - (cwidth - this.gutterWidth);
        this.xscrollbar.extent = cwidth - this.gutterWidth;

        if (xscroll) {
            var fullonxbar = (((this.overXScrollBar) && (virtualwidth > cwidth)) || ((this.xscrollbar) && (this.xscrollbar.mousedownValue != null)));
            if (!fullonxbar) hctx.globalAlpha = 0.3;
            this.paintScrollbar(hctx, this.xscrollbar);
            hctx.globalAlpha = 1.0;
        }

        var sy = this.nibup.y2 + 4;
        var sh = this.nibdown.y - this.nibup.y2 - 9;
        this.yscrollbar.rect = new Rect(this.nibup.x - 1, sy, this.nibup.w + 1, sh);
        this.yscrollbar.value = -this.yoffset;
        this.yscrollbar.min = 0;
        this.yscrollbar.max = virtualheight - cheight;
        this.yscrollbar.extent = cheight;

        if (yscroll) {
            var fullonybar = ((this.overYScrollBar) && (virtualheight > cheight)) || ((this.yscrollbar) && (this.yscrollbar.mousedownValue != null));
            if (!fullonybar) vctx.globalAlpha = 0.3;
            this.paintScrollbar(vctx, this.yscrollbar);
            vctx.globalAlpha = 1;
        }

        // composite the scrollbars
        ctx.drawImage(this.verticalScrollCanvas, verticalx, 0);
        ctx.drawImage(this.horizontalScrollCanvas, 0, horizontaly);
        hctx.restore();
        vctx.restore();

        // clear the unusued nibs
        if (!showUpScrollNib) this.nibup = new Rect();
        if (!showDownScrollNib) this.nibdown = new Rect();
        if (!showLeftScrollNib) this.nibleft = new Rect();
        if (!showRightScrollNib) this.nibright = new Rect();
    },

    paintScrollbar: function(ctx, scrollbar) {
        var bar = scrollbar.getHandleBounds();
        var alpha = (ctx.globalAlpha) ? ctx.globalAlpha : 1;

        if (!scrollbar.isH()) {
            ctx.save();     // restored in another if (!scrollbar.isH()) block at end of function
            ctx.translate(bar.x + Math.floor(bar.w / 2), bar.y + Math.floor(bar.h / 2));
            ctx.rotate(Math.PI * 1.5);
            ctx.translate(-(bar.x + Math.floor(bar.w / 2)), -(bar.y + Math.floor(bar.h / 2)));

            // if we're vertical, the bar needs to be re-worked a bit
            bar = new bespin.editor.Rect(bar.x - Math.floor(bar.h / 2) + Math.floor(bar.w / 2),
                    bar.y + Math.floor(bar.h / 2) - Math.floor(bar.w / 2), bar.h, bar.w);
        }

        var halfheight = bar.h / 2;

        ctx.beginPath();
        ctx.arc(bar.x + halfheight, bar.y + halfheight, halfheight, Math.PI / 2, 3 * (Math.PI / 2), false);
        ctx.arc(bar.x2 - halfheight, bar.y + halfheight, halfheight, 3 * (Math.PI / 2), Math.PI / 2, false);
        ctx.lineTo(bar.x + halfheight, bar.y + bar.h);
        ctx.closePath();

        var gradient = ctx.createLinearGradient(bar.x, bar.y, bar.x, bar.y + bar.h);
        gradient.addColorStop(0, this.editor.theme.scrollBarFillGradientTopStart.replace(/%a/, alpha));
        gradient.addColorStop(0.4, this.editor.theme.scrollBarFillGradientTopStop.replace(/%a/, alpha));
        gradient.addColorStop(0.41, this.editor.theme.scrollBarFillStyle.replace(/%a/, alpha));
        gradient.addColorStop(0.8, this.editor.theme.scrollBarFillGradientBottomStart.replace(/%a/, alpha));
        gradient.addColorStop(1, this.editor.theme.scrollBarFillGradientBottomStop.replace(/%a/, alpha));
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.save();
        ctx.clip();

        ctx.fillStyle = this.editor.theme.scrollBarFillStyle.replace(/%a/, alpha);
        ctx.beginPath();
        ctx.moveTo(bar.x + (halfheight * 0.4), bar.y + (halfheight * 0.6));
        ctx.lineTo(bar.x + (halfheight * 0.9), bar.y + (bar.h * 0.4));
        ctx.lineTo(bar.x, bar.y + (bar.h * 0.4));
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bar.x + bar.w - (halfheight * 0.4), bar.y + (halfheight * 0.6));
        ctx.lineTo(bar.x + bar.w - (halfheight * 0.9), bar.y + (bar.h * 0.4));
        ctx.lineTo(bar.x + bar.w, bar.y + (bar.h * 0.4));
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        ctx.beginPath();
        ctx.arc(bar.x + halfheight, bar.y + halfheight, halfheight, Math.PI / 2, 3 * (Math.PI / 2), false);
        ctx.arc(bar.x2 - halfheight, bar.y + halfheight, halfheight, 3 * (Math.PI / 2), Math.PI / 2, false);
        ctx.lineTo(bar.x + halfheight, bar.y + bar.h);
        ctx.closePath();

        ctx.strokeStyle = this.editor.theme.scrollTrackStrokeStyle;
        ctx.stroke();

        if (!scrollbar.isH()) {
            ctx.restore();
        }
    },

    paintNib: function(ctx, nibStyle, arrowStyle, strokeStyle) {
        var midpoint = Math.floor(this.NIB_WIDTH / 2);

        ctx.fillStyle = nibStyle;
        ctx.beginPath();
        ctx.arc(0, 0, Math.floor(this.NIB_WIDTH / 2), 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = strokeStyle;
        ctx.stroke();

        ctx.fillStyle = arrowStyle;
        ctx.beginPath();
        ctx.moveTo(0, -midpoint + this.NIB_ARROW_INSETS.top);
        ctx.lineTo(-midpoint + this.NIB_ARROW_INSETS.left, midpoint - this.NIB_ARROW_INSETS.bottom);
        ctx.lineTo(midpoint - this.NIB_ARROW_INSETS.right, midpoint - this.NIB_ARROW_INSETS.bottom);
        ctx.closePath();
        ctx.fill();
    },

    // returns metadata bout the a string that represents the row; converts tab characters to spaces
    getRowString: function(row) {
        return this.model.getRowMetadata(row).lineText;
    },

    getRowScreenLength: function(row) {
        return this.getRowString(row).length;
    },

    // returns the maximum number of display columns across all rows
    getMaxCols: function(firstRow, lastRow) {
        var cols = 0;
        for (var i = firstRow; i <= lastRow; i++) {
            cols = Math.max(cols, this.getRowScreenLength(i));
        }
        return cols;
    },

    setSearchString: function(str) {
        if (str && str != '') {
            this.searchString = str;
        } else {
            delete this.searchString;
        }

        this.model.searchStringChanged(this.searchString);

        this.editor.paint(true);
    }
});

// ** {{{ bespin.editor.API }}} **
//
// The root object. This is the API that others should be able to use
dojo.declare("bespin.editor.API", null, {
    constructor: function(container, opts) {
        this.opts = opts || {};

        // fixme: this stuff may not belong here
        this.debugMode = false;

        this.container = dojo.byId(container);
        this.model = new bespin.editor.DocumentModel(this);

        dojo.byId(container).innerHTML = '<canvas id="canvas" moz-opaque="true" tabindex="-1"></canvas>';
        this.canvas = dojo.byId(container).firstChild;
        while (this.canvas && this.canvas.nodeType != 1) this.canvas = this.canvas.nextSibling;

        this.cursorManager = new bespin.editor.CursorManager(this);
        this.ui = new bespin.editor.UI(this);
        this.theme = bespin.themes['default'];

        this.editorKeyListener = new bespin.editor.DefaultEditorKeyListener(this);
        this.undoManager = new bespin.editor.UndoManager(this);
        this.customEvents = new bespin.editor.Events(this);

        this.ui.installKeyListener(this.editorKeyListener);

        this.model.insertCharacters({ row: 0, col: 0 }, " ");

        dojo.connect(this.canvas, "blur",  dojo.hitch(this, function(e) { this.setFocus(false); }));
        dojo.connect(this.canvas, "focus", dojo.hitch(this, function(e) { this.setFocus(true); }));

        bespin.editor.clipboard.setup(this); // setup the clipboard

        this.paint();

        if (!this.opts.dontfocus) { this.setFocus(true); }
    },

    // ensures that the start position is before the end position; reading directly from the selection property makes no such guarantee
    getSelection: function(selection) {
        selection = (selection != undefined) ? selection : this.selection;
        if (!selection) return undefined;

        var startPos = selection.startPos;
        var endPos = selection.endPos;

        // ensure that the start position is always before than the end position
        if ((endPos.row < startPos.row) || ((endPos.row == startPos.row) && (endPos.col < startPos.col))) {
            var foo = startPos;
            startPos = endPos;
            endPos = foo;
        }

        return {
            startPos: bespin.editor.utils.copyPos(startPos),
            endPos: bespin.editor.utils.copyPos(endPos),
            startModelPos: this.getModelPos(startPos),
            endModelPos: this.getModelPos(endPos)
        };
    },

    // helper
    getCursorPos: function(modelPos) {
        return this.cursorManager.getCursorPosition(modelPos);
    },

    // helper
    getModelPos: function(pos) {
        return this.cursorManager.getModelPosition(pos);
    },

    // restore the state of the editor
    resetView: function(data) {
        this.cursorManager.moveCursor(data.cursor);
        this.setSelection(data.selection);
        this.ui.yoffset = data.offset.y;
        this.ui.xoffset = data.offset.x;
        this.paint();
    },

    basicView: function() {
        this.cursorManager.moveCursor({row: 0, col: 0});
        this.setSelection(undefined);
        this.ui.yoffset = 0;
        this.ui.xoffset = 0;
        this.paint();
    },

    getCurrentView: function() {
        return { cursor: this.getCursorPos(), offset: { x: this.ui.xoffset, y: this.ui.yoffset }, selection: this.selection };
    },

    // be gentle trying to get the tabstop from settings
    getTabSize: function() {
        var settings = bespin.get("settings");
        var size = bespin.defaultTabSize; // default
        if (settings) {
            var tabsize = parseInt(settings.get("tabsize"));
            if (tabsize > 0) size = tabsize;
        }
        return size;
    },

    // helper to get text
    getSelectionAsText: function() {
        var selectionText = '';
        var selectionObject = this.getSelection();
        if (selectionObject) {
            selectionText = this.model.getChunk(selectionObject);
        }
        return selectionText;
    },

    setSelection: function(selection) {
        this.selection = selection;
        if (this.undoManager.syncHelper) this.undoManager.syncHelper.queueSelect(selection);
    },

    paint: function(fullRefresh) {
        var ctx = bespin.util.canvas.fix(this.canvas.getContext("2d"));
        this.ui.paint(ctx, fullRefresh);
    },

    changeKeyListener: function(newKeyListener) {
        this.ui.installKeyListener(newKeyListener);
        this.editorKeyListener = newKeyListener;
    },

    // this does not set focus to the editor; it indicates that focus has been set to the underlying canvas
    setFocus: function(focus) {
        this.focus = focus;
        if (focus) this.canvas.focus(); // force it if you have too
    },

    setReadOnly: function(readonly) {
        this.readonly = readonly;
    }
});

}

if(!dojo._hasResource["bespin.editor.events"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.editor.events"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */



dojo.provide("bespin.editor.events");

// ** {{{ bespin.editor.Events }}} **
//
// Handle custom events aimed at, and for the editor
dojo.declare("bespin.editor.Events", null, {
    constructor: function(editor) {
        bespin.subscribe("editor:openfile:opensuccess", function(event) {
            // If collaboration is turned on, we won't know the file contents
            var content = event.file.content || "";
            editor.model.insertDocument(content);
            editor.cursorManager.moveCursor({ row: 0, col: 0 });
        });

        // -- fire an event here and you can run any editor action
        bespin.subscribe("editor:doaction", function(event) {
            var action = event.action;
            var args   = event.args || bespin.editor.utils.buildArgs();

            if (action) editor.ui.actions[action](args);
        });

        // -- fire an event to setup any new or replace actions
        bespin.subscribe("editor:setaction", function(event) {
            var action = event.action;
            var code   = event.code;
            if (action && dojo.isFunction(code)) editor.ui.actions[action] = code;
        });

        // -- add key listeners
        // e.g. bindkey ctrl b moveCursorLeft
        bespin.subscribe("editor:bindkey", function(event) {
            var modifiers = event.modifiers || '';
            if (!event.key) return;

            var keyCode = bespin.util.keys.Key[event.key.toUpperCase()];

            // -- try an editor action first, else fire away at the event bus
            var action = editor.ui.actions[event.action] || event.action;

            if (keyCode && action) {
                var actionDescription = "User key to execute: " + event.action.replace("command:execute;name=", "");
                if (event.selectable) { // register the selectable binding to (e.g. SHIFT + what you passed in)
                    editor.editorKeyListener.bindKeyStringSelectable(modifiers, keyCode, action, actionDescription);
                } else {
                    editor.editorKeyListener.bindKeyString(modifiers, keyCode, action, actionDescription);
                }
            }
        });
        
        // ** {{{ Event: editor:openfile }}} **
        // 
        // Observe a request for a file to be opened and start the cycle:
        //
        // * Send event that you are opening up something (openbefore)
        // * Ask the file system to load a file (collaborateOnFile)
        // * If the file is loaded send an opensuccess event
        // * If the file fails to load, send an openfail event
        bespin.subscribe("editor:openfile", function(event) {
            var filename = event.filename;
            var editSession = bespin.get('editSession');
            var files = bespin.get('files'); 

            var project  = event.project || editSession.project;

            if (editSession.checkSameFile(project, filename)) {
                return; // short circuit
            }
            
            bespin.publish("editor:openfile:openbefore", { project: project, filename: filename });

            files.collaborateOnFile(project, filename, function(file) {
                if (!file) {
                    bespin.publish("editor:openfile:openfail", { project: project, filename: filename });
                } else {
                    bespin.publish("editor:openfile:opensuccess", { project: project, file: file });

                    var settings = bespin.get("settings");

                    // Get the array of lastused files
                    var lastUsed = settings.getObject("_lastused");
                    if (!lastUsed) {
                        lastUsed = [];
                    }

                    // We want to add this to the top
                    var newItem = {
                        project:project,
                        filename:filename
                    }

                    // Remove newItem from down in the list and place at top
                    var cleanLastUsed = [];
                    dojo.forEach(lastUsed, function(item) {
                        if (item.project != newItem.project || item.filename != newItem.filename) {
                            cleanLastUsed.unshift(item);
                        }
                    });
                    cleanLastUsed.unshift(newItem);
                    lastUsed = cleanLastUsed;

                    // Trim to 10 members
                    if (lastUsed.length > 10) {
                        lastUsed = lastUsed.slice(0, 10);
                    }

                    // Maybe this should have a _ prefix: but then it does not persist??
                    settings.setObject("_lastused", lastUsed);
                }
            });
        });

        // ** {{{ Event: editor:forceopenfile }}} **
        // 
        // Open an existing file, or create a new one.
        bespin.subscribe("editor:forceopenfile", function(event) {
            var filename = event.filename;
            var project  = event.project;
            var content  = event.content || " ";

            var editSession = bespin.get('editSession');

            if (editSession) {
                if (!project) project = editSession.project;
                if (editSession.checkSameFile(project, filename)) return; // short circuit
            }

            if (!project) return; // short circuit

            bespin.get('files').forceOpenFile(project, filename, content);
        });

        // ** {{{ Event: editor:newfile }}} **
        // 
        // Observe a request for a new file to be created
        bespin.subscribe("editor:newfile", function(event) {
            var project = event.project || bespin.get('editSession').project; 
            var newfilename = event.newfilename || "new.txt";
            var content = event.content || " ";

            bespin.get('files').newFile(project, newfilename, function() {
                bespin.publish("editor:openfile:opensuccess", { file: {
                    name: newfilename,
                    content: content,
                    timestamp: new Date().getTime()
                }});

                bespin.publish("editor:dirty");
            });        
        });

        // ** {{{ Event: editor:savefile }}} **
        // 
        // Observe a request for a file to be saved and start the cycle:
        //
        // * Send event that you are about to save the file (savebefore)
        // * Get the last operation from the sync helper if it is up and running
        // * Ask the file system to save the file
        // * Change the page title to have the new filename
        // * Tell the command line to show the fact that the file is saved
        //
        // TODO: Need to actually check saved status and know if the save worked
        bespin.subscribe("editor:savefile", function(event) {
            var project = event.project || bespin.get('editSession').project; 
            var filename = event.filename || bespin.get('editSession').path; // default to what you have
            
            bespin.publish("editor:savefile:before", { filename: filename });

            // saves the current state of the editor to a cookie
            dojo.cookie('viewData_' + project + '_' + filename.split('/').join('_'), dojo.toJson(bespin.get('editor').getCurrentView()), { expires: 7 });

            var file = {
                name: filename,
                content: editor.model.getDocument(),
                timestamp: new Date().getTime()
            };

            if (editor.undoManager.syncHelper) { // only if ops are on
                file.lastOp = editor.undoManager.syncHelper.lastOp;
            }

            bespin.get('files').saveFile(project, file); // it will save asynchronously.
            // TODO: Here we need to add in closure to detect errors and thus fire different success / error

            bespin.publish("editor:titlechange", { filename: filename });

            bespin.publish("message:hint", { msg: 'Saved file: ' + file.name });
            
            bespin.publish("editor:clean");
        });

        // ** {{{ Event: editor:moveandcenter }}} **
        // 
        // Observe a request to move the editor to a given location and center it
        bespin.subscribe("editor:moveandcenter", function(event) {
            var row = event.row; 

            if (!row) return; // short circuit

            var linenum = row - 1; // move it up a smidge

            editor.cursorManager.moveCursor({ row: linenum, col: 0 });

            // If the line that we are moving to is off screen, center it, else just move in place
            if ( (linenum < editor.ui.firstVisibleRow) || (linenum >= editor.ui.firstVisibleRow + editor.ui.visibleRows) ) {
                bespin.publish("editor:doaction", {
                    action: 'moveCursorRowToCenter'
                });
            }
        });

        // == Shell Events: Header, Chrome, etc ==
        //
        // ** {{{ Event: editor:openfile:opensuccess }}} **
        // 
        // When a file is opened successfully change the project and file status area.
        // Then change the window title, and change the URL hash area
        bespin.subscribe("editor:openfile:opensuccess", function(event) {
            var project = event.project || bespin.get('editSession').project; 
            var filename = event.file.name;

            // reset the state of the editor based on saved cookie
            var data = dojo.cookie('viewData_' + project + '_' + filename.split('/').join('_'));
            if (data) {
                bespin.get('editor').resetView(dojo.fromJson(data));
            } else {
                bespin.get('editor').basicView();
            }

            bespin.publish("editor:titlechange", { filename: filename });

            bespin.publish("url:change", { project: project, path: filename });
        });

        // ** {{{ Event: editor:urlchange }}} **
        // 
        // Observe a urlchange event and then... change the location hash
        bespin.subscribe("url:change", function(event) {
            var hashArguments = dojo.queryToObject(location.hash.substring(1));
            hashArguments.project = event.project;
            hashArguments.path    = event.path;

            // window.location.hash = dojo.objectToQuery() is not doing the right thing...
            var pairs = [];
            for (var name in hashArguments) {
                var value = hashArguments[name];
                pairs.push(name + '=' + value);
            }
            window.location.hash = pairs.join("&");
        });

        // ** {{{ Event: url:changed }}} **
        // 
        // Observe a request for session status
        bespin.subscribe("url:changed", function(event) {
            bespin.publish("editor:openfile", { filename: event.now.get('path') });
        });

        // ** {{{ Event: session:status }}} **
        // 
        // Observe a request for session status
        bespin.subscribe("session:status", function(event) {
            var editSession = bespin.get('editSession');
            var file = editSession.path || 'a new scratch file';
            
            bespin.publish("message:output", {
                msg: 'Hey ' + editSession.username + ', you are editing ' + file + ' in project ' + editSession.project
            });
        });

        // ** {{{ Event: cmdline:focus }}} **
        // 
        // If the command line is in focus, unset focus from the editor
        bespin.subscribe("cmdline:focus", function(event) {
            editor.setFocus(false);
        });

        // ** {{{ Event: cmdline:blur }}} **
        // 
        // If the command line is blurred, take control in the editor
        bespin.subscribe("cmdline:blur", function(event) {
            editor.setFocus(true);
        });

        // ** {{{ Event: escape }}} **
        // 
        // escape key hit, so clear the find
        bespin.subscribe("ui:escape", function(event) {
            if (editor.ui.searchString) {
                editor.ui.setSearchString(false);
                dojo.byId('searchresult').style.display = 'none';                
            }
        });

        // ** {{{ Event: editor:document:changed }}} **
        // 
        // Track whether a file is dirty (hasn't been saved)
        bespin.subscribe("editor:document:changed", function(event) {
            bespin.publish("editor:dirty");
        });

        bespin.subscribe("editor:dirty", function(event) {
            editor.dirty = true;
        });

        bespin.subscribe("editor:clean", function(event) {
            editor.dirty = false;
        });

    }
});

}

if(!dojo._hasResource["bespin.editor.model"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.editor.model"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

dojo.provide("bespin.editor.model");  

// = Model =
//
// The editor has a model of the data that it works with. 
// This representation is encapsulated in Bespin.Editor.DocumentModel
dojo.declare("bespin.editor.DocumentModel", null, {
    constructor: function(editor) {
        this.editor = editor;
        this.rows = [];
        this.cacheRowMetadata = [];
    },

    isEmpty: function() {
        if (this.rows.length > 1) return false;
        if (this.rows.length == 1 && this.rows[0].length > 0) return false;
        return true;
    },

    getDirtyRows: function() {
        var dr = (this.dirtyRows) ? this.dirtyRows : [];
        this.dirtyRows = null;
        return dr;
    },

    setRowDirty: function(row) {
        if (!this.dirtyRows) this.dirtyRows = new Array(this.rows.length);
        this.dirtyRows[row] = true;
    },

    isRowDirty: function(row) {
        if (!this.dirtyRows) return true;
        return this.dirtyRows[row];
    },

    setRowArray: function(rowIndex, row) {  // invalidate
        if (!dojo.isArray(row)) {
            row = row.split('');
        }
        this.rows[rowIndex] = row;
    },

    // gets the row array for the specified row, creating it and any intermediate rows as necessary
    getRowArray: function(rowIndex) {
        while (this.rows.length <= rowIndex) this.rows.push([]);
        return this.rows[rowIndex];
    },

    // checks if there is a row at the specified index; useful because getRowArray() creates rows as necessary
    hasRow: function(rowIndex) {
        return (this.rows[rowIndex]);
    },

    // will insert blank spaces if passed col is past the end of passed row
    insertCharacters: function(modelPos, string) {
        var row = this.getRowArray(modelPos.row);
        while (row.length < modelPos.col) row.push(" ");

        var newrow = (modelPos.col > 0) ? row.splice(0, modelPos.col) : [];
        newrow = newrow.concat(string.split(""));
        this.rows[modelPos.row] = newrow.concat(row);

        this.setRowDirty(modelPos.row);
        this.editor.ui.syntaxModel.invalidateCache(modelPos.row);
    },

    getDocument: function() {
        var file = [];
        for (var x = 0; x < this.getRowCount(); x++) {
            file[x] = this.getRowArray(x).join('');
        }
        return file.join("\n");
    },

    insertDocument: function(content) {
        this.clear();
        var rows = content.split("\n");
        for (var x = 0; x < rows.length; x++) {
            this.insertCharacters({ row: x, col: 0 }, rows[x]);
        }
    },

    changeEachRow: function(changeFunction) {
        for (var x = 0; x < this.getRowCount(); x++) {
            var row = this.getRowArray(x);
            row = changeFunction(row);
            this.setRowArray(x, row);
        }
    },

    replace: function(search, replace) {
      for (var x = 0; x < this.getRowCount(); x++) {
        var line = this.getRowArray(x).join('');

        if (line.match(search)) {
          var regex = new RegExp(search, "g");
          var newline = line.replace(regex, replace);
          if (newline != line) {
            this.rows[x] = newline.split('');
          }
        }
      }
    },

    // will silently adjust the length argument if invalid
    deleteCharacters: function(modelPos, length) {
        var row = this.getRowArray(modelPos.row);
        var diff = (modelPos.col + length - 1) - row.length;
        if (diff > 0) length -= diff;
        if (length > 0) {
            this.setRowDirty(modelPos.row);
            this.editor.ui.syntaxModel.invalidateCache(modelPos.row);

            return row.splice(modelPos.col, length).join("");
        }
        return "";
    },

    clear: function() {
        this.rows = [];
        this.cacheRowMetadata = [];
    },

    deleteRows: function(row, count) {
        var diff = (row + count - 1) - this.rows.length;
        if (diff > 0) count -= diff;
        if (count > 0) {
            this.rows.splice(row, count);
            this.cacheRowMetadata.splice(row, count);
        }
    },

    // splits the passed row at the col specified, putting the right-half on a new line beneath the passed row
    splitRow: function(modelPos, autoindent) {
        this.editor.ui.syntaxModel.invalidateCache(modelPos.row);
        this.setRowDirty(modelPos.row);

        var row = this.getRowArray(modelPos.row); 

        var newRow;
        if (autoindent && autoindent.length > 0) {
            newRow = autoindent;
        } else {
            newRow = [];
        }

        if (modelPos.col < row.length) {
            newRow = newRow.concat(row.splice(modelPos.col));
        }

        if (modelPos.row == (this.rows.length - 1)) {
            this.rows.push(newRow);
        } else {
            var newRows = this.rows.splice(0, modelPos.row + 1);
            newRows.push(newRow);
            newRows = newRows.concat(this.rows);
            this.rows = newRows;

            var newCacheRowMetadata = this.cacheRowMetadata.splice(0, modelPos.row + 1);
            newCacheRowMetadata.push(undefined);
            this.cacheRowMetadata = newCacheRowMetadata.concat(this.cacheRowMetadata);
        } 
    },

    // joins the passed row with the row beneath it; optionally removes leading whitespace as well.
    joinRow: function(rowIndex, autounindentSize) {
        this.editor.ui.syntaxModel.invalidateCache(rowIndex); 
        this.setRowDirty(rowIndex);

        if (rowIndex >= this.rows.length - 1) return;
        var row = this.getRowArray(rowIndex);
        var nextrow = this.rows[rowIndex + 1];

        //first, remove any autoindent
        if (typeof autounindentSize != "undefined") {
            nextrow.splice(0, autounindentSize)
        }
       
        //now, remove the row
        this.rows[rowIndex] = row.concat(nextrow);
        this.rows.splice(rowIndex + 1, 1);
        
        this.cacheRowMetadata.splice(rowIndex + 1, 1);
    },

    // returns the number of rows in the model
    getRowCount: function() {
        return this.rows.length;
    },

    // returns a "chunk": a string representing a part of the document with \n characters representing end of line
    getChunk: function(selection) {
        var startModelPos = selection.startModelPos;
        var endModelPos = selection.endModelPos;

        var startModelCol, endModelCol;
        var chunk = "";

        // get the first line
        startModelCol = startModelPos.col;
        var row = this.getRowArray(startModelPos.row);
        endModelCol = (endModelPos.row == startModelPos.row) ? endModelPos.col : row.length;
        if (endModelCol > row.length) endModelCol = row.length;
        chunk += row.join("").substring(startModelCol, endModelCol);

        // get middle lines, if any
        for (var i = startModelPos.row + 1; i < endModelPos.row; i++) {
            chunk += "\n";
            chunk += this.getRowArray(i).join("");
        }

        // get the end line
        if (startModelPos.row != endModelPos.row) {
            startModelCol = 0;
            endModelCol = endModelPos.col;
            row = this.getRowArray(endModelPos.row);
            if (endModelCol > row.length) endModelCol = row.length;
            chunk += "\n" + row.join("").substring(startModelCol, endModelCol);
        }

        return chunk;
    },

    // deletes the text between the startPos and endPos, joining as necessary. startPos and endPos are inclusive
    deleteChunk: function(selection) {
        var chunk = this.getChunk(selection);

        var startModelPos = selection.startModelPos;
        var endModelPos = selection.endModelPos;

        this.editor.ui.syntaxModel.invalidateCache(startModelPos.row);

        var startModelCol, endModelCol;

        // get the first line
        startModelCol = startModelPos.col;
        var row = this.getRowArray(startModelPos.row);
        endModelCol = (endModelPos.row == startModelPos.row) ? endModelPos.col : row.length;
        if (endModelCol > row.length) endModelCol = row.length;
        this.deleteCharacters({ row: startModelPos.row, col: startModelCol }, endModelCol - startModelCol);

        // get the end line
        if (startModelPos.row != endModelPos.row) {
            startModelCol = 0;
            endModelCol = endModelPos.col;
            row = this.getRowArray(endModelPos.row);
            if (endModelCol > row.length) endModelCol = row.length;
            this.deleteCharacters({ row: endModelPos.row, col: startModelCol }, endModelCol - startModelCol);
        }

        // remove any lines in-between
        if ((endModelPos.row - startModelPos.row) > 1) this.deleteRows(startModelPos.row + 1, endModelPos.row - startModelPos.row - 1);

        // join the rows
        if (endModelPos.row != startModelPos.row) this.joinRow(startModelPos.row);

        return chunk;
    },

    // inserts the chunk and returns the ending position
    insertChunk: function(modelPos, chunk) {
        this.editor.ui.syntaxModel.invalidateCache(modelPos.row);  

        var lines = chunk.split("\n");
        var cModelPos = bespin.editor.utils.copyPos(modelPos);
        for (var i = 0; i < lines.length; i++) {
            this.insertCharacters(cModelPos, lines[i]);
            cModelPos.col = cModelPos.col + lines[i].length;

            if (i < lines.length - 1) {
                this.splitRow(cModelPos);
                cModelPos.col = 0;
                cModelPos.row = cModelPos.row + 1;
            }
        } 

        return cModelPos;
    },

    // returns an array with the col positions of the substrings str in the given row
    getStringIndicesInRow: function(row, str) {        
        str = str.toLowerCase()
        var row = this.getRowArray(row).join('').toLowerCase();

        if (row.indexOf(str) == -1) return false;

        var result = new Array();
        var start = 0;
        var index = row.indexOf(str);

        do {
            result.push(index);
            index = row.indexOf(str, index + 1);
        } while (index != -1);

        return result;
    },

    // count the occurrences of str in the whole file
    getCountOfString: function(str) {
        var count = 0;
        var line;
        var match;

        for (var x = 0; x < this.getRowCount(); x++) {
            match = this.getStringIndicesInRow(x, str);   // TODO: Couldn't this be done with an regex much more faster???
            if (match) {
                count += match.length;
            }
        }

        return count;
    },
    
    searchStringChanged: function(str) {        
        for (var row = 0; row < this.cacheRowMetadata.length; row++) {
            if (this.cacheRowMetadata[row]) {
                if (str) {
                    this.cacheRowMetadata[row].searchIndices = this.getStringIndicesInRow(row, str);            
                } else {
                    this.cacheRowMetadata[row].searchIndices = false;
                }
            }
        }
    },

    // find the position of the previous match. Returns a complete selection-object
    findPrev: function(row, col, str) {
        var indices;
        var strLen = str.length;

        for (var x = row; x > -1; x--) {
            indices = this.getStringIndicesInRow(x, str);
            if (!indices) continue;

            for (var y = indices.length - 1; y > -1; y--) {
                if (indices[y] < (col - strLen) || row != x) {
                    return { startPos: { col: indices[y], row: x}, endPos: {col: indices[y] + strLen, row: x} };
                }
            }
        }
        return false;
    },

    // find the position of the next match. Returns a complete selection-object
    findNext: function(row, col, str) {
        var indices;

        for (var x = row; x < this.getRowCount(); x++) {
            indices = this.getStringIndicesInRow(x, str);
            if (!indices) continue;
            for (var y = 0; y < indices.length; y++) {
                if (indices[y] > col || row != x) {
                    return { startPos: { col: indices[y], row: x}, endPos: {col: indices[y] + str.length, row: x} };
                }
            }
        }
        return false;
    },

    findBefore: function(row, col, comparator) {
        var line = this.getRowArray(row);
        if (!dojo.isFunction(comparator)) comparator = function(letter) { // default to non alpha
            if (letter.charAt(0) == ' ') return true;
            var letterCode = letter.charCodeAt(0);
            return (letterCode < 48) || (letterCode > 122); // alpha only
        };

        while (col > 0) {
            var letter = line[col];
            if (!letter) continue;

            if (comparator(letter)) {
                col++; // move it back
                break;
            }

            col--;
        }

        return { row: row, col: col };
    },

    findAfter: function(row, col, comparator) {
        var line = this.getRowArray(row);
        if (!dojo.isFunction(comparator)) comparator = function(letter) { // default to non alpha
            if (letter.charAt(0) == ' ') return true;
            var letterCode = letter.charCodeAt(0);
            return (letterCode < 48) || (letterCode > 122); // alpha only
        };
        
        while (col < line.length) {
            col++;
            
            var letter = line[col];
            if (!letter) continue;

            if (comparator(letter)) break;
        }

        return { row: row, col: col };
    },
    
    // returns various metadata about the row, mainly concerning tab information
    // uses a cache to speed things up
    getRowMetadata: function(row) {
        // check if we can use the cached RowMetadata
        if (!this.isRowDirty(row) && this.cacheRowMetadata[row]) {
            return this.cacheRowMetadata[row];
        }
        
        // No cache or row is dirty? Well, then we have to calculate things new...
        
        // contains the row metadata; this object is returned at the end of the function
        var meta = { tabExpansions: [] };

        var rowArray = this.editor.model.getRowArray(row);
        var lineText = rowArray.join("");
        var tabsize = this.editor.getTabSize();

        meta.lineTextWithoutTabExpansion = lineText;
        meta.lineLengthWithoutTabExpansion = rowArray.length;

        // check for tabs and handle them
        for (var ti = 0; ti < lineText.length; ti++) {
            // check if the current character is a tab
            if (lineText.charCodeAt(ti) == 9) {
                // since the current character is a tab, we potentially need to insert some blank space between the tab character
                // and the next tab stop
                var toInsert = tabsize - (ti % tabsize);

                // create a spacer string representing the space between the tab and the tabstop
                var spacer = "";
                for (var si = 1; si < toInsert; si++) spacer += " ";

                // split the row string into the left half and the right half (eliminating the tab character) in preparation for
                // creating a new row string
                var left = (ti == 0) ? "" : lineText.substring(0, ti);
                var right = (ti < lineText.length - 1) ? lineText.substring(ti + 1) : "";

                // create the new row string; the blank space essentially replaces the tab character
                lineText = left + " " + spacer + right;
                meta.tabExpansions.push({ start: left.length, end: left.length + spacer.length + 1 });

                // increment the column counter to correspond to the new space
                ti += toInsert - 1;
            }
        }

        meta.lineText = lineText;
        
        if (this.editor.ui.searchString) {
            meta.searchIndices = this.getStringIndicesInRow(row, this.editor.ui.searchString);            
        } else {
            meta.searchIndices = false;
        }

        // save the calcualted metadata to the cache
        this.cacheRowMetadata[row] = meta;

        return meta;
    },
});

}

if(!dojo._hasResource["bespin.editor.toolbar"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.editor.toolbar"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

dojo.provide("bespin.editor.toolbar");

// = Toolbar =
//
// The editor has the notion of a toolbar which are components that can drive the editor from outside of itself
// Such examples are collaboration views, file browser, undo/redo, cut/copy/paste and more.

dojo.declare("bespin.editor.Toolbar", null, {
    DEFAULT_TOOLBAR: ["collaboration", "dashboard", "target_browsers", "save",
                      "close", "undo", "redo", "preview", "fontsize"],
    showCollab: false,
    showFiles: false,
    showTarget: false,

    showCollabHotCounter: 0,

    constructor: function(editor, opts) {
        this.editor = editor || bespin.get('editor');

        if (opts.setupDefault) this.setupDefault();

        bespin.publish("toolbar:init", { toolbar: this });
    },

    setup: function(type, el, callback) {
        if (dojo.isFunction(callback)) this.addComponent(type, callback); // add the component first
        if (dojo.isFunction(this.components[type])) this.components[type](this, el);
    },

    /*
     * Go through the default list and try to hitch onto the DOM element
     */
    setupDefault: function() {
        dojo.forEach(this.DEFAULT_TOOLBAR, dojo.hitch(this, function(item) {
            var item_el = dojo.byId("toolbar_" + item);
            if (item_el) {
                this.setup(item, item_el);
            }
        }));
    },

    addComponent: function(type, callback) {
        this.components[type] = callback;
    },

    // -- INITIAL COMPONENTS

    components: {
        collaboration: function(toolbar, el) {
            var collab = dojo.byId(el) || dojo.byId("toolbar_collaboration");
            dojo.connect(collab, 'click', function() {
                toolbar.showCollab = !toolbar.showCollab;
                collab.src = "images/" + ( (toolbar.showCollab) ? "icn_collab_on.png" : (toolbar.showCollabHotCounter == 0) ? "icn_collab_off.png" : "icn_collab_watching.png" );
                bespin.page.editor.recalcLayout();
            });
            dojo.connect(collab, 'mouseover', function() {
                collab.style.cursor = "pointer";
                collab.src = "images/icn_collab_on.png";
            });
            dojo.connect(collab, 'mouseout', function() {
                collab.style.cursor = "default";
                collab.src = "images/icn_collab_off.png";
            });
        },

        dashboard: function(toolbar, el) {
            var dashboard = dojo.byId(el) || dojo.byId("toolbar_dashboard");
            dojo.connect(dashboard, 'mouseover', function() {
                dashboard.style.cursor = "pointer";
                dashboard.src = "images/icn_dashboard_on.png";
            });
            dojo.connect(dashboard, 'mouseout', function() {
                dashboard.style.cursor = "default";
                dashboard.src = "images/icn_dashboard_off.png";
            });
        },

        target_browsers: function(toolbar, el) {
            var target = dojo.byId(el) || dojo.byId("toolbar_target_browsers");
            dojo.connect(target, 'click', function() {
                toolbar._showTarget = !toolbar._showTarget;
                target.src = "images/" + ( (toolbar._showTarget) ? "icn_target_on.png" : "icn_target_off.png" );
                bespin.page.editor.recalcLayout();
            });
            dojo.connect(target, 'mouseover', function() {
                target.style.cursor = "pointer";
                target.src = "images/icn_target_on.png";
            });
            dojo.connect(target, 'mouseout', function() {
                target.style.cursor = "default";
                target.src = "images/icn_target_off.png";
            });
        },

        save: function(toolbar, el) {
            var save = dojo.byId(el) || dojo.byId("toolbar_save");
            dojo.connect(save, 'mouseover', function() {
                save.src = "images/icn_save_on.png";
            });

            dojo.connect(save, 'mouseout', function() {
                save.src = "images/icn_save.png";
            });

            dojo.connect(save, 'click', function() {
                bespin.publish("editor:savefile");
            });
        },

        close: function(toolbar, el) {
            var close = dojo.byId(el) || dojo.byId("toolbar_close");
            dojo.connect(close, 'mouseover', function() {
                close.src = "images/icn_close_on.png";
            });

            dojo.connect(close, 'mouseout', function() {
                close.src = "images/icn_close.png";
            });

            dojo.connect(close, 'click', function() {
                bespin.publish("editor:closefile");
            });
        },

        undo: function(toolbar, el) {
            var undo = dojo.byId(el) || dojo.byId("toolbar_undo");
            dojo.connect(undo, 'mouseover', function() {
                undo.src = "images/icn_undo_on.png";
            });

            dojo.connect(undo, 'mouseout', function() {
                undo.src = "images/icn_undo.png";
            });

            dojo.connect(undo, 'click', function() {
                toolbar.editor.ui.actions.undo();
            });
        },

        redo: function(toolbar, el) {
            var redo = dojo.byId(el) || dojo.byId("toolbar_undo");

            dojo.connect(redo, 'mouseover', function() {
                redo.src = "images/icn_redo_on.png";
            });

            dojo.connect(redo, 'mouseout', function() {
                redo.src = "images/icn_redo.png";
            });

            dojo.connect(redo, 'click', function() {
                toolbar.editor.ui.actions.redo();
            });
        },

        preview: function(toolbar, el) {
            var preview = dojo.byId(el) || dojo.byId("toolbar_preview");

            dojo.connect(preview, 'mouseover', function() {
                preview.src = "images/icn_preview_on.png";
            });

            dojo.connect(preview, 'mouseout', function() {
                preview.src = "images/icn_preview.png";
            });

            dojo.connect(preview, 'click', function() {
                bespin.publish("editor:preview"); // use default file
            });
        },

        fontsize: function(toolbar, el) {
            var fontsize = dojo.byId(el) || dojo.byId("toolbar_fontsize");

            dojo.connect(fontsize, 'mouseover', function() {
                fontsize.src = "images/icn_fontsize_on.png";
            });

            dojo.connect(fontsize, 'mouseout', function() {
                fontsize.src = "images/icn_fontsize.png";
            });

            // Change the font size between the small, medium, and large settings
            (function() {
                var currentFontSize = 2;
                var fontSizes = {
                    1: 8,  // small
                    2: 10, // medium
                    3: 14  // large
                };

                dojo.connect(fontsize, 'click', function() {
                    currentFontSize = (currentFontSize > 2) ? 1 : currentFontSize + 1;
                    bespin.publish("settings:set:fontsize", [{ value: fontSizes[currentFontSize] }]);
                });
            })();
        }
    }
});

}

if(!dojo._hasResource["bespin.editor.undo"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.editor.undo"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

dojo.provide("bespin.editor.undo");

// = Undo Handling =
//
// Handle the undo/redo queues for the editor

// ** {{{ bespin.editor.UndoManager }}} **
//
// Run the undo/redo stack
dojo.declare("bespin.editor.UndoManager", null, {  
    constructor: function(editor) {
        this.editor = editor;
        this.undoStack = [];
        this.redoStack = [];
        this.syncHelper = undefined;
    },

    maxUndoLength: 100,

    canUndo: function() {
        return this.undoStack.length > 0;
    },

    undo: function() {
        if (this.undoStack.length == 0) return;
        var item = this.undoStack.pop();

        this.editor.cursorManager.moveCursor(item.undoOp.pos);
        item.undo();
        this.redoStack.push(item);

        if (this.syncHelper) this.syncHelper.undo();

        bespin.publish("editor:document:changed");
    },

    redo: function() {
        if (this.redoStack.length == 0) return;
        var item = this.redoStack.pop();

        this.editor.cursorManager.moveCursor(item.redoOp.pos);
        item.redo();
        this.undoStack.push(item);

        if (this.syncHelper) this.syncHelper.redo();
        
        bespin.publish("editor:document:changed");
    },

    addUndoOperation: function(item) {
        if (item.undoOp.queued) return;

        if (this.redoStack.length > 0) this.redoStack = [];

        while (this.undoStack.length + 1 > this.maxUndoLength) {
            this.undoStack.shift();
        }
        this.undoStack.push(item);
        item.editor = this.editor;

        // prevent undo operations from placing themselves back in the undo stack
        item.undoOp.queued = true;
        item.redoOp.queued = true;

        if (this.syncHelper) this.syncHelper.queueUndoOp(item);
        
        bespin.publish("editor:undooperation");
        bespin.publish("editor:document:changed");
    }
});

// ** {{{ bespin.editor.UndoManager }}} **
//
// The core operation contains two edit operations; one for undoing an operation, and the other for redoing it 
dojo.declare("bespin.editor.UndoItem", null, {
    constructor: function(undoOp, redoOp) {
        this.undoOp = undoOp;
        this.redoOp = redoOp;
    },

    undo: function() {
        this.editor.ui.actions[this.undoOp.action](this.undoOp);
    },

    redo: function() {
        this.editor.ui.actions[this.redoOp.action](this.redoOp);
    }
});

}

if(!dojo._hasResource["bespin.themes.default"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.themes.default"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

dojo.provide("bespin.themes.default");  

// = Themes =
//
// The editor can be styled with Themes. This will become CSS soon, but for now is JSON

// ** Coffee Theme **
bespin.themes.coffee = {
    backgroundStyle: "#2A211C",
    gutterStyle: "#4c4a41",
    lineNumberColor: "#e5c138",
    lineNumberFont: "10pt Monaco, Lucida Console, monospace",
    lineMarkerErrorColor: "#CC4444",
    lineMarkerWarningColor: "#B8860B",
    zebraStripeColor: "#2A211C",
    highlightCurrentLineColor: "#3a312b",
    editorTextFont: "10pt Monaco, Lucida Console, monospace",
    editorTextColor: "rgb(230, 230, 230)",
    editorSelectedTextColor: "rgb(240, 240, 240)",
    editorSelectedTextBackground: "#526DA5",
    cursorStyle: "#879aff",
    cursorType: "ibeam",       // one of "underline" or "ibeam"
    unfocusedCursorStrokeStyle: "#FF0033",
    unfocusedCursorFillStyle: "#73171E",
    partialNibStyle: "rgba(100, 100, 100, 0.3)",
    partialNibArrowStyle: "rgba(255, 255, 255, 0.3)",
    partialNibStrokeStyle: "rgba(150, 150, 150, 0.3)",
    fullNibStyle: "rgb(100, 100, 100)",
    fullNibArrowStyle: "rgb(255, 255, 255)",
    fullNibStrokeStyle: "rgb(150, 150, 150)",
    scrollTrackFillStyle: "rgba(50, 50, 50, 0.8)",
    scrollTrackStrokeStyle: "rgb(150, 150, 150)",
    scrollBarFillStyle: "rgba(0, 0, 0, %a)",
    scrollBarFillGradientTopStart: "rgba(90, 90, 90, %a)",
    scrollBarFillGradientTopStop: "rgba(40, 40, 40, %a)",
    scrollBarFillGradientBottomStart: "rgba(22, 22, 22, %a)",
    scrollBarFillGradientBottomStop: "rgba(44, 44, 44, %a)",
    tabSpace: "#392A25",
    searchHighlight: "#B55C00",
    searchHighlightSelected: "#FF9A00",

    // syntax definitions
    plain: "#bdae9d",
    keyword: "#42a8ed",
    string: "#039a0a",
    comment: "#666666",
    'c-comment': "#666666",
    punctuation: "#888888",
    attribute: "#BF9464",
    test: "rgb(255,0,0)",
    cdata: "#bdae9d",
    "attribute-value": "#039a0a",
    tag: "#46a8ed",
    color: "#c4646b",
    "tag-name": "#46a8ed",
    value: "#039a0a",
    important: "#990000",
    sizes: "#990000",
    cssclass: "#BF9464",
    cssid: "#46a8ed",  
       
    // Codemirror additions (TODO: better color choice)
    
    atom: "#aa4444",
    variable: "#00cccc",
    variabledef: "#4422cc",
    localvariable: "#cc2277",
    property: "#66bb33",
    operator: "#88bbff",
    error: "#FF0000", 
    
    // XML and HTML
    processing: "#999999",
    entity: "#AA2222",
    text: "#00BB00",
    
    // PHP
    "compile-time-constant": "#776088", 
    "predefined-constant": "#33CC33",
    "reserved-language-construct": "#00FF00", 
    "predefined-function": "#22FF22", 
    "predefined-class": "#22FF22",
    
    // Python
    literal: "#DD4411",
    identifier: "#22FF22", 
    func: "#2200FF",  
    type: "#8822FF",
    decorator: "#2222FF"
};

// ** Coffee Zebra Theme **
bespin.themes.coffeezebra = {};
dojo.mixin(bespin.themes.coffeezebra, bespin.themes.coffee);
bespin.themes.coffeezebra.zebraStripeColor = '#FFFFFF';

// ** Setup the default **
bespin.themes['default'] = bespin.themes.coffee;

}

if(!dojo._hasResource["bespin.syntax.base"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.syntax.base"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

// = Syntax Highlighting =
//
// Module for dealing with the syntax highlighting.
//
// The core model talks to specific engines to do the work and then packages it up to send to the editor.

dojo.provide("bespin.syntax.base");

// ** {{{ bespin.syntax.Model }}} **
//
// Base model for tracking syntax highlighting data.

dojo.declare("bespin.syntax.Model", null, {
    language: "",

    lineCache: [],

    // ** {{{ Caching }}} **
    //
    // Optionally, keep a cache of the highlighted model
    invalidateCache: function(lineNumber) {
        delete this.lineCache[lineNumber];
    },

    invalidateEntireCache: function() {
        this.lineCache = [];
    },

    addToCache: function(lineNumber, line) {
        this.lineCache[lineNumber] = line;
    },

    getFromCache: function(lineNumber) {
        return this.lineCache[lineNumber];
    },

    // Helpers
    //
    mergeSyntaxResults: function(regions) {
        // TO BE COMPLETED
        // This function has to take the regions and take sub pieces and tie them into the full line
        // For example, imagine an HTML engine that sees <script>....</script>
        // It will pass .... into the JavaScript engine and take those results with a base of 0 and return the real location
        var base = 0;
        for (var i = 0; i < regions.length; i++) {
            var region = region[i];
            //base += region.
        }
    },

    getSyntaxStylesPerLine: function(lineText, lineNumber, language) {
        return { regions: {
            plain: [{
                start: 0,
                stop: lineText.length
            }]
        }};
    },

    // -- Main API
    // ** {{{ getSyntaxStyles }}} **
    getSyntaxStyles: function(rows, firstLineToRender, lastLineToRender, language) {
        var syntaxResults = {};
        for (var i = firstLineToRender; i <= lastLineToRender; i++) {
            syntaxResults[i] = this.getSyntaxStylesPerLine(rows[i], i, language);
        }
        return syntaxResults;
    }
});

// ** {{{ bespin.syntax.Resolver }}} **
// The resolver hunts down the syntax engine
bespin.syntax.Resolver = (function() {
    var current, model;

    return {
        setEngine: function(name) {
            var engine = bespin.syntax[name];
            if (name == current) {
                return this;
            }
            if (engine) {
                current = name;
                if (model) {
                    delete model;
                }
                if (engine.worker) {
                    model = new bespin.worker.WorkerFacade(bespin.syntax[name].Model());
                    model.workerEnabled = true;
                } else {
                    model = new bespin.syntax[name].Model();
                    model.workerEnabled = false;
                }
            } else {
                console.log("no such engine: ", name);
            }
            return this;
        },

        getModel: function() {
            return model;
        }
    };
})();

}

if(!dojo._hasResource["bespin.syntax.simple._base"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.syntax.simple._base"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

// = Simple Syntax Highlighting =
//
// Not prepared for running in a worker thread.
// Woul be more overhead than benefit for auch a simple highlighter

dojo.provide("bespin.syntax.simple._base");


// ** {{{ bespin.syntax.simple.Model }}} **
//
// Tracks syntax highlighting data on a per-line basis.
dojo.declare("bespin.syntax.simple.Model", bespin.syntax.Model, {
    lineMetaInfo:  [],
    // ** {{{ Meta Info }}} **
    //
    // We store meta info on the lines, such as the fact that it is in a multiline comment
    setLineMetaInfo: function(lineNumber, meta) {
        this.lineMetaInfo[lineNumber] = meta;
    },

    getLineMetaInfo: function(lineNumber) {
        return this.lineMetaInfo[lineNumber];
    },

    getSyntaxStylesPerLine: function(lineText, lineNumber, language) {
        if (this.language != language) {
            this.engine = bespin.syntax.simple.Resolver.resolve(language);
            this.language = language;
        }

        // Get the row contents as one string
        var syntaxResult = { // setup the result
            text: lineText,
            regions: []
        };

        var meta;

        // we have the ability to have subtypes within the main parser
        // E.g. HTML can have JavaScript or CSS within
        if (typeof this.engine['innertypes'] == "function") {
            var languages = this.engine.innertypes(lineText);

            for (var i = 0; i < languages.length; i++) {
                var type = languages[i];
                meta = { inMultiLineComment: this.inMultiLineComment(), offset: type.start }; // pass in an offset
                var pieceRegions = [];
                var fromResolver = bespin.syntax.simple.Resolver.highlight(type.type, lineText.substring(type.start, type.stop), meta);
                if (fromResolver.meta && (i == languages.length - 1) ) {
                    this.setLineMetaInfo(lineNumber, fromResolver.meta);
                }
                pieceRegions.push(fromResolver);
            }
            syntaxResult.regions.push(this.mergeSyntaxResults(pieceRegions));
        } else {
            meta = (lineNumber > 0) ? this.getLineMetaInfo(lineNumber - 1) : {};
            var result = this.engine.highlight(lineText, meta);
            this.setLineMetaInfo(lineNumber, result.meta);
            syntaxResult.regions.push(result.regions);
        }

        return syntaxResult;
    }
});


// ** {{{ bespin.syntax.simple.Resolver }}} **
//
// The resolver holds the engines per language that are available to do the actual syntax highlighting
bespin.syntax.simple.Resolver = new function() {
  var engines = {};

  // ** {{{ NoopSyntaxEngine }}} **
  //
  // Return a plain region that is the entire line
  var NoopSyntaxEngine = {
      highlight: function(line, meta) {
          return { regions: {
              plain: [{
                  start: 0,
                  stop: line.length
              }]
          } };
      }
  };

  return {
      // ** {{{ highlight }}} **
      //
      // A high level highlight function that uses the {{{type}}} to get the engine, and asks it to highlight
      highlight: function(type, line, meta, lineNumber) {
          this.resolve(type).highlight(line, meta, lineNumber);
      },

      // ** {{{ register }}} **
      //
      // Engines register themselves,
      // e.g. {{{bespin.syntax.EngineResolver.register(new bespin.syntax.simple.CSS() || "CSS", ['css']);}}}
      register: function(syntaxEngine, types) {
          if (bespin.syntax.simple[syntaxEngine]) {
              syntaxEngine = new bespin.syntax.simple[syntaxEngine]();
          }

          for (var i = 0; i < types.length; i++) {
              engines[types[i]] = syntaxEngine;
          }
      },

      // ** {{{ resolve }}} **
      //
      // Hunt down the engine for the given {{{type}}} (e.g. css, js, html) or return the {{{NoopSyntaxEngine}}}
      resolve: function(type) {
          var engineType = engines[type];
          if (typeof engineType === "string") { // lazy load time
              dojo["require"]("bespin.syntax.simple." + engineType.toLowerCase());

              if (bespin.syntax.simple[engineType])
                engines[type] = new bespin.syntax.simple[engineType]();
          }
          return engines[type] || NoopSyntaxEngine;
      }
  };
}();

// Register
bespin.syntax.simple.Resolver.register("JavaScript", ['js', 'javascript', 'ecmascript', 'jsm', 'java']);
bespin.syntax.simple.Resolver.register("Arduino",    ['pde']);
bespin.syntax.simple.Resolver.register("C",          ['c', 'h']);
bespin.syntax.simple.Resolver.register("CSharp",     ['cs']);
bespin.syntax.simple.Resolver.register("CSS",        ['css']);
bespin.syntax.simple.Resolver.register("HTML",       ['html', 'htm', 'xml', 'xhtml', 'shtml']);
bespin.syntax.simple.Resolver.register("PHP",        ['php', 'php3', 'php4', 'php5']);
bespin.syntax.simple.Resolver.register("Python",     ['py', 'python']);

}

if(!dojo._hasResource["bespin.syntax.simple.javascript"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.syntax.simple.javascript"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

// = JavaScript Syntax Highlighting Implementation =
//
// Module for syntax highlighting JavaScript.

dojo.provide("bespin.syntax.simple.javascript");

// ** {{{ bespin.syntax.simple.JavaScript }}} **
//
// Tracks syntax highlighting data on a per-line basis. This is a quick-and-dirty implementation that
// supports five basic highlights: keywords, punctuation, strings, comments, and "everything else", all
// lumped into one last bucket.

bespin.syntax.JavaScriptConstants = {
    C_STYLE_COMMENT: "c-comment",
    LINE_COMMENT: "comment",
    STRING: "string",
    KEYWORD: "keyword",
    PUNCTUATION: "punctuation",
    OTHER: "plain"
};

dojo.declare("bespin.syntax.simple.JavaScript", null, {
    keywords: 'abstract boolean break byte case catch char class const continue debugger ' +
                    'default delete do double else enum export extends false final finally float ' +
                    'for function goto if implements import in instanceof int interface let long native ' +
                    'new null package private protected public return short static super switch ' +
                    'synchronized this throw throws transient true try typeof var void volatile while with'.split(" "),

    punctuation: '{ } > < / + - % * . , ; ( ) ? : = " \''.split(" "),

    highlight: function(line, meta) {
        if (!meta) meta = {};

        var K = bespin.syntax.JavaScriptConstants;    // aliasing the constants for shorter reference ;-)

        var regions = {};                               // contains the individual style types as keys, with array of start/stop positions as value

        // current state, maintained as we parse through each character in the line; values at any time should be consistent
        var currentStyle = (meta.inMultilineComment) ? K.C_STYLE_COMMENT : undefined;
        var currentRegion = {}; // should always have a start property for a non-blank buffer
        var buffer = "";

        // these properties are related to the parser state above but are special cases
        var stringChar = "";    // the character used to start the current string
        var multiline = meta.inMultilineComment;

        for (var i = 0; i < line.length; i++) {
            var c = line.charAt(i);

            // check if we're in a comment and whether this character ends the comment
            if (currentStyle == K.C_STYLE_COMMENT) {
                if (c == "/" && /\*$/.test(buffer)) { // has the c-style comment just ended?
                    currentRegion.stop = i + 1;
                    this.addRegion(regions, currentStyle, currentRegion);
                    currentRegion = {};
                    currentStyle = undefined;
                    multiline = false;
                    buffer = "";
                } else {
                    if (buffer == "") currentRegion = { start: i };
                    buffer += c;
                }

                continue;
            }

            if (this.isWhiteSpaceOrPunctuation(c)) {
                // check if we're in a string
                if (currentStyle == K.STRING) {
                    // if this is not an unescaped end quote (either a single quote or double quote to match how the string started) then keep going
                    if ( ! (c == stringChar && !/\\$/.test(buffer))) {
                        if (buffer == "") currentRegion = { start: i };
                        buffer += c;
                        continue;
                    }
                }

                // if the buffer is full, add it to the regions
                if (buffer != "") {
                    currentRegion.stop = i;

                    if (currentStyle != K.STRING) {   // if this is a string, we're all set to add it; if not, figure out if its a keyword
                        if (this.keywords.indexOf(buffer) != -1) {
                            // the buffer contains a keyword
                            currentStyle = K.KEYWORD;
                        } else {
                            currentStyle = K.OTHER;
                        }
                    }
                    this.addRegion(regions, currentStyle, currentRegion);
                    currentRegion = {};
                    stringChar = "";
                    buffer = "";
                    // i don't clear the current style here so I can check if it was a string below
                }

                if (this.isPunctuation(c)) {
                    if (c == "*" && i > 0 && (line.charAt(i - 1) == "/")) {
                        // remove the previous region in the punctuation bucket, which is a forward slash
                        regions[K.PUNCTUATION].pop();

                        // we are in a c-style comment
                        multiline = true;
                        currentStyle = K.C_STYLE_COMMENT;
                        currentRegion = { start: i - 1 };
                        buffer = "/*";
                        continue;
                    }

                    // check for a line comment; this ends the parsing for the rest of the line
                    if (c == '/' && i > 0 && (line.charAt(i - 1) == '/')) {
                        currentRegion = { start: i - 1, stop: line.length };
                        currentStyle = K.LINE_COMMENT;
                        this.addRegion(regions, currentStyle, currentRegion);
                        buffer = "";
                        currentStyle = undefined;
                        currentRegion = {};
                        break;      // once we get a line comment, we're done!
                    }

                    // add an ad-hoc region for just this one punctuation character
                    this.addRegion(regions, K.PUNCTUATION, { start: i, stop: i + 1 });
                }

                // find out if the current quote is the end or the beginning of the string
                if ((c == "'" || c == '"') && (currentStyle != K.STRING)) {
                    currentStyle = K.STRING;
                    stringChar = c;
                } else {
                    currentStyle = undefined;
                }

                continue;
            }

            if (buffer == "") currentRegion = { start: i };
            buffer += c;
        }

        // check for a trailing character inside of a string or a comment
        if (buffer != "") {
            if (!currentStyle) currentStyle = K.OTHER;
            currentRegion.stop = line.length;
            this.addRegion(regions, currentStyle, currentRegion);
        }

        var newMeta = { inMultilineComment: multiline };
        if (meta.inJavaScript) newMeta.inJavaScript = meta.inJavaScript;

        return { regions: regions, meta: newMeta };
    },

    addRegion: function(regions, type, data) {
        if (!regions[type]) regions[type] = [];
        regions[type].push(data);
    },

    isWhiteSpaceOrPunctuation: function(ch) {
        return this.isPunctuation(ch) || this.isWhiteSpace(ch);
    },

    isPunctuation: function(ch) {
        return this.punctuation.indexOf(ch) != -1;
    },

    isWhiteSpace: function(ch) {
        return ch == " ";
    }
});

}

if(!dojo._hasResource["bespin.syntax.simple.css"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.syntax.simple.css"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

// = CSS Syntax Highlighting Implementation =
//
// You can guess what this does. ;-)

dojo.provide("bespin.syntax.simple.css");


// ** {{{ bespin.syntax.simple.CSS }}} **
//
// Tracks syntax highlighting data on a per-line basis. This is a quick-and-dirty implementation that
// does the right thing for key/value pairs, #000000, and the like.
// Doesn't actually grok the zones of "propertykey: propertyvalue" as it should.

bespin.syntax.Constants = {
    C_STYLE_COMMENT: "c-comment",
    STRING: "string",
    KEYWORD: "keyword",
    PUNCTUATION: "punctuation",
    OTHER: "plain",
    NAME: "attribute-name",
    VALUE: "attribute-value",
    IMPORTANT: "important",
    COLOR: "color",
    SIZES: "sizes",
    ID: "cssid",
    COLOR_OR_ID: "color_or_id"
};

dojo.declare("bespin.syntax.simple.CSS", null, {
    keywords: ['ascent', 'azimuth', 'background-attachment', 'background-color', 'background-image', 'background-position',
        'background-repeat', 'background', 'baseline', 'bbox', 'border-collapse', 'border-color', 'border-spacing', 'border-style',
        'border-top', 'border-right', 'border-bottom', 'border-left', 'border-top-color', 'border-right-color', 'border-bottom-color',
        'border-left-color', 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style', 'border-top-width',
        'border-right-width', 'border-bottom-width', 'border-left-width', 'border-width', 'border', 'cap-height', 'caption-side', 'centerline',
        'clear', 'clip', 'color', 'content', 'counter-increment', 'counter-reset', 'cue-after', 'cue-before', 'cue', 'cursor', 'definition-src',
        'descent', 'direction', 'display', 'elevation', 'empty-cells', 'float', 'font-size-adjust', 'font-family', 'font-size', 'font-stretch',
        'font-style', 'font-variant', 'font-weight', 'font', 'height', 'letter-spacing', 'line-height', 'list-style-image', 'list-style-position',
        'list-style-type', 'list-style', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'margin', 'marker-offset', 'marks', 'mathline',
        'max-height','max-width', 'min-height', 'min-width', 'orphans', 'outline-color', 'outline-style', 'outline-width', 'outline', 'overflow',
        'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'padding', 'page', 'page-break-after', 'page-break-before',
        'page-break-inside', 'pause', 'pause-after', 'pause-before', 'pitch', 'pitch-range', 'play-during', 'position',
        'quotes', 'richness', 'size', 'slope', 'src', 'speak-header', 'speak-numeral', 'speak-punctuation', 'speak', 'speech-rate', 'stemh', 'stemv',
        'stress', 'table-layout', 'text-align', 'text-decoration', 'text-indent', 'text-shadow', 'text-transform', 'unicode-bidi', 'unicode-range',
        'units-per-em', 'vertical-align', 'visibility', 'voice-family', 'volume', 'white-space', 'widows', 'width', 'widths', 'word-spacing',
        'x-height', 'z-index'],

    values: ['above', 'absolute', 'all', 'always', 'aqua', 'armenian', 'attr', 'aural', 'auto', 'avoid', 'baseline', 'behind', 'below',
        'bidi-override', 'black', 'blink', 'block', 'blue', 'bold', 'bolder', 'both', 'bottom', 'braille', 'capitalize', 'caption',
        'center', 'center-left', 'center-right', 'circle', 'close-quote', 'code', 'collapse', 'compact', 'condensed',
        'continuous', 'counter', 'counters', 'crop', 'cross', 'crosshair', 'cursive', 'dashed', 'decimal', 'decimal-leading-zero', 'default',
        'digits', 'disc', 'dotted', 'double', 'embed', 'embossed', 'e-resize', 'expanded', 'extra-condensed', 'extra-expanded', 'fantasy',
        'far-left', 'far-right', 'fast', 'faster', 'fixed', 'format', 'fuchsia', 'gray', 'green', 'groove', 'handheld', 'hebrew', 'help',
        'hidden', 'hide', 'high', 'higher', 'icon', 'inline-table', 'inline', 'inset', 'inside', 'invert',
        'italic', 'justify', 'landscape', 'large', 'larger', 'left-side', 'left', 'leftwards', 'level', 'lighter', 'lime', 'line-through',
        'list-item', 'local', 'loud', 'lower-alpha', 'lowercase', 'lower-greek', 'lower-latin', 'lower-roman', 'lower', 'low', 'ltr', 'marker',
        'maroon', 'medium', 'message-box', 'middle', 'mix', 'move', 'narrower', 'navy', 'ne-resize', 'no-close-quote', 'none', 'no-open-quote',
        'no-repeat', 'normal', 'nowrap', 'n-resize', 'nw-resize', 'oblique', 'olive', 'once', 'open-quote', 'outset', 'outside', 'overline',
        'pointer', 'portrait', 'pre', 'print', 'projection', 'purple', 'red', 'relative', 'repeat', 'repeat-x', 'repeat-y', 'rgb', 'ridge',
        'right', 'right-side', 'rightwards', 'rtl', 'run-in', 'screen', 'scroll', 'semi-condensed', 'semi-expanded', 'separate', 'se-resize',
        'show', 'silent', 'silver', 'slower', 'slow', 'small', 'small-caps', 'small-caption', 'smaller', 'soft', 'solid', 'speech', 'spell-out',
        'square', 's-resize', 'static', 'status-bar', 'sub', 'super', 'sw-resize', 'table-caption', 'table-cell', 'table-column',
        'table-column-group', 'table-footer-group', 'table-header-group', 'table-row', 'table-row-group', 'teal', 'text-bottom', 'text-top',
        'thick', 'thin', 'top', 'transparent', 'tty', 'tv', 'ultra-condensed', 'ultra-expanded', 'underline', 'upper-alpha', 'uppercase',
        'upper-latin', 'upper-roman', 'url', 'visible', 'wait', 'white', 'wider', 'w-resize', 'x-fast', 'x-high', 'x-large', 'x-loud', 'x-low',
        'x-slow', 'x-small', 'x-soft', 'xx-large', 'xx-small', 'yellow',
        'monospace', 'tahoma', 'verdana', 'arial', 'helvetica', 'sans-serif', 'serif'],

    sizeRegex: "(?:em|pt|px|%)",

    important: '!important',

    punctuation: '{ } / + * . , ; ( ) ? : = " \''.split(" "),

    highlight: function(line, meta) {
        var K = bespin.syntax.Constants;    // aliasing the constants for shorter reference ;-)

        var regions = {};  // contains the individual style types as keys, with array of start/stop positions as value

        if (!meta) meta = {}; // may not get it first time

        // current state, maintained as we parse through each character in the line; values at any time should be consistent
        var currentStyle = (meta.inMultilineComment) ? K.C_STYLE_COMMENT : undefined;
        var currentRegion = {}; // should always have a start property for a non-blank buffer
        var buffer = "";

        // these properties are related to the parser state above but are special cases
        var stringChar = "";    // the character used to start the current string
        var multiline = meta.inMultilineComment;  // this line contains an unterminated multi-line comment

        for (var i = 0; i < line.length; i++) {
            var c = line.charAt(i);

            // check if we're in a comment and whether this character ends the comment
            if (currentStyle == K.C_STYLE_COMMENT) {
                if (c == "/" && /\*$/.test(buffer)) { // has the c-style comment just ended?
                    currentRegion.stop = i + 1; // get the final / too
                    this.addRegion(regions, currentStyle, currentRegion);
                    currentRegion = {};
                    currentStyle = undefined;
                    multiline = false;
                    buffer = "";
                } else {
                    if (buffer == "") currentRegion = { start: i };
                    buffer += c;
                }

                continue;
            }

            // check if we have a hash character
            if (this.isHashChar(c)) {
                 currentStyle = K.COLOR_OR_ID;

                 if (buffer == "") currentRegion = { start: i };
                 buffer += c;

                 continue;
            }


            if (this.isWhiteSpaceOrPunctuation(c)) {
                // check if we're in a string
                if (currentStyle == K.STRING) {
                    // if this is not an unescaped end quote (either a single quote or double quote to match how the string started) then keep going
                    if ( ! (c == stringChar && !/\\$/.test(buffer))) {
                        if (buffer == "") currentRegion = { start: i };
                        buffer += c;
                        continue;
                    }
                }

                if (currentStyle == K.COLOR_OR_ID) {
                    // if this is not an unescaped end quote (either a single quote or double quote to match how the string started) then keep going
                    if (buffer.match(/#[0-9AaBbCcDdEeFf]{3,6}/)) {
                        currentStyle = K.COLOR;
                    } else {
                        currentStyle = K.OTHER;
                    }
                    currentRegion.stop = i;

                    this.addRegion(regions, currentStyle, currentRegion);

                    currentRegion = { start: i }; // clear
                    stringChar = "";
                    buffer = c;

                    currentStyle = undefined;

                    continue;
                }

                // if the buffer is full, add it to the regions
                if (buffer != "") {
                    currentRegion.stop = i;

                    // if this is a string, we're all set to add it; if not, figure out if its a keyword, value, or important
                    if (currentStyle != K.STRING) {
                        if (this.keywords.indexOf(buffer) != -1) {
                            // the buffer contains a keyword
                            currentStyle = K.KEYWORD;
                        } else if (this.values.indexOf(buffer.toLowerCase()) != -1) {
                            currentStyle = K.VALUE;
                        } else if (buffer.match(this.sizeRegex)) {
                            currentStyle = K.SIZE;
                        } else if (this.important.indexOf(buffer) != -1) {
                            currentStyle = K.IMPORTANT;
                        } else {
                            currentStyle = K.OTHER;
                        }
                    }
                    this.addRegion(regions, currentStyle, currentRegion);
                    currentRegion = {};
                    stringChar = "";
                    buffer = "";
                    // i don't clear the current style here so I can check if it was a string below
                }

                if (this.isPunctuation(c)) {
                    if (c == "*" && i > 0 && (line.charAt(i - 1) == "/")) {
                        // remove the previous region in the punctuation bucket, which is a forward slash
                        regions[K.PUNCTUATION].pop();

                        // we are in a c-style comment
                        multiline = true;
                        currentStyle = K.C_STYLE_COMMENT;
                        currentRegion = { start: i - 1 };
                        buffer = "/*";
                        continue;
                    }

                    // add an ad-hoc region for just this one punctuation character
                    this.addRegion(regions, K.PUNCTUATION, { start: i, stop: i + 1 });
                }

                // find out if the current quote is the end or the beginning of the string
                if ((c == "'" || c == '"') && (currentStyle != K.STRING)) {
                    currentStyle = K.STRING;
                    stringChar = c;
                } else {
                    currentStyle = undefined;
                }

                continue;
            }

            if (buffer == "") currentRegion = { start: i };
            buffer += c;
        }

        // check for a trailing character inside of a string or a comment
        if (buffer != "") {
            if (!currentStyle) currentStyle = K.OTHER;
            currentRegion.stop = line.length;
            this.addRegion(regions, currentStyle, currentRegion);
        }

        return { regions: regions, meta: { inMultilineComment: multiline } };
    },

    addRegion: function(regions, type, data) {
        if (!regions[type]) regions[type] = [];
        regions[type].push(data);
    },

    isHashChar: function(ch) {
        return ch == "#";
    },

    isWhiteSpaceOrPunctuation: function(ch) {
        return this.isPunctuation(ch) || this.isWhiteSpace(ch);
    },

    isPunctuation: function(ch) {
        return this.punctuation.indexOf(ch) != -1;
    },

    isWhiteSpace: function(ch) {
        return ch == " ";
    }
});

}

if(!dojo._hasResource["bespin.syntax.simple.html"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.syntax.simple.html"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

// = HTML Syntax Highlighting Implementation =
//
// Module for syntax highlighting HTML.

dojo.provide("bespin.syntax.simple.html");

// ** {{{ bespin.syntax.simple.HTML }}} **
//
// Tracks syntax highlighting data on a per-line basis. This is a quick-and-dirty implementation that
// supports keywords and the like, but doesn't actually understand HTML as it should.

bespin.syntax.HTMLConstants = {
    HTML_STYLE_COMMENT: "comment",
    STRING: "string",
    KEYWORD: "keyword",
    PUNCTUATION: "punctuation",
    OTHER: "plain",
    ATTR_NAME: "attname"
};


dojo.declare("bespin.syntax.simple.HTML", null, {
    punctuation: '< > = " \'',

    highlight: function(line, meta) {
        if (!meta) meta = {};

        var K = bespin.syntax.HTMLConstants;    // aliasing the constants for shorter reference ;-)

        var regions = {};                       // contains the individual style types as keys, with array of start/stop positions as value

        // current state, maintained as we parse through each character in the line; values at any time should be consistent
        var currentStyle = (meta.inMultilineComment) ? K.HTML_STYLE_COMMENT : undefined;
        var currentRegion = {}; // should always have a start property for a non-blank buffer
        var buffer = "";

        // these properties are related to the parser state above but are special cases
        var stringChar = "";    // the character used to start the current string
        var multiline = meta.inMultilineComment;  // this line contains an unterminated multi-line comment

        if (meta.inJavaScript) {
            if (line.indexOf('</script>') > 0) {
                meta.inJavaScript = false;
            } else {
                return bespin.syntax.simple.Resolver.resolve("js").highlight(line, meta);
            }
        } else {
            meta.inJavaScript = false;
        }

        if (line.indexOf('<script') > 0) {
            meta.inJavaScript = true;
        }

        for (var i = 0; i < line.length; i++) {
            var c = line.charAt(i);

            // check if we're in a comment and whether this character ends the comment
            if (currentStyle == K.HTML_STYLE_COMMENT) {
                if (c == ">" && bespin.util.endsWith(buffer, "--") &&
                        ! (/<!--/.test(buffer)  && !meta.inMultiLineComment && currentRegion.start == i - 4) &&
                        ! (/<!---/.test(buffer) && !meta.inMultiLineComment && currentRegion.start == i - 5)   // I'm really tired
                        ) { // has the multiline comment just ended?
                    currentRegion.stop = i + 1;
                    this.addRegion(regions, currentStyle, currentRegion);
                    currentRegion = {};
                    currentStyle = undefined;
                    multiline = false;
                    buffer = "";
                } else {
                    if (buffer == "") currentRegion = { start: i };
                    buffer += c;
                }

                continue;
            }

            if (this.isWhiteSpaceOrPunctuation(c)) {
                // check if we're in a string
                if (currentStyle == K.STRING) {
                    // if this is not an unescaped end quote (either a single quote or double quote to match how the string started) then keep going
                    if ( ! (c == stringChar && !/\\$/.test(buffer))) {
                        if (buffer == "") currentRegion = { start: i };
                        buffer += c;
                        continue;
                    }
                }

                // if the buffer is full, add it to the regions
                if (buffer != "") {
                    currentRegion.stop = i;

                    if (currentStyle != K.STRING) {   // if this is a string, we're all set to add it; if not, figure out if its a keyword
                        if (line.charAt(currentRegion.start - 1) == '<') {
                            currentStyle = K.KEYWORD;
                        } else if (line.charAt(currentRegion.stop) == '=') { // an attribute (TODO allow for spaces)
                            currentStyle = K.ATTR_NAME;
                        } else {
                            currentStyle = K.OTHER;
                        }
                    }
                    this.addRegion(regions, currentStyle, currentRegion);
                    currentRegion = {};
                    stringChar = "";
                    buffer = "";
                    // i don't clear the current style here so I can check if it was a string below
                }

                if (this.isPunctuation(c)) {
                    if (c == "<" && (line.length > i + 3) && (line.substring(i, i + 4) == "<!--")) {
                        // we are in a multiline comment
                        multiline = true;
                        currentStyle = K.HTML_STYLE_COMMENT;
                        currentRegion = { start: i };
                        buffer = "<!--";
                        i += 3;
                        continue;
                    }

                    // add an ad-hoc region for just this one punctuation character
                    this.addRegion(regions, K.PUNCTUATION, { start: i, stop: i + 1 });
                }

                // find out if the current quote is the end or the beginning of the string
                if ((c == "'" || c == '"') && (currentStyle != K.STRING)) {
                    currentStyle = K.STRING;
                    stringChar = c;
                } else {
                    currentStyle = undefined;
                }

                continue;
            }

            if (buffer == "") currentRegion = { start: i };
            buffer += c;
        }

        // check for a trailing character inside of a string or a comment
        if (buffer != "") {
            if (!currentStyle) currentStyle = K.OTHER;
            currentRegion.stop = line.length;
            this.addRegion(regions, currentStyle, currentRegion);
        }

        return { regions: regions, meta: { inMultilineComment: multiline, inJavaScript: meta.inJavaScript } };
    },

    addRegion: function(regions, type, data) {
        if (!regions[type]) regions[type] = [];
        regions[type].push(data);
    },

    isWhiteSpaceOrPunctuation: function(ch) {
        return this.isPunctuation(ch) || this.isWhiteSpace(ch);
    },

    isPunctuation: function(ch) {
        return this.punctuation.indexOf(ch) != -1;
    },

    isWhiteSpace: function(ch) {
        return ch == " ";
    }
});

}

if(!dojo._hasResource["bespin.syntax.simple.php"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.syntax.simple.php"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

// = PHP Syntax Highlighting Implementation =
//
// Module for syntax highlighting PHP.

dojo.provide("bespin.syntax.simple.php");

// ** {{{ bespin.syntax.simple.PHP }}} **
//
// Tracks syntax highlighting data on a per-line basis. This is a quick-and-dirty implementation that
// supports five basic highlights: keywords, punctuation, strings, comments, and "everything else", all
// lumped into one last bucket.

bespin.syntax.PHPConstants = {
    C_STYLE_COMMENT: "c-comment",
    LINE_COMMENT: "comment",
    STRING: "string",
    KEYWORD: "keyword",
    PUNCTUATION: "punctuation",
    OTHER: "plain"
};

dojo.declare("bespin.syntax.simple.PHP", null, {
    keywords: 'include require include_once require_once for foreach as if elseif else while do endwhile ' +
        'endif switch case endswitch endfor endforeach ' +
        'return break continue ' +
        'language class const ' +
        'default DEFAULT_INCLUDE_PATH extends ' +
        'E_ALL E_COMPILE_ERROR E_COMPILE_WARNING ' +
        'E_CORE_ERROR E_CORE_WARNING E_ERROR ' +
        'E_NOTICE E_PARSE E_STRICT E_USER_ERROR ' +
        'E_USER_NOTICE E_USER_WARNING E_WARNING ' +
        'false function interface new null ' +
        'PEAR_EXTENSION_DIR PEAR_INSTALL_DIR ' +
        'PHP_BINDIR PHP_CONFIG_FILE_PATH PHP_DATADIR ' +
        'PHP_EXTENSION_DIR PHP_LIBDIR ' +
        'PHP_LOCALSTATEDIR PHP_OS ' +
        'PHP_OUTPUT_HANDLER_CONT PHP_OUTPUT_HANDLER_END ' +
        'PHP_OUTPUT_HANDLER_START PHP_SYSCONFDIR ' +
        'PHP_VERSION private public self true ' +
        'var __CLASS__ __FILE__ __LINE__ __METHOD__ __FUNCTION__ ' +
        'abs acos acosh addcslashes addslashes aggregate ' +
        'aggregate_methods aggregate_methods_by_list ' +
        'aggregate_methods_by_regexp ' +
        'aggregate_properties ' +
        'aggregate_properties_by_list ' +
        'aggregate_properties_by_regexp aggregation_info ' +
        'apache_child_terminate apache_get_version ' +
        'apache_lookup_uri apache_note ' +
        'apache_request_headers apache_response_headers ' +
        'apache_setenv array array_change_key_case ' +
        'array_chunk array_count_values array_diff ' +
        'array_diff_assoc array_fill array_filter ' +
        'array_flip array_intersect ' +
        'array_intersect_assoc array_keys ' +
        'array_key_exists array_map array_merge ' +
        'array_merge_recursive array_multisort ' +
        'array_pad array_pop array_push array_rand ' +
        'array_reduce array_reverse array_search ' +
        'array_shift array_slice array_splice ' +
        'array_sum array_unique array_unshift ' +
        'array_values array_walk arsort asin ' +
        'asinh asort assert assert_options atan ' +
        'atan2 atanh base64_decode base64_encode ' +
        'basename base_convert bcadd bccomp ' +
        'bcdiv bcmod bcmul bcpow bcscale ' +
        'bcsqrt bcsub bin2hex bindec ' +
        'bindtextdomain bind_textdomain_codeset ' +
        'bzclose bzcompress bzdecompress bzerrno ' +
        'bzerror bzerrstr bzflush bzopen bzread ' +
        'bzwrite call_user_func call_user_func_array ' +
        'call_user_method call_user_method_array ' +
        'cal_days_in_month cal_from_jd cal_info ' +
        'cal_to_jd ceil chdir checkdate ' +
        'checkdnsrr chgrp chmod chop chown ' +
        'chr chunk_split class_exists ' +
        'clearstatcache closedir closelog compact ' +
        'connection_aborted connection_status ' +
        'constant convert_cyr_string copy cos ' +
        'cosh count count_chars crc32 ' +
        'create_function crypt ctype_alnum ' +
        'ctype_alpha ctype_cntrl ctype_digit ' +
        'ctype_graph ctype_lower ctype_print ' +
        'ctype_punct ctype_space ctype_upper ' +
        'ctype_xdigit current date dba_close ' +
        'dba_delete dba_exists dba_fetch ' +
        'dba_firstkey dba_handlers dba_insert ' +
        'dba_list dba_nextkey dba_open ' +
        'dba_optimize dba_popen dba_replace ' +
        'dba_sync dcgettext dcngettext deaggregate ' +
        'debug_backtrace debug_zval_dump decbin ' +
        'dechex decoct define defined ' +
        'define_syslog_variables deg2rad dgettext ' +
        'die dir dirname diskfreespace ' +
        'disk_free_space disk_total_space dl ' +
        'dngettext doubleval each easter_date ' +
        'easter_days echo empty end ereg ' +
        'eregi eregi_replace ereg_replace ' +
        'error_log error_reporting escapeshellarg ' +
        'escapeshellcmd eval exec exif_imagetype ' +
        'exif_read_data exif_tagname exif_thumbnail ' +
        'exit exp explode expm1 ' +
        'extension_loaded extract ezmlm_hash ' +
        'fclose feof fflush fgetc fgetcsv ' +
        'fgets fgetss file fileatime filectime ' +
        'filegroup fileinode filemtime fileowner ' +
        'fileperms filepro filepro_fieldcount ' +
        'filepro_fieldname filepro_fieldtype ' +
        'filepro_fieldwidth filepro_retrieve ' +
        'filepro_rowcount filesize filetype ' +
        'file_exists file_get_contents floatval ' +
        'flock floor flush fmod fnmatch ' +
        'fopen fpassthru fputs fread frenchtojd ' +
        'fscanf fseek fsockopen fstat ftell ' +
        'ftok ftp_cdup ftp_chdir ftp_close ' +
        'ftp_connect ftp_delete ftp_exec ftp_fget ' +
        'ftp_fput ftp_get ftp_get_option ftp_login ' +
        'ftp_mdtm ftp_mkdir ftp_nb_continue ' +
        'ftp_nb_fget ftp_nb_fput ftp_nb_get ' +
        'ftp_nb_put ftp_nlist ftp_pasv ftp_put ' +
        'ftp_pwd ftp_quit ftp_rawlist ftp_rename ' +
        'ftp_rmdir ftp_set_option ftp_site ' +
        'ftp_size ftp_ssl_connect ftp_systype ' +
        'ftruncate function_exists func_get_arg ' +
        'func_get_args func_num_args fwrite ' +
        'getallheaders getcwd getdate getenv ' +
        'gethostbyaddr gethostbyname gethostbynamel ' +
        'getimagesize getlastmod getmxrr getmygid ' +
        'getmyinode getmypid getmyuid getopt ' +
        'getprotobyname getprotobynumber getrandmax ' +
        'getrusage getservbyname getservbyport ' +
        'gettext gettimeofday gettype get_browser ' +
        'get_cfg_var get_class get_class_methods ' +
        'get_class_vars get_current_user ' +
        'get_declared_classes get_defined_constants ' +
        'get_defined_functions get_defined_vars ' +
        'get_extension_funcs get_html_translation_table ' +
        'get_included_files get_include_path ' +
        'get_loaded_extensions get_magic_quotes_gpc ' +
        'get_magic_quotes_runtime get_meta_tags ' +
        'get_object_vars get_parent_class ' +
        'get_required_files get_resource_type glob ' +
        'global gmdate gmmktime gmstrftime ' +
        'gregoriantojd gzclose gzcompress ' +
        'gzdeflate gzencode gzeof gzfile gzgetc ' +
        'gzgets gzgetss gzinflate gzopen ' +
        'gzpassthru gzputs gzread gzrewind ' +
        'gzseek gztell gzuncompress gzwrite ' +
        'header headers_sent hebrev hebrevc ' +
        'hexdec highlight_file highlight_string ' +
        'htmlentities htmlspecialchars ' +
        'html_entity_decode hypot i18n_convert ' +
        'i18n_discover_encoding i18n_http_input ' +
        'i18n_http_output i18n_internal_encoding ' +
        'i18n_ja_jp_hantozen i18n_mime_header_decode ' +
        'i18n_mime_header_encode iconv ' +
        'iconv_get_encoding iconv_set_encoding ' +
        'ignore_user_abort image_type_to_mime_type ' +
        'implode import_request_variables ini_alter ' +
        'ini_get ini_get_all ini_restore ini_set ' +
        'intval in_array ip2long iptcembed ' +
        'iptcparse isset is_a is_array is_bool ' +
        'is_callable is_dir is_double ' +
        'is_executable is_file is_finite is_float ' +
        'is_infinite is_int is_integer is_link ' +
        'is_long is_nan is_null is_numeric ' +
        'is_object is_readable is_real is_resource ' +
        'is_scalar is_string is_subclass_of ' +
        'is_uploaded_file is_writable is_writeable ' +
        'jddayofweek jdmonthname jdtofrench ' +
        'jdtogregorian jdtojewish jdtojulian ' +
        'jdtounix jewishtojd join juliantojd ' +
        'key key_exists krsort ksort lcg_value ' +
        'levenshtein link linkinfo list ' +
        'localeconv localtime log log1p log10 ' +
        'long2ip lstat ltrim magic_quotes_runtime ' +
        'mail max mbereg mberegi ' +
        'mberegi_replace mbereg_match mbereg_replace ' +
        'mbereg_search mbereg_search_getpos ' +
        'mbereg_search_getregs mbereg_search_init ' +
        'mbereg_search_pos mbereg_search_regs ' +
        'mbereg_search_setpos mbregex_encoding ' +
        'mbsplit mbstrcut mbstrlen mbstrpos ' +
        'mbstrrpos mbsubstr mb_convert_case ' +
        'mb_convert_encoding mb_convert_kana ' +
        'mb_convert_variables mb_decode_mimeheader ' +
        'mb_decode_numericentity mb_detect_encoding ' +
        'mb_detect_order mb_encode_mimeheader ' +
        'mb_encode_numericentity mb_ereg mb_eregi ' +
        'mb_eregi_replace mb_ereg_match ' +
        'mb_ereg_replace mb_ereg_search ' +
        'mb_ereg_search_getpos mb_ereg_search_getregs ' +
        'mb_ereg_search_init mb_ereg_search_pos ' +
        'mb_ereg_search_regs mb_ereg_search_setpos ' +
        'mb_get_info mb_http_input mb_http_output ' +
        'mb_internal_encoding mb_language ' +
        'mb_output_handler mb_parse_str ' +
        'mb_preferred_mime_name mb_regex_encoding ' +
        'mb_regex_set_options mb_send_mail mb_split ' +
        'mb_strcut mb_strimwidth mb_strlen ' +
        'mb_strpos mb_strrpos mb_strtolower ' +
        'mb_strtoupper mb_strwidth ' +
        'mb_substitute_character mb_substr ' +
        'mb_substr_count md5 md5_file ' +
        'memory_get_usage metaphone method_exists ' +
        'microtime min mkdir mktime ' +
        'money_format move_uploaded_file ' +
        'mt_getrandmax mt_rand mt_srand mysql ' +
        'mysql_affected_rows mysql_client_encoding ' +
        'mysql_close mysql_connect mysql_createdb ' +
        'mysql_create_db mysql_data_seek mysql_dbname ' +
        'mysql_db_name mysql_db_query mysql_dropdb ' +
        'mysql_drop_db mysql_errno mysql_error ' +
        'mysql_escape_string mysql_fetch_array ' +
        'mysql_fetch_assoc mysql_fetch_field ' +
        'mysql_fetch_lengths mysql_fetch_object ' +
        'mysql_fetch_row mysql_fieldflags ' +
        'mysql_fieldlen mysql_fieldname ' +
        'mysql_fieldtable mysql_fieldtype ' +
        'mysql_field_flags mysql_field_len ' +
        'mysql_field_name mysql_field_seek ' +
        'mysql_field_table mysql_field_type ' +
        'mysql_freeresult mysql_free_result ' +
        'mysql_get_client_info mysql_get_host_info ' +
        'mysql_get_proto_info mysql_get_server_info ' +
        'mysql_info mysql_insert_id mysql_listdbs ' +
        'mysql_listfields mysql_listtables ' +
        'mysql_list_dbs mysql_list_fields ' +
        'mysql_list_processes mysql_list_tables ' +
        'mysql_numfields mysql_numrows ' +
        'mysql_num_fields mysql_num_rows ' +
        'mysql_pconnect mysql_ping mysql_query ' +
        'mysql_real_escape_string mysql_result ' +
        'mysql_selectdb mysql_select_db mysql_stat ' +
        'mysql_tablename mysql_table_name ' +
        'mysql_thread_id mysql_unbuffered_query ' +
        'natcasesort natsort next ngettext ' +
        'nl2br nl_langinfo number_format ob_clean ' +
        'ob_end_clean ob_end_flush ob_flush ' +
        'ob_get_clean ob_get_contents ob_get_flush ' +
        'ob_get_length ob_get_level ob_get_status ' +
        'ob_gzhandler ob_iconv_handler ' +
        'ob_implicit_flush ob_list_handlers ob_start ' +
        'octdec opendir openlog openssl_csr_export ' +
        'openssl_csr_export_to_file openssl_csr_new ' +
        'openssl_csr_sign openssl_error_string ' +
        'openssl_free_key openssl_get_privatekey ' +
        'openssl_get_publickey openssl_open ' +
        'openssl_pkcs7_decrypt openssl_pkcs7_encrypt ' +
        'openssl_pkcs7_sign openssl_pkcs7_verify ' +
        'openssl_pkey_export openssl_pkey_export_to_file ' +
        'openssl_pkey_free openssl_pkey_get_private ' +
        'openssl_pkey_get_public openssl_pkey_new ' +
        'openssl_private_decrypt openssl_private_encrypt ' +
        'openssl_public_decrypt openssl_public_encrypt ' +
        'openssl_seal openssl_sign openssl_verify ' +
        'openssl_x509_checkpurpose ' +
        'openssl_x509_check_private_key ' +
        'openssl_x509_export openssl_x509_export_to_file ' +
        'openssl_x509_free openssl_x509_parse ' +
        'openssl_x509_read ord output_add_rewrite_var ' +
        'output_reset_rewrite_vars overload pack ' +
        'parse_ini_file parse_str parse_url ' +
        'passthru pathinfo pclose pfsockopen ' +
        'pg_affected_rows pg_cancel_query ' +
        'pg_clientencoding pg_client_encoding ' +
        'pg_close pg_cmdtuples pg_connect ' +
        'pg_connection_busy pg_connection_reset ' +
        'pg_connection_status pg_convert pg_copy_from ' +
        'pg_copy_to pg_dbname pg_delete ' +
        'pg_end_copy pg_errormessage pg_escape_bytea ' +
        'pg_escape_string pg_exec pg_fetch_all ' +
        'pg_fetch_array pg_fetch_assoc ' +
        'pg_fetch_object pg_fetch_result pg_fetch_row ' +
        'pg_fieldisnull pg_fieldname pg_fieldnum ' +
        'pg_fieldprtlen pg_fieldsize pg_fieldtype ' +
        'pg_field_is_null pg_field_name pg_field_num ' +
        'pg_field_prtlen pg_field_size pg_field_type ' +
        'pg_freeresult pg_free_result pg_getlastoid ' +
        'pg_get_notify pg_get_pid pg_get_result ' +
        'pg_host pg_insert pg_last_error ' +
        'pg_last_notice pg_last_oid pg_loclose ' +
        'pg_locreate pg_loexport pg_loimport ' +
        'pg_loopen pg_loread pg_loreadall ' +
        'pg_lounlink pg_lowrite pg_lo_close ' +
        'pg_lo_create pg_lo_export pg_lo_import ' +
        'pg_lo_open pg_lo_read pg_lo_read_all ' +
        'pg_lo_seek pg_lo_tell pg_lo_unlink ' +
        'pg_lo_write pg_meta_data pg_numfields ' +
        'pg_numrows pg_num_fields pg_num_rows ' +
        'pg_options pg_pconnect pg_ping pg_port ' +
        'pg_put_line pg_query pg_result ' +
        'pg_result_error pg_result_seek ' +
        'pg_result_status pg_select pg_send_query ' +
        'pg_setclientencoding pg_set_client_encoding ' +
        'pg_trace pg_tty pg_unescape_bytea ' +
        'pg_untrace pg_update phpcredits phpinfo ' +
        'phpversion php_ini_scanned_files ' +
        'php_logo_guid php_sapi_name php_uname pi ' +
        'popen pos posix_ctermid posix_errno ' +
        'posix_getcwd posix_getegid posix_geteuid ' +
        'posix_getgid posix_getgrgid posix_getgrnam ' +
        'posix_getgroups posix_getlogin posix_getpgid ' +
        'posix_getpgrp posix_getpid posix_getppid ' +
        'posix_getpwnam posix_getpwuid ' +
        'posix_getrlimit posix_getsid posix_getuid ' +
        'posix_get_last_error posix_isatty posix_kill ' +
        'posix_mkfifo posix_setegid posix_seteuid ' +
        'posix_setgid posix_setpgid posix_setsid ' +
        'posix_setuid posix_strerror posix_times ' +
        'posix_ttyname posix_uname pow preg_grep ' +
        'preg_match preg_match_all preg_quote ' +
        'preg_replace preg_replace_callback ' +
        'preg_split prev print printf print_r ' +
        'proc_close proc_open putenv ' +
        'quoted_printable_decode quotemeta rad2deg ' +
        'rand range rawurldecode rawurlencode ' +
        'readdir readfile readgzfile readlink ' +
        'read_exif_data realpath ' +
        'register_shutdown_function ' +
        'register_tick_function rename reset ' +
        'restore_error_handler restore_include_path ' +
        'rewind rewinddir rmdir round rsort ' +
        'rtrim sem_acquire sem_get sem_release ' +
        'sem_remove serialize session_cache_expire ' +
        'session_cache_limiter session_decode ' +
        'session_destroy session_encode ' +
        'session_get_cookie_params session_id ' +
        'session_is_registered session_module_name ' +
        'session_name session_regenerate_id ' +
        'session_register session_save_path ' +
        'session_set_cookie_params ' +
        'session_set_save_handler session_start ' +
        'session_unregister session_unset ' +
        'session_write_close setcookie setlocale ' +
        'settype set_error_handler set_file_buffer ' +
        'set_include_path set_magic_quotes_runtime ' +
        'set_socket_blocking set_time_limit sha1 ' +
        'sha1_file shell_exec shmop_close ' +
        'shmop_delete shmop_open shmop_read ' +
        'shmop_size shmop_write shm_attach ' +
        'shm_detach shm_get_var shm_put_var ' +
        'shm_remove shm_remove_var show_source ' +
        'shuffle similar_text sin sinh sizeof ' +
        'sleep socket_accept socket_bind ' +
        'socket_clear_error socket_close ' +
        'socket_connect socket_create ' +
        'socket_create_listen socket_create_pair ' +
        'socket_getopt socket_getpeername ' +
        'socket_getsockname socket_get_option ' +
        'socket_get_status socket_iovec_add ' +
        'socket_iovec_alloc socket_iovec_delete ' +
        'socket_iovec_fetch socket_iovec_free ' +
        'socket_iovec_set socket_last_error ' +
        'socket_listen socket_read socket_readv ' +
        'socket_recv socket_recvfrom socket_recvmsg ' +
        'socket_select socket_send socket_sendmsg ' +
        'socket_sendto socket_setopt socket_set_block ' +
        'socket_set_blocking socket_set_nonblock ' +
        'socket_set_option socket_set_timeout ' +
        'socket_shutdown socket_strerror socket_write ' +
        'socket_writev sort soundex split ' +
        'spliti sprintf sql_regcase sqrt srand ' +
        'sscanf stat static strcasecmp strchr ' +
        'strcmp strcoll strcspn ' +
        'stream_context_create ' +
        'stream_context_get_options ' +
        'stream_context_set_option ' +
        'stream_context_set_params stream_filter_append ' +
        'stream_filter_prepend stream_get_meta_data ' +
        'stream_register_wrapper stream_select ' +
        'stream_set_blocking stream_set_timeout ' +
        'stream_set_write_buffer stream_wrapper_register ' +
        'strftime stripcslashes stripslashes ' +
        'strip_tags stristr strlen strnatcasecmp ' +
        'strnatcmp strncasecmp strncmp strpos ' +
        'strrchr strrev strrpos strspn strstr ' +
        'strtok strtolower strtotime strtoupper ' +
        'strtr strval str_pad str_repeat ' +
        'str_replace str_rot13 str_shuffle ' +
        'str_word_count substr substr_count ' +
        'substr_replace symlink syslog system ' +
        'tan tanh tempnam textdomain time ' +
        'tmpfile token_get_all token_name touch ' +
        'trigger_error trim uasort ucfirst ' +
        'ucwords uksort umask uniqid unixtojd ' +
        'unlink unpack unregister_tick_function ' +
        'unserialize unset urldecode urlencode ' +
        'user_error usleep usort utf8_decode ' +
        'utf8_encode var_dump var_export ' +
        'version_compare virtual vprintf vsprintf ' +
        'wddx_add_vars wddx_deserialize ' +
        'wddx_packet_end wddx_packet_start ' +
        'wddx_serialize_value wddx_serialize_vars ' +
        'wordwrap xml_error_string ' +
        'xml_get_current_byte_index ' +
        'xml_get_current_column_number ' +
        'xml_get_current_line_number xml_get_error_code ' +
        'xml_parse xml_parser_create ' +
        'xml_parser_create_ns xml_parser_free ' +
        'xml_parser_get_option xml_parser_set_option ' +
        'xml_parse_into_struct ' +
        'xml_set_character_data_handler ' +
        'xml_set_default_handler xml_set_element_handler ' +
        'xml_set_end_namespace_decl_handler ' +
        'xml_set_external_entity_ref_handler ' +
        'xml_set_notation_decl_handler xml_set_object ' +
        'xml_set_processing_instruction_handler ' +
        'xml_set_start_namespace_decl_handler ' +
        'xml_set_unparsed_entity_decl_handler yp_all ' +
        'yp_cat yp_errno yp_err_string yp_first ' +
        'yp_get_default_domain yp_master yp_match ' +
        'yp_next yp_order zend_logo_guid ' +
        'zend_version zlib_get_coding_type'.split(" "),

    punctuation: '{ } ?> <?= <?php > < / + - % * . , ; ( ) ? : = " \''.split(" "),

    highlight: function(line, meta) {
        if (!meta) meta = {};

        var K = bespin.syntax.PHPConstants;    // aliasing the constants for shorter reference ;-)

        var regions = {};                               // contains the individual style types as keys, with array of start/stop positions as value

        // current state, maintained as we parse through each character in the line; values at any time should be consistent
        var currentStyle = (meta.inMultilineComment) ? K.C_STYLE_COMMENT : undefined;
        var currentRegion = {}; // should always have a start property for a non-blank buffer
        var buffer = "";

        // these properties are related to the parser state above but are special cases
        var stringChar = "";    // the character used to start the current string
        var multiline = meta.inMultilineComment;

        for (var i = 0; i < line.length; i++) {
            var c = line.charAt(i);

            // check if we're in a comment and whether this character ends the comment
            if (currentStyle == K.C_STYLE_COMMENT) {
                if (c == "/" && /\*$/.test(buffer)) { // has the c-style comment just ended?
                    currentRegion.stop = i + 1;
                    this.addRegion(regions, currentStyle, currentRegion);
                    currentRegion = {};
                    currentStyle = undefined;
                    multiline = false;
                    buffer = "";
                } else {
                    if (buffer == "") currentRegion = { start: i };
                    buffer += c;
                }

                continue;
            }

            if (this.isWhiteSpaceOrPunctuation(c)) {
                // check if we're in a string
                if (currentStyle == K.STRING) {
                    // if this is not an unescaped end quote (either a single quote or double quote to match how the string started) then keep going
                    if ( ! (c == stringChar && !/\\$/.test(buffer))) {
                        if (buffer == "") currentRegion = { start: i };
                        buffer += c;
                        continue;
                    }
                }

                // if the buffer is full, add it to the regions
                if (buffer != "") {
                    currentRegion.stop = i;

                    if (currentStyle != K.STRING) {   // if this is a string, we're all set to add it; if not, figure out if its a keyword
                        if (this.keywords.indexOf(buffer) != -1) {
                            // the buffer contains a keyword
                            currentStyle = K.KEYWORD;
                        } else {
                            currentStyle = K.OTHER;
                        }
                    }
                    this.addRegion(regions, currentStyle, currentRegion);
                    currentRegion = {};
                    stringChar = "";
                    buffer = "";
                    // i don't clear the current style here so I can check if it was a string below
                }

                if (this.isPunctuation(c)) {
                    if (c == "*" && i > 0 && (line.charAt(i - 1) == "/")) {
                        // remove the previous region in the punctuation bucket, which is a forward slash
                        regions[K.PUNCTUATION].pop();

                        // we are in a c-style comment
                        multiline = true;
                        currentStyle = K.C_STYLE_COMMENT;
                        currentRegion = { start: i - 1 };
                        buffer = "/*";
                        continue;
                    }

                    // check for a line comment; this ends the parsing for the rest of the line
                    if (c == '/' && i > 0 && (line.charAt(i - 1) == '/')) {
                        currentRegion = { start: i - 1, stop: line.length };
                        currentStyle = K.LINE_COMMENT;
                        this.addRegion(regions, currentStyle, currentRegion);
                        buffer = "";
                        currentStyle = undefined;
                        currentRegion = {};
                        break;      // once we get a line comment, we're done!
                    }

                    // add an ad-hoc region for just this one punctuation character
                    this.addRegion(regions, K.PUNCTUATION, { start: i, stop: i + 1 });
                }

                // find out if the current quote is the end or the beginning of the string
                if ((c == "'" || c == '"') && (currentStyle != K.STRING)) {
                    currentStyle = K.STRING;
                    stringChar = c;
                } else {
                    currentStyle = undefined;
                }

                continue;
            }

            if (buffer == "") currentRegion = { start: i };
            buffer += c;
        }

        // check for a trailing character inside of a string or a comment
        if (buffer != "") {
            if (!currentStyle) currentStyle = K.OTHER;
            currentRegion.stop = line.length;
            this.addRegion(regions, currentStyle, currentRegion);
        }

        return { regions: regions, meta: { inMultilineComment: multiline } };
    },

    addRegion: function(regions, type, data) {
        if (!regions[type]) regions[type] = [];
        regions[type].push(data);
    },

    isWhiteSpaceOrPunctuation: function(ch) {
        return this.isPunctuation(ch) || this.isWhiteSpace(ch);
    },

    isPunctuation: function(ch) {
        return this.punctuation.indexOf(ch) != -1;
    },

    isWhiteSpace: function(ch) {
        return ch == " ";
    }
});

}

if(!dojo._hasResource["bespin.syntax.simple.c"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.syntax.simple.c"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

// = C Syntax Highlighting Implementation =
//
// Module for syntax highlighting C based off of the Geshi Sytax Highlighter.

dojo.provide("bespin.syntax.simple.c");

// ** {{{ bespin.syntax.simple.C }}} **
//
// Tracks syntax highlighting data on a per-line basis. This is a quick-and-dirty implementation that
// supports five basic highlights: keywords, punctuation, strings, comments, and "everything else", all
// lumped into one last bucket.

bespin.syntax.CConstants = {
    C_STYLE_COMMENT: "c-comment",
    LINE_COMMENT: "comment",
    STRING: "string",
    KEYWORD: "keyword",
    PUNCTUATION: "punctuation",
    OTHER: "plain"
};

dojo.declare("bespin.syntax.simple.C", null, {
    keywords: 'if return while case continue default do else for switch goto null false break' + 
'true function enum extern inline' +
'printf cout auto char const double float int long'+
'register short signed sizeof static string struct'+
'typedef union unsigned void volatile wchar_t #include'.split(" "),

    punctuation: '{ } / + - % * , ; ( ) ? : = " \''.split(" "),

    highlight: function(line, meta) {
        if (!meta) meta = {};

        var K = bespin.syntax.CConstants;    // aliasing the constants for shorter reference ;-)

        var regions = {};                               // contains the individual style types as keys, with array of start/stop positions as value

        // current state, maintained as we parse through each character in the line; values at any time should be consistent
        var currentStyle = (meta.inMultilineComment) ? K.C_STYLE_COMMENT : undefined;
        var currentRegion = {}; // should always have a start property for a non-blank buffer
        var buffer = "";

        // these properties are related to the parser state above but are special cases
        var stringChar = "";    // the character used to start the current string
        var multiline = meta.inMultilineComment;

        for (var i = 0; i < line.length; i++) {
            var c = line.charAt(i);

            // check if we're in a comment and whether this character ends the comment
            if (currentStyle == K.C_STYLE_COMMENT) {
                if (c == "/" && /\*$/.test(buffer)) { // has the c-style comment just ended?
                    currentRegion.stop = i + 1;
                    this.addRegion(regions, currentStyle, currentRegion);
                    currentRegion = {};
                    currentStyle = undefined;
                    multiline = false;
                    buffer = "";
                } else {
                    if (buffer == "") currentRegion = { start: i };
                    buffer += c;
                }

                continue;
            }

            if (this.isWhiteSpaceOrPunctuation(c)) {
                // check if we're in a string
                if (currentStyle == K.STRING) {
                    // if this is not an unescaped end quote (either a single quote or double quote to match how the string started) then keep going
                    if ( ! (c == stringChar && !/\\$/.test(buffer))) {
                        if (buffer == "") currentRegion = { start: i };
                        buffer += c;
                        continue;
                    }
                }

                // if the buffer is full, add it to the regions
                if (buffer != "") {
                    currentRegion.stop = i;

                    if (currentStyle != K.STRING) {   // if this is a string, we're all set to add it; if not, figure out if its a keyword
                        if (this.keywords.indexOf(buffer) != -1) {
                            // the buffer contains a keyword
                            currentStyle = K.KEYWORD;
                        } else {
                            currentStyle = K.OTHER;
                        }
                    }
                    this.addRegion(regions, currentStyle, currentRegion);
                    currentRegion = {};
                    stringChar = "";
                    buffer = "";
                    // i don't clear the current style here so I can check if it was a string below
                }

                if (this.isPunctuation(c)) {
                    if (c == "*" && i > 0 && (line.charAt(i - 1) == "/")) {
                        // remove the previous region in the punctuation bucket, which is a forward slash
                        regions[K.PUNCTUATION].pop();

                        // we are in a c-style comment
                        multiline = true;
                        currentStyle = K.C_STYLE_COMMENT;
                        currentRegion = { start: i - 1 };
                        buffer = "/*";
                        continue;
                    }

                    // check for a line comment; this ends the parsing for the rest of the line
                    if (c == '/' && i > 0 && (line.charAt(i - 1) == '/')) {
                        currentRegion = { start: i - 1, stop: line.length };
                        currentStyle = K.LINE_COMMENT;
                        this.addRegion(regions, currentStyle, currentRegion);
                        buffer = "";
                        currentStyle = undefined;
                        currentRegion = {};
                        break;      // once we get a line comment, we're done!
                    }

                    // add an ad-hoc region for just this one punctuation character
                    this.addRegion(regions, K.PUNCTUATION, { start: i, stop: i + 1 });
                }

                // find out if the current quote is the end or the beginning of the string
                if ((c == "'" || c == '"') && (currentStyle != K.STRING)) {
                    currentStyle = K.STRING;
                    stringChar = c;
                } else {
                    currentStyle = undefined;
                }

                continue;
            }

            if (buffer == "") currentRegion = { start: i };
            buffer += c;
        }

        // check for a trailing character inside of a string or a comment
        if (buffer != "") {
            if (!currentStyle) currentStyle = K.OTHER;
            currentRegion.stop = line.length;
            this.addRegion(regions, currentStyle, currentRegion);
        }

        return { regions: regions, meta: { inMultilineComment: multiline } };
    },

    addRegion: function(regions, type, data) {
        if (!regions[type]) regions[type] = [];
        regions[type].push(data);
    },

    isWhiteSpaceOrPunctuation: function(ch) {
        return this.isPunctuation(ch) || this.isWhiteSpace(ch);
    },

    isPunctuation: function(ch) {
        return this.punctuation.indexOf(ch) != -1;
    },

    isWhiteSpace: function(ch) {
        return ch == " ";
    }
});

}

if(!dojo._hasResource["bespin.syntax.simple.csharp"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.syntax.simple.csharp"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

// = C Syntax Highlighting Implementation =
//
// Module for syntax highlighting C Sharp based off of the Geshi Sytax Highlighter.

dojo.provide("bespin.syntax.simple.csharp");

// ** {{{ bespin.syntax.simple.CSharp }}} **
//
// Tracks syntax highlighting data on a per-line basis. This is a quick-and-dirty implementation that
// supports five basic highlights: keywords, punctuation, strings, comments, and "everything else", all
// lumped into one last bucket.

bespin.syntax.CSharpConstants = {
    C_STYLE_COMMENT: "c-comment",
    LINE_COMMENT: "comment",
    STRING: "string",
    KEYWORD: "keyword",
    PUNCTUATION: "punctuation",
    OTHER: "plain"
};

dojo.declare("bespin.syntax.simple.CSharp", null, {
    keywords: 'break case continue default do else for goto if return' +
'switch throw while' +
'NULL false true enum errno EDOM' +
'ERANGE FLT_RADIX FLT_ROUNDS FLT_DIG DBL_DIG LDBL_DIG' +
'FLT_EPSILON DBL_EPSILON LDBL_EPSILON FLT_MANT_DIG DBL_MANT_DIG' +
'LDBL_MANT_DIG FLT_MAX DBL_MAX LDBL_MAX FLT_MAX_EXP DBL_MAX_EXP' +
'LDBL_MAX_EXP FLT_MIN DBL_MIN LDBL_MIN FLT_MIN_EXP DBL_MIN_EXP' +
'LDBL_MIN_EXP CHAR_BIT CHAR_MAX CHAR_MIN SCHAR_MAX SCHAR_MIN' +
'UCHAR_MAX SHRT_MAX SHRT_MIN USHRT_MAX INT_MAX INT_MIN' +
'UINT_MAX LONG_MAX LONG_MIN ULONG_MAX HUGE_VAL SIGABRT' +
'SIGFPE SIGILL SIGINT SIGSEGV SIGTERM SIG_DFL SIG_ERR' +
'SIG_IGN BUFSIZ EOF FILENAME_MAX FOPEN_MAX L_tmpnam' +
'SEEK_CUR SEEK_END SEEK_SET TMP_MAX stdin stdout stderr' +
'EXIT_FAILURE EXIT_SUCCESS RAND_MAX CLOCKS_PER_SEC' +
'virtual public private protected template using namespace' +
'try catch inline dynamic_cast const_cast reinterpret_cast' +
'static_cast explicit friend wchar_t typename typeid class' +
'cin cerr clog cout delete new this' +
'printf fprintf snprintf sprintf assert' +
'isalnum isalpha isdigit iscntrl isgraph islower isprint' +
'ispunct isspace isupper isxdigit tolower toupper' +
'exp log log10 pow sqrt ceil floor fabs ldexp' +
'frexp modf fmod sin cos tan asin acos atan atan2' +
'sinh cosh tanh setjmp longjmp' +
'va_start va_arg va_end offsetof sizeof fopen freopen' +
'fflush fclose remove rename tmpfile tmpname setvbuf' +
'setbuf vfprintf vprintf vsprintf fscanf scanf sscanf' +
'fgetc fgets fputc fputs getc getchar gets putc' +
'putchar puts ungetc fread fwrite fseek ftell rewind' +
'fgetpos fsetpos clearerr feof ferror perror abs labs' +
'div ldiv atof atoi atol strtod strtol strtoul calloc' +
'malloc realloc free abort exit atexit system getenv' +
'bsearch qsort rand srand strcpy strncpy strcat strncat' +
'strcmp strncmp strcoll strchr strrchr strspn strcspn' +
'strpbrk strstr strlen strerror strtok strxfrm memcpy' +
'memmove memcmp memchr memset clock time difftime mktime' +
'auto bool char const double float int long longint' +
'register short shortint signed static struct' +
'typedef union unsigned void volatile extern jmp_buf' +
'signal raise va_list ptrdiff_t size_t FILE fpos_t' +
'div_t ldiv_t clock_t time_t tm'.split(" "),

    punctuation: '{ } # > < / + - % * . , ; ( ) ? : = " \''.split(" "),

    highlight: function(line, meta) {
        if (!meta) meta = {};

        var K = bespin.syntax.CSharpConstants;    // aliasing the constants for shorter reference ;-)

        var regions = {};                               // contains the individual style types as keys, with array of start/stop positions as value

        // current state, maintained as we parse through each character in the line; values at any time should be consistent
        var currentStyle = (meta.inMultilineComment) ? K.C_STYLE_COMMENT : undefined;
        var currentRegion = {}; // should always have a start property for a non-blank buffer
        var buffer = "";

        // these properties are related to the parser state above but are special cases
        var stringChar = "";    // the character used to start the current string
        var multiline = meta.inMultilineComment;

        for (var i = 0; i < line.length; i++) {
            var c = line.charAt(i);

            // check if we're in a comment and whether this character ends the comment
            if (currentStyle == K.C_STYLE_COMMENT) {
                if (c == "/" && /\*$/.test(buffer)) { // has the c-style comment just ended?
                    currentRegion.stop = i + 1;
                    this.addRegion(regions, currentStyle, currentRegion);
                    currentRegion = {};
                    currentStyle = undefined;
                    multiline = false;
                    buffer = "";
                } else {
                    if (buffer == "") currentRegion = { start: i };
                    buffer += c;
                }

                continue;
            }

            if (this.isWhiteSpaceOrPunctuation(c)) {
                // check if we're in a string
                if (currentStyle == K.STRING) {
                    // if this is not an unescaped end quote (either a single quote or double quote to match how the string started) then keep going
                    if ( ! (c == stringChar && !/\\$/.test(buffer))) {
                        if (buffer == "") currentRegion = { start: i };
                        buffer += c;
                        continue;
                    }
                }

                // if the buffer is full, add it to the regions
                if (buffer != "") {
                    currentRegion.stop = i;

                    if (currentStyle != K.STRING) {   // if this is a string, we're all set to add it; if not, figure out if its a keyword
                        if (this.keywords.indexOf(buffer) != -1) {
                            // the buffer contains a keyword
                            currentStyle = K.KEYWORD;
                        } else {
                            currentStyle = K.OTHER;
                        }
                    }
                    this.addRegion(regions, currentStyle, currentRegion);
                    currentRegion = {};
                    stringChar = "";
                    buffer = "";
                    // i don't clear the current style here so I can check if it was a string below
                }

                if (this.isPunctuation(c)) {
                    if (c == "*" && i > 0 && (line.charAt(i - 1) == "/")) {
                        // remove the previous region in the punctuation bucket, which is a forward slash
                        regions[K.PUNCTUATION].pop();

                        // we are in a c-style comment
                        multiline = true;
                        currentStyle = K.C_STYLE_COMMENT;
                        currentRegion = { start: i - 1 };
                        buffer = "/*";
                        continue;
                    }

                    // check for a line comment; this ends the parsing for the rest of the line
                    if (c == '/' && i > 0 && (line.charAt(i - 1) == '/')) {
                        currentRegion = { start: i - 1, stop: line.length };
                        currentStyle = K.LINE_COMMENT;
                        this.addRegion(regions, currentStyle, currentRegion);
                        buffer = "";
                        currentStyle = undefined;
                        currentRegion = {};
                        break;      // once we get a line comment, we're done!
                    }

                    // add an ad-hoc region for just this one punctuation character
                    this.addRegion(regions, K.PUNCTUATION, { start: i, stop: i + 1 });
                }

                // find out if the current quote is the end or the beginning of the string
                if ((c == "'" || c == '"') && (currentStyle != K.STRING)) {
                    currentStyle = K.STRING;
                    stringChar = c;
                } else {
                    currentStyle = undefined;
                }

                continue;
            }

            if (buffer == "") currentRegion = { start: i };
            buffer += c;
        }

        // check for a trailing character inside of a string or a comment
        if (buffer != "") {
            if (!currentStyle) currentStyle = K.OTHER;
            currentRegion.stop = line.length;
            this.addRegion(regions, currentStyle, currentRegion);
        }

        return { regions: regions, meta: { inMultilineComment: multiline } };
    },

    addRegion: function(regions, type, data) {
        if (!regions[type]) regions[type] = [];
        regions[type].push(data);
    },

    isWhiteSpaceOrPunctuation: function(ch) {
        return this.isPunctuation(ch) || this.isWhiteSpace(ch);
    },

    isPunctuation: function(ch) {
        return this.punctuation.indexOf(ch) != -1;
    },

    isWhiteSpace: function(ch) {
        return ch == " ";
    }
});

}

if(!dojo._hasResource["bespin.cmd.commandline"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.cmd.commandline"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

// = Command Line =
//
// This command line module provides everything that the command line interface needs:
//
// * {{{bespin.cmd.commandline.CommandStore}}} : Model to store the commands
// * {{{bespin.cmd.commandline.Interface}}} : The core command line driver. It executes commands, stores them, and handles completion
// * {{{bespin.cmd.commandline.KeyBindings}}} : Handling the special key handling in the command line
// * {{{bespin.cmd.commandline.History}}} : Handle command line history
// * {{{bespin.cmd.commandline.SimpleHistoryStore}}} : Simple one session storage of history
// * {{{bespin.cmd.commandline.ServerHistoryStore}}} : Save the history on the server in BespinSettings/command.history
// * {{{bespin.cmd.commandline.Events}}} : The custom events that the command line needs to handle

dojo.provide("bespin.cmd.commandline");

dojo.declare("bespin.cmd.commandline.CommandStore", null, {
    constructor: function(opts) {
        this.commands = {};
        this.aliases = {};

        if (opts.subCommand) {
            this.subcommandFor = opts.subCommand.name; // save the fact that we are a subcommand for this chap
            opts.subCommand.takes = ['*']; // implicit that it takes something
            opts.subCommand.subcommands = this; // link back to this store

            bespin.cmd.commands.add(opts.subCommand); // add the sub command to the root store
        }

        if (opts.initCommands) this.addCommands(opts.initCommands); // initialize the commands for the cli
    },

    addCommand: function(command) {
        if (!command) {
            return;
        }
        // -- Allow for the default [ ] takes style by expanding it to something bigger
        if (command.takes && dojo.isArray(command.takes)) {
            command = this.normalizeTakes(command);
        }

        // -- Add bindings
        if (command.withKey) {
            var args = bespin.util.keys.fillArguments(command.withKey);

            args.action = "command:execute;name=" + command.name;
            bespin.publish("editor:bindkey", args);
        }

        this.commands[command.name] = command;

        if (command['aliases']) {
            dojo.forEach(command['aliases'], function(alias) {
                this.aliases[alias] = command.name;
            }, this);
        }
    },

    addCommands: function(commands) {
        dojo.forEach(commands, dojo.hitch(this, function(command) {
            if (dojo.isString(command)) command = bespin.cmd.commands.get(command);
            this.addCommand(command);
        }));

    },

    hasCommand: function(commandname) {
        if (this.commands[commandname]) { // yup, there she blows. shortcut
            return true;
        }

        for (command in this.commands) { // try the aliases
            if (this.commands[command]['aliases']) {
                if (bespin.util.include(this.commands[command]['aliases'], commandname)) {
                    return true;
                }
            }
        }
        return false;
    },

    findCompletions: function(value, root) {
        var completions = {};

        if (root) {
            completions.root = root;
        }

        if (value.match(' ')) {
            var command = this.rootCommand(value);
            if (command && command.subcommands) {
                return command.subcommands.findCompletions(value.replace(new RegExp('^' + command.name + '\\s*'), ''), command.name);
            }
        }

        var matches = [];

        if (value.length > 0) {
            for (var command in this.commands) {
                if (command.indexOf(value) == 0) {
                  matches.push(command);
                }
            }

            for (var alias in this.aliases) {
                if (alias.indexOf(value) == 0) {
                  matches.push(alias);
                }
            }
        }

        completions.matches = matches;
        return completions;
    },

    commandTakesArgs: function(command) {
        return command.takes != undefined;
    },

    // ** {{{ getArgs }}} **
    //
    // Calculate the args object to be passed into the command.
    // If it only takes one argument just send in that data, but if it wants more, split it all up for the command and send in an object.

    getArgs: function(fromUser, command) {
        if (!command.takes) return undefined;

        var args;
        var userString = fromUser.join(' ');

        if (command.takes['*']) {
            args = new bespin.util.TokenObject(userString);
            args.rawinput = userString;

            args.varargs = args.pieces; // directly grab the token pieces as an array
        } else if (command.takes && command.takes.order.length < 2) { // One argument, so just return that
            args = userString;
        } else {
            args = new bespin.util.TokenObject(userString, { params: command.takes.order.join(' ') });
            args.rawinput = userString;
        }
        return args;
    },

    normalizeTakes: function(command) {
        // TODO: handle shorts that are the same! :)
        var takes = command.takes;
        command.takes = {
            order: takes
        };

        dojo.forEach(takes, function(item) {
            command.takes[item] = {
                "short": item[0]
            };
        });

        return command;
    },

    rootCommand: function(value) {
        return this.commands[dojo.trim(value.substring(0, value.indexOf(' ')))];
    }
});

// ** {{{ bespin.cmd.commandline.Interface }}} **
//
// The core command line driver. It executes commands, stores them, and handles completion

dojo.declare("bespin.cmd.commandline.Interface", null, {
    constructor: function(commandLine, initCommands) {
        this.commandLine = dojo.byId(commandLine);

        // * Create the div for hints
        this.commandHint = dojo.create("div", {
            id: "command_hint",
            style: "display:none; bottom:0px; left:31px; width:500px;"
        }, dojo.body());
        dojo.connect(this.commandHint, "onclick", this, this.hideHint);

        // * Create the div for real command output
        this.output = dojo.create("div", {
            id: "command_output",
            style: "display:none;"
        }, dojo.body());

        if (bespin.get('files')) this.files = bespin.get('files');
        if (bespin.get('settings')) this.settings = bespin.get('settings');
        if (bespin.get('editor')) this.editor = bespin.get('editor');

        this.inCommandLine = false;
        this.commandStore = new bespin.cmd.commandline.CommandStore({ initCommands: initCommands });

        this.commandLineKeyBindings = new bespin.cmd.commandline.KeyBindings(this);
        this.history = new bespin.cmd.commandline.History(this);
        this.customEvents = new bespin.cmd.commandline.Events(this);
        this.hideOutput();
    },

    showUsage: function(command) {
        var usage = command.usage || "no usage information found for " + command.name;
        this.showHint("Usage: " + command.name + " " + usage);
    },

    // == Show Hint ==
    // Hints are displayed while typing. They are transient and ignorable
    showHint: function(html) {
        dojo.attr(this.commandHint, { innerHTML: html });
        dojo.style(this.commandHint, "display", "block");

        if (this.hintTimeout) clearTimeout(this.hintTimeout);
        this.hintTimeout = setTimeout(dojo.hitch(this, function() {
            this.hideHint();
        }), 4600);
    },

    // == Hide Hint ==
    hideHint: function() {
        dojo.style(this.commandHint, 'display', 'none');
        if (this.hintTimeout) clearTimeout(this.hintTimeout);
    },

    // == Show Output ==
    // Show the output area in the given display rectangle
    showOutput: function(left, bottom, width, height) {
        dojo.style("footer", {
            left: left + "px",
            width: (width - 10) + "px",
            bottom: bottom + "px",
            display: "block"
        });
        dojo.byId("command").focus();

        var footerHeight = dojo.style("footer", "height") + 2;

        dojo.style(this.commandHint, {
            left: left + "px",
            bottom: (bottom + footerHeight) + "px",
            width: width + "px"
        });

        dojo.style(this.output, {
            left: left + "px",
            bottom: (bottom + footerHeight) + "px",
            width: width + "px",
            height: height + "px",
            display: "block"
        });

        this.maxInfoHeight = height;
    },

    // == Hide Output ==
    hideOutput: function() {
        this.hideHint();
        dojo.style(this.output, "display", "none");
        dojo.style("footer", "display", "none");
        this.maxInfoHeight = null;
    },

    // == Add Output ==
    // Complete the currently executing command with successful output
    addOutput: function(html) {
        this._addOutput(html, false, true);
    },

    // == Add Error Output ==
    // Complete the currently executing command with error output
    addErrorOutput: function(html) {
        this._addOutput(html, true, true);
    },

    // == Add Incomplete Output ==
    // Add output to the currently executing command with successful output
    addIncompleteOutput: function(html) {
        this._addOutput(html, false, false);
    },

    // == Add Incomplete Output ==
    // Complete the currently executing command with successful output
    _addOutput: function(html, error, complete) {
        if (this.executing) {
            this.executing.addOutput(html, complete);
            this.executing.hideOutput = false;
            this.executing.error = error;
            this.executing.complete = complete;
        } else {
            console.trace();
            console.debug("orphan output:", html);
        }

        this.hideHint();
        this.updateOutput();
        this.scrollConsole();
    },

    // == Make the console scroll to the bottom ==
    scrollConsole: function() {
        // certain browsers have a bug such that scrollHeight is too small
        // when content does not fill the client area of the element
        var scrollHeight = Math.max(this.output.scrollHeight, this.output.clientHeight);
        this.output.scrollTop = scrollHeight - this.output.clientHeight;
    },

    // == Update Output ==
    // Redraw the table of executed commands
    updateOutput: function() {
        var formatTime = function(date) {
            var mins = "0" + date.getMinutes();
            if (mins.length > 2) mins = mins.slice(mins.length - 2);
            var secs = "0" + date.getSeconds();
            if (secs.length > 2) secs = secs.slice(secs.length - 2);
            return date.getHours() + ":" + mins + ":" + secs;
        };

        var settings = bespin.get("settings");
        var size = parseInt(settings.get("consolefontsize"));
        var mode = settings.get("historytimemode");

        dojo.attr(this.output, "innerHTML", "");

        var table = dojo.create("table", {
            className: 'command_table',
            style: 'font-size:' + size + 'pt'
        }, this.output);

        var self = this;

        var count = 1;
        dojo.forEach(this.history.instructions, function(instruction) {
            if (!instruction.historical) {
                // The row for the input (i.e. what was typed)
                var rowin = dojo.create("tr", {
                    className: 'command_rowin',
                    style: "background-image: url(/images/instruction" + size + ".png)",
                    onclick: function(ev) {
                        self.historyClick(instruction.typed, ev);
                    },
                    ondblclick: function(ev) {
                        self.historyDblClick(instruction.typed, ev);
                    }
                }, table);

                // The opening column with time or history number or nothing
                var rowid = dojo.create("td", { className: 'command_open' }, rowin);
                if (mode == "history") {
                    rowid.innerHTML = count;
                    dojo.addClass(rowid, 'command_open_history');
                }
                else if (mode == "time" && instruction.start) {
                    rowid.innerHTML = formatTime(instruction.start);
                    dojo.addClass(rowid, 'command_open_time');
                }
                else {
                    dojo.addClass(rowid, 'command_open_blank');
                }

                // Cell for the typed command and the hover
                var typed = dojo.create("td", { className: 'command_main' }, rowin);

                // The execution time
                var hover = dojo.create("div", { className: 'command_hover' }, typed);

                // The execution time
                if (instruction.start && instruction.end) {
                    dojo.create("span", {
                        innerHTML: ((instruction.end.getTime() - instruction.start.getTime()) / 1000) + " sec "
                    }, hover);
                }

                // Toggle output display
                dojo.create("img", {
                    src: instruction.hideOutput ? "/images/plus.png" : "/images/minus.png",
                    style: "vertical-align:middle; padding:2px;",
                    alt: "Toggle display of the output",
                    title: "Toggle display of the output",
                    onclick: function(ev) {
                        instruction.hideOutput = !instruction.hideOutput;
                        self.updateOutput();
                        dojo.stopEvent(ev);
                    }
                }, hover);

                // Open/close output
                dojo.create("img", {
                    src: "/images/closer.png",
                    style: "vertical-align:middle; padding:2px;",
                    alt: "Remove this command from the history",
                    title: "Remove this command from the history",
                    onclick: function() {
                        self.history.remove(instruction);
                        self.updateOutput();
                        dojo.stopEvent(ev);
                    }
                }, hover);

                // What the user actually typed
                dojo.create("img", {
                    className: "nohover",
                    src: "/images/prompt1.png"
                }, typed);
                dojo.create("img", {
                    className: "hover",
                    src: "/images/prompt2.png"
                }, typed);

                dojo.create("span", {
                    innerHTML: instruction.typed,
                    className: "command_typed"
                }, typed);

                // The row for the output (if required)
                if (!instruction.hideOutput) {
                    var contents = instruction.output || "";
                    if (!instruction.complete) {
                        contents += "<img src='/images/throbber.gif'/> Working ...";
                    }
                    var rowout = dojo.create("tr", { className: 'command_rowout' }, table);
                    dojo.create("td", { }, rowout);
                    dojo.create("td", {
                        colSpan: 2,
                        className: (instruction.error ? "command_error" : ""),
                        innerHTML: contents
                    }, rowout);
                }
            }
            count ++;
        });
    },

    // == Toggle Font Size ==
    toggleFontSize: function() {
        var settings = bespin.get("settings");

        var self = this;
        var set = function(size) {
            settings.set("consolefontsize", size);
            self.updateOutput();
        };

        var size = parseInt(settings.get("consolefontsize"));
        switch (size) {
            case 9: set(11); break;
            case 11: set(14); break;
            case 14: set(9); break;
            default: set(11); break;
        }
    },

    // == Toggle History / Time Mode ==
    toggleHistoryTimeMode: function() {
        var settings = bespin.get("settings");

        var self = this;
        var set = function(mode) {
            settings.set("historytimemode", mode);
            self.updateOutput();
        };

        var size = settings.get("historytimemode");
        switch (size) {
            case "history": set("time"); break;
            case "time": set("blank"); break;
            case "blank": set("history"); break;
            default: set("history"); break;
        }
    },

    // == History Click ==
    // A single click on an instruction line in the console copies the command
    // to the command line
    historyClick: function(command) {
        this.commandLine.value = command;
    },

    // == History Double Click ==
    // A double click on an instruction line in the console executes the command
    historyDblClick: function(command) {
        this.executeCommand(command);
    },

    complete: function(value) {
        var completions = this.commandStore.findCompletions(value);
        var matches = completions.matches;

        if (matches.length == 1) {
            var commandLineValue = matches[0];

            if (this.commandStore.aliases[commandLineValue]) {
                this.showHint(commandLineValue + " is an alias for: " + this.commandStore.aliases[commandLineValue]);
                commandLineValue += ' ';
            } else {
                var command = this.commandStore.commands[commandLineValue] || this.commandStore.rootCommand(value).subcommands.commands[commandLineValue];

                if (command) {
                    if (this.commandStore.commandTakesArgs(command)) {
                        commandLineValue += ' ';
                    }

                    if (command['completeText']) {
                        this.showHint(command['completeText']);
                    }

                    if (command['complete']) {
                        this.showHint(command.complete(this, value));
                    }
                }
            }

            this.commandLine.value = (completions.root ? (completions.root + ' ') : '') + commandLineValue;
        }
    },

    executeCommand: function(value) {
        if (!value || value == "") {
            return;
        }

        var instruction = new bespin.cmd.commandline.Instruction(this, value);

        // clear after the command
        this.commandLine.value = '';

        this.history.add(instruction);
        this.executing = instruction;

        try {
            if (instruction.error) {
                bespin.get('commandLine').addOutput(instruction.error);
            } else {
                instruction.command.execute(this, instruction.args, instruction.command);
            }
        }
        catch (ex) {
            bespin.get('commandLine').addErrorOutput(ex);
        }
        finally {
            this.executing = null;
        }

        this.hideHint();
        this.updateOutput();
        this.scrollConsole();
    },

    link: function(action, context) {
        if (!this.executing) {
            return action;
        }

        var originalExecuting = this.executing;
        var self = this;

        return function() {
            var confusedExecuting = null;
            if (self.executing) {
                confusedExecuting = self.executing;
            }
            self.executing = originalExecuting;

            action.apply(context || dojo.global, arguments);

            self.executing = confusedExecuting;
        };
    },

    handleCommandLineFocus: function(e) {
        if (this.inCommandLine) return true; // in the command line!

        if (e.keyChar == 'j' && e.ctrlKey) { // send to command line
            this.commandLine.focus();

            dojo.stopEvent(e);
            return true;
        }
    }
});

// ** {{{ bespin.cmd.commandline.Instruction }}} **
//
// Wrapper for something that the user typed
dojo.declare("bespin.cmd.commandline.Instruction", null, {
    constructor: function(commandLine, typed) {
        this.typed = dojo.trim(typed);
        this.output = "";

        // It is valid to not know the commandLine when we are filling the
        // history from disk, but in that case we don't need to parse it
        if (commandLine != null) {
            this.start = new Date();
            this.complete = false;

            var ca = this._splitCommandAndArgs(commandLine.commandStore, typed);
            if (ca) {
                this.command = ca[0];
                this.args = ca[1];
            }
        } else {
            this.complete = true;
            this.historical = true;
        }
    },

    // == Set Output ==
    // On completion we finish a command by settings it's output
    addOutput: function(output, complete) {
        this.output += output;
        if (complete) {
            this.end = new Date();
        } else {
            this.output += "<br/>";
        }
    },

    // == Split Command and Args
    // Private method to chop up the typed command
    _splitCommandAndArgs: function(commandStore, typed, parent) {
        var data = typed.split(/\s+/);
        var commandname = data.shift();

        var command;
        var argstr = data.join(' ');

        if (commandStore.commands[commandname]) {
            command = commandStore.commands[commandname];
        } else if (commandStore.aliases[commandname]) {
            var alias = commandStore.aliases[commandname].split(' ');
            var aliascmd = alias.shift();
            if (alias.length > 0) {
                argstr = alias.join(' ') + ' ' + argstr;
            }
            command = commandStore.commands[aliascmd];
        } else {
            if (commandname == "") {
                this.error = "Missing " + (parent == null ? "command" : "subcommand") + ".<br/>";
            } else {
                this.error = "Sorry, no " + (parent == null ? "command" : "subcommand") + " '" + commandname + "'.<br/>";
            }

            // Sometime I hate JavaScript ...
            var length = 0;
            for (command in commandStore.commands) {
                length++;
            }

            // TODO: consider promoting this somewhere
            var linkup = function(exec) {
                var script = "bespin.get(\"commandLine\").executeCommand(\"" + exec + "\");";
                return "<a href='javascript:" + script + "'>" + exec + "</a>";
            };

            if (length <= 30) {
                this.error += "Try one of: ";
                for (command in commandStore.commands) {
                    this.error += commandStore.commands[command].name + ", ";
                }
                if (parent != null) {
                    this.error += "<br/>Or use '" + linkup(parent.name + " help") + "'.";
                } else {
                    this.error += "<br/>Or use '" + linkup("help") + "'.";
                }
            } else {
                if (parent != null) {
                    this.error += "Use '" + linkup(parent.name + " help") + "' to enumerate commands.";
                } else {
                    this.error += "Use '" + linkup("help") + "' to enumerate commands.";
                }
            }

            return;
        }

        if (command.subcommands) {
            if (data.length < 1 || data[0] == '') data[0] = command.subcommanddefault || 'help';
            return this._splitCommandAndArgs(command.subcommands, argstr, command);
        }

        return [command, commandStore.getArgs(argstr.split(' '), command)];
    }
});

// ** {{{ bespin.cmd.commandline.KeyBindings }}} **
//
// Handle key bindings for the command line
dojo.declare("bespin.cmd.commandline.KeyBindings", null, {
    constructor: function(cl) {
        var settings = bespin.get("settings");

        // -- Tie to the commandLine element itself
        dojo.connect(cl.commandLine, "onfocus", cl, function() {
            bespin.publish("cmdline:focus");

            this.inCommandLine = true;
            if (dojo.byId('promptimg')) dojo.byId('promptimg').src = 'images/icn_command_on.png';
        });
        dojo.connect(cl.commandLine, "onblur", cl, function() {
            this.inCommandLine = false;
            if (dojo.byId('promptimg')) dojo.byId('promptimg').src = 'images/icn_command.png';
        });

        dojo.connect(cl.commandLine, "onkeyup", cl, function(e) {
            var command;
            if (e.keyCode >= "A".charCodeAt() && e.keyCode < "Z".charCodeAt()) { // only real letters
                var completions = this.commandStore.findCompletions(dojo.byId('command').value).matches;
                var commandString = completions[0];
                if (completions.length > 0) {
                    var isAutoComplete = (settings && settings.isSettingOn('autocomplete'));
                    if (isAutoComplete && completions.length == 1) { // if only one just set the value
                        command = this.commandStore.commands[commandString] || this.commandStore.commands[this.commandStore.aliases[commandString]];

                        var spacing = (this.commandStore.commandTakesArgs(command)) ? ' ' : '';
                        dojo.byId('command').value = commandString + spacing;

                        if (command['completeText']) {
                            this.showHint(command['completeText']);
                        } else {
                            this.hideHint();
                        }
                    } else if (completions.length == 1) {
                        if (completions[0] != dojo.byId('command').value) {
                            this.showHint(completions.join(', '));
                        } else {
                            command = this.commandStore.commands[completions[0]] || this.commandStore.commands[this.commandStore.aliases[completions[0]]];

                            if (this.commandStore.commandTakesArgs(command)) {
                                this.complete(dojo.byId('command').value); // make it complete
                            } else {
                                this.hideHint();
                            }
                        }
                    } else {
                        this.showHint(completions.join(', '));
                    }
                }
            }
        });

        dojo.connect(cl.commandLine, "onkeypress", cl, function(e) {
            var key = bespin.util.keys.Key;

            if (e.keyChar == 'j' && e.ctrlKey) { // send back
                dojo.stopEvent(e);

                dojo.byId('command').blur();

                bespin.publish("cmdline:blur");

                return false;
            } else if ((e.keyChar == 'n' && e.ctrlKey) || e.keyCode == key.DOWN_ARROW) {
                dojo.stopEvent(e);

                var next = this.history.next();
                if (next) {
                    cl.commandLine.value = next.typed;
                }

                return false;
            } else if ((e.keyChar == 'p' && e.ctrlKey) || e.keyCode == key.UP_ARROW) {
                dojo.stopEvent(e);

                var prev = this.history.previous();
                if (prev) {
                    cl.commandLine.value = prev.typed;
                }

                return false;
            } else if (e.keyChar == 'u' && e.ctrlKey) {
                dojo.stopEvent(e);

                cl.commandLine.value = '';

                return false;
            } else if (e.keyCode == key.ENTER) {
                this.executeCommand(dojo.byId('command').value);

                return false;
            } else if (e.keyCode == key.TAB) {
                dojo.stopEvent(e);

                this.complete(dojo.byId('command').value);
                return false;
            } else if (e.keyCode == key.ESCAPE) {
                // ESCAPE onkeydown fails on Moz, so we need this. Why?
                this.hideHint();
                bespin.get("piemenu").hide();
                dojo.stopEvent(e);
                return false;
            } else if (bespin.get("piemenu").keyRunsMe(e)) {
                dojo.stopEvent(e);

                this.hideHint();
                var piemenu = bespin.get("piemenu");
                piemenu.show(piemenu.slices.off);

                return false;
            }
        });

        // ESCAPE onkeypress fails on Safari, so we need this. Why?
        dojo.connect(cl.commandLine, "onkeydown", cl, function(e) {
            if (e.keyCode == bespin.util.keys.Key.ESCAPE) {
                this.hideHint();
                bespin.get("piemenu").hide();
            }
        });
    }
});

// ** {{{ bespin.cmd.commandline.History }}} **
//
// Store command line history so you can go back and forth

dojo.declare("bespin.cmd.commandline.History", null, {
    constructor: function() {
        this.instructions = [];
        this.pointer = 0;
        this.store = new bespin.cmd.commandline.ServerHistoryStore(this);
    },

    settings: {
        maxEntries: 50
    },

    // TODO: get from the database
    seed: function(typings) {
        dojo.forEach(typings, function(typing) {
            if (typing && typing != "") {
                var instruction = new bespin.cmd.commandline.Instruction(null, typing);
                this.instructions.push(instruction);
            }
        }, this);
        this.trim();
        this.pointer = this.instructions.length; // make it one past the end so you can go back and hit the last one not the one before last
    },

    // Keep the history to settings.maxEntries
    trim: function() {
        if (this.instructions.length > this.settings.maxEntries) {
            this.instructions.splice(0, this.instructions.length - this.settings.maxEntries);
        }
    },

    add: function(instruction) {
        // We previously de-duped here, by comparing what was typed, but that
        // should really be done as a UI sugar on up/down.
        this.instructions.push(instruction);
        this.trim();
        this.pointer = this.instructions.length; // also make it one past the end so you can go back to it
        this.store.save(this.instructions);
    },

    remove: function(instruction) {
        var index = this.instructions.indexOf(instruction);
        if (index != -1) {
            this.instructions.splice(index, 1);
        }
    },

    next: function() {
        if (this.pointer < this.instructions.length - 1) {
            this.pointer++;
            return this.instructions[this.pointer];
        }
    },

    previous: function() {
        if (this.pointer > 0) {
            this.pointer--;
            return this.instructions[this.pointer];
        }
    },

    last: function() {
        return this.instructions[this.instructions.length - 1];
    },

    first: function() {
        return this.instructions[0];
    },

    getInstructions: function() {
        return this.instructions;
    }
});

// ** {{{ bespin.cmd.commandline.SimpleHistoryStore }}} **
//
// A simple store that keeps the commands in memory.
dojo.declare("bespin.cmd.commandline.SimpleHistoryStore", null, {
    constructor: function(history) {
        history.seed(['ls', 'clear', 'status']);
    },

    save: function(instructions) {}
});

// ** {{{ bespin.cmd.commandline.ServerHistoryStore }}} **
//
// Store the history in BespinSettings/command.history
dojo.declare("bespin.cmd.commandline.ServerHistoryStore", null, {
    constructor: function(history) {
        this.history = history;
        var self = this;

        if (bespin.authenticated) {
            self.seed();
        } else {
            bespin.subscribe("authenticated", function() {
                self.seed();
            });
        }
    },

    seed: function() {
        // load last 50 instructions from history
        bespin.get('files').loadContents(bespin.userSettingsProject, "command.history", dojo.hitch(this, function(file) {
            this.history.seed(file.content.split(/\n/));
        }));
    },

    save: function(instructions) {
        var content = "";
        dojo.forEach(instructions, function(instruction) {
            if (instruction.typed && instruction.typed != "") {
                content += instruction.typed + "\n";
            }
        });
        // save instructions back to server asynchronously
        bespin.get('files').saveFile(bespin.userSettingsProject, {
            name: "command.history",
            content: content,
            timestamp: new Date().getTime()
        });
    }
});

// ** {{{ bespin.cmd.commandline.Events }}} **
//
// The custom events that the commandline participates in

dojo.declare("bespin.cmd.commandline.Events", null, {
    constructor: function(commandline) {
        // ** {{{ Event: message:output }}} **
        //
        // message:output is good output for the console
        bespin.subscribe("message:output", function(event) {
            if (!event.msg) {
                console.warning("Empty msg in publish to message:output");
                console.trace();
                return;
            }

            if (event.incomplete) {
                commandline.addIncompleteOutput(event.msg);
            } else {
                commandline.addOutput(event.msg);
            }
        });

        // ** {{{ Event: message:output }}} **
        //
        // message:output is good output for the console
        bespin.subscribe("message:error", function(event) {
            if (!event.msg) {
                console.warning("Empty msg in publish to message:error");
                console.trace();
                return;
            }

            commandline.addErrorOutput(event.msg);
        });

        // ** {{{ Event: message:output }}} **
        //
        // message:output is good output for the console
        bespin.subscribe("message:hint", function(event) {
            if (!event.msg) {
                console.warning("Empty msg in publish to message:hint");
                console.trace();
                return;
            }

            if (event.msg) commandline.showHint(event.msg);
        });

        // ** {{{ Event: command:execute }}} **
        //
        // Once the command has been executed, do something.
        bespin.subscribe("command:execute", function(event) {
            var command = event.name;
            var args    = event.args;
            if (command && args) { // if we have a command and some args
                command += " " + args;
            }

            if (command) commandline.executeCommand(command);
        });

        // -- Files
        // ** {{{ Event: editor:openfile:openfail }}} **
        //
        // If an open file action failed, tell the user.
        bespin.subscribe("editor:openfile:openfail", function(event) {
            commandline.showHint('Could not open file: ' + event.filename + " (maybe try &raquo; list)");
        });

        // ** {{{ Event: editor:openfile:opensuccess }}} **
        //
        // The open file action worked, so tell the user
        bespin.subscribe("editor:openfile:opensuccess", function(event) {
            commandline.showHint('Loaded file: ' + event.file.name);
        });

        // -- Projects
        // ** {{{ Event: project:set }}} **
        //
        // When the project changes, alert the user
        bespin.subscribe("project:set", function(event) {
            var project = event.project;

            bespin.get('editSession').project = project;
            if (!event.suppressPopup) commandline.showHint('Changed project to ' + project);
        });
    }
});


}

if(!dojo._hasResource["dojo.AdapterRegistry"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.AdapterRegistry"] = true;
dojo.provide("dojo.AdapterRegistry");

dojo.AdapterRegistry = function(/*Boolean?*/ returnWrappers){
	//	summary:
	//		A registry to make contextual calling/searching easier.
	//	description:
	//		Objects of this class keep list of arrays in the form [name, check,
	//		wrap, directReturn] that are used to determine what the contextual
	//		result of a set of checked arguments is. All check/wrap functions
	//		in this registry should be of the same arity.
	//	example:
	//	|	// create a new registry
	//	|	var reg = new dojo.AdapterRegistry();
	//	|	reg.register("handleString",
	//	|		dojo.isString,
	//	|		function(str){
	//	|			// do something with the string here
	//	|		}
	//	|	);
	//	|	reg.register("handleArr",
	//	|		dojo.isArray,
	//	|		function(arr){
	//	|			// do something with the array here
	//	|		}
	//	|	);
	//	|
	//	|	// now we can pass reg.match() *either* an array or a string and
	//	|	// the value we pass will get handled by the right function
	//	|	reg.match("someValue"); // will call the first function
	//	|	reg.match(["someValue"]); // will call the second

	this.pairs = [];
	this.returnWrappers = returnWrappers || false; // Boolean
}

dojo.extend(dojo.AdapterRegistry, {
	register: function(/*String*/ name, /*Function*/ check, /*Function*/ wrap, /*Boolean?*/ directReturn, /*Boolean?*/ override){
		//	summary: 
		//		register a check function to determine if the wrap function or
		//		object gets selected
		//	name:
		//		a way to identify this matcher.
		//	check:
		//		a function that arguments are passed to from the adapter's
		//		match() function.  The check function should return true if the
		//		given arguments are appropriate for the wrap function.
		//	directReturn:
		//		If directReturn is true, the value passed in for wrap will be
		//		returned instead of being called. Alternately, the
		//		AdapterRegistry can be set globally to "return not call" using
		//		the returnWrappers property. Either way, this behavior allows
		//		the registry to act as a "search" function instead of a
		//		function interception library.
		//	override:
		//		If override is given and true, the check function will be given
		//		highest priority. Otherwise, it will be the lowest priority
		//		adapter.
		this.pairs[((override) ? "unshift" : "push")]([name, check, wrap, directReturn]);
	},

	match: function(/* ... */){
		// summary:
		//		Find an adapter for the given arguments. If no suitable adapter
		//		is found, throws an exception. match() accepts any number of
		//		arguments, all of which are passed to all matching functions
		//		from the registered pairs.
		for(var i = 0; i < this.pairs.length; i++){
			var pair = this.pairs[i];
			if(pair[1].apply(this, arguments)){
				if((pair[3])||(this.returnWrappers)){
					return pair[2];
				}else{
					return pair[2].apply(this, arguments);
				}
			}
		}
		throw new Error("No match found");
	},

	unregister: function(name){
		// summary: Remove a named adapter from the registry

		// FIXME: this is kind of a dumb way to handle this. On a large
		// registry this will be slow-ish and we can use the name as a lookup
		// should we choose to trade memory for speed.
		for(var i = 0; i < this.pairs.length; i++){
			var pair = this.pairs[i];
			if(pair[0] == name){
				this.pairs.splice(i, 1);
				return true;
			}
		}
		return false;
	}
});

}

if(!dojo._hasResource["dijit._base.place"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base.place"] = true;
dojo.provide("dijit._base.place");



// ported from dojo.html.util

dijit.getViewport = function(){
	// summary:
	//		Returns the dimensions and scroll position of the viewable area of a browser window

	var scrollRoot = (dojo.doc.compatMode == 'BackCompat')? dojo.body() : dojo.doc.documentElement;

	// get scroll position
	var scroll = dojo._docScroll(); // scrollRoot.scrollTop/Left should work
	return { w: scrollRoot.clientWidth, h: scrollRoot.clientHeight, l: scroll.x, t: scroll.y };
};

/*=====
dijit.__Position = function(){
	// x: Integer
	//		horizontal coordinate in pixels, relative to document body
	// y: Integer
	//		vertical coordinate in pixels, relative to document body

	thix.x = x;
	this.y = y;
}
=====*/


dijit.placeOnScreen = function(
	/* DomNode */			node,
	/* dijit.__Position */	pos,
	/* String[] */			corners,
	/* dijit.__Position? */	padding){
	//	summary:
	//		Positions one of the node's corners at specified position
	//		such that node is fully visible in viewport.
	//	description:
	//		NOTE: node is assumed to be absolutely or relatively positioned.
	//	pos:
	//		Object like {x: 10, y: 20}
	//	corners:
	//		Array of Strings representing order to try corners in, like ["TR", "BL"].
	//		Possible values are:
	//			* "BL" - bottom left
	//			* "BR" - bottom right
	//			* "TL" - top left
	//			* "TR" - top right
	//	padding:
	//		set padding to put some buffer around the element you want to position.
	//	example:	
	//		Try to place node's top right corner at (10,20).
	//		If that makes node go (partially) off screen, then try placing
	//		bottom left corner at (10,20).
	//	|	placeOnScreen(node, {x: 10, y: 20}, ["TR", "BL"])

	var choices = dojo.map(corners, function(corner){
		var c = { corner: corner, pos: {x:pos.x,y:pos.y} };
		if(padding){
			c.pos.x += corner.charAt(1) == 'L' ? padding.x : -padding.x;
			c.pos.y += corner.charAt(0) == 'T' ? padding.y : -padding.y;
		}
		return c; 
	});

	return dijit._place(node, choices);
}

dijit._place = function(/*DomNode*/ node, /* Array */ choices, /* Function */ layoutNode){
	// summary:
	//		Given a list of spots to put node, put it at the first spot where it fits,
	//		of if it doesn't fit anywhere then the place with the least overflow
	// choices: Array
	//		Array of elements like: {corner: 'TL', pos: {x: 10, y: 20} }
	//		Above example says to put the top-left corner of the node at (10,20)
	// layoutNode: Function(node, aroundNodeCorner, nodeCorner)
	//		for things like tooltip, they are displayed differently (and have different dimensions)
	//		based on their orientation relative to the parent.   This adjusts the popup based on orientation.

	// get {x: 10, y: 10, w: 100, h:100} type obj representing position of
	// viewport over document
	var view = dijit.getViewport();

	// This won't work if the node is inside a <div style="position: relative">,
	// so reattach it to dojo.doc.body.   (Otherwise, the positioning will be wrong
	// and also it might get cutoff)
	if(!node.parentNode || String(node.parentNode.tagName).toLowerCase() != "body"){
		dojo.body().appendChild(node);
	}

	var best = null;
	dojo.some(choices, function(choice){
		var corner = choice.corner;
		var pos = choice.pos;

		// configure node to be displayed in given position relative to button
		// (need to do this in order to get an accurate size for the node, because
		// a tooltips size changes based on position, due to triangle)
		if(layoutNode){
			layoutNode(node, choice.aroundCorner, corner);
		}

		// get node's size
		var style = node.style;
		var oldDisplay = style.display;
		var oldVis = style.visibility;
		style.visibility = "hidden";
		style.display = "";
		var mb = dojo.marginBox(node);
		style.display = oldDisplay;
		style.visibility = oldVis;

		// coordinates and size of node with specified corner placed at pos,
		// and clipped by viewport
		var startX = (corner.charAt(1) == 'L' ? pos.x : Math.max(view.l, pos.x - mb.w)),
			startY = (corner.charAt(0) == 'T' ? pos.y : Math.max(view.t, pos.y -  mb.h)),
			endX = (corner.charAt(1) == 'L' ? Math.min(view.l + view.w, startX + mb.w) : pos.x),
			endY = (corner.charAt(0) == 'T' ? Math.min(view.t + view.h, startY + mb.h) : pos.y),
			width = endX - startX,
			height = endY - startY,
			overflow = (mb.w - width) + (mb.h - height);

		if(best == null || overflow < best.overflow){
			best = {
				corner: corner,
				aroundCorner: choice.aroundCorner,
				x: startX,
				y: startY,
				w: width,
				h: height,
				overflow: overflow
			};
		}
		return !overflow;
	});

	node.style.left = best.x + "px";
	node.style.top = best.y + "px";
	if(best.overflow && layoutNode){
		layoutNode(node, best.aroundCorner, best.corner);
	}
	return best;
}

dijit.placeOnScreenAroundNode = function(
	/* DomNode */		node,
	/* DomNode */		aroundNode,
	/* Object */		aroundCorners,
	/* Function? */		layoutNode){

	// summary:
	//		Position node adjacent or kitty-corner to aroundNode
	//		such that it's fully visible in viewport.
	//
	// description:
	//		Place node such that corner of node touches a corner of
	//		aroundNode, and that node is fully visible.
	//
	// aroundCorners:
	//		Ordered list of pairs of corners to try matching up.
	//		Each pair of corners is represented as a key/value in the hash,
	//		where the key corresponds to the aroundNode's corner, and
	//		the value corresponds to the node's corner:
	//
	//	|	{ aroundNodeCorner1: nodeCorner1, aroundNodeCorner2: nodeCorner2,  ...}
	//
	//		The following strings are used to represent the four corners:
	//			* "BL" - bottom left
	//			* "BR" - bottom right
	//			* "TL" - top left
	//			* "TR" - top right
	//
	// layoutNode: Function(node, aroundNodeCorner, nodeCorner)
	//		For things like tooltip, they are displayed differently (and have different dimensions)
	//		based on their orientation relative to the parent.   This adjusts the popup based on orientation.
	//
	// example:
	//	|	dijit.placeOnScreenAroundNode(node, aroundNode, {'BL':'TL', 'TR':'BR'}); 
	//		This will try to position node such that node's top-left corner is at the same position
	//		as the bottom left corner of the aroundNode (ie, put node below
	//		aroundNode, with left edges aligned).  If that fails it will try to put
	// 		the bottom-right corner of node where the top right corner of aroundNode is
	//		(ie, put node above aroundNode, with right edges aligned)
	//

	// get coordinates of aroundNode
	aroundNode = dojo.byId(aroundNode);
	var oldDisplay = aroundNode.style.display;
	aroundNode.style.display="";
	// #3172: use the slightly tighter border box instead of marginBox
	var aroundNodeW = aroundNode.offsetWidth; //mb.w; 
	var aroundNodeH = aroundNode.offsetHeight; //mb.h;
	var aroundNodePos = dojo.coords(aroundNode, true);
	aroundNode.style.display=oldDisplay;

	// place the node around the calculated rectangle
	return dijit._placeOnScreenAroundRect(node, 
		aroundNodePos.x, aroundNodePos.y, aroundNodeW, aroundNodeH,	// rectangle
		aroundCorners, layoutNode);
};

/*=====
dijit.__Rectangle = function(){
	// x: Integer
	//		horizontal offset in pixels, relative to document body
	// y: Integer
	//		vertical offset in pixels, relative to document body
	// width: Integer
	//		width in pixels
	// height: Integer
	//		height in pixels

	thix.x = x;
	this.y = y;
	thix.width = width;
	this.height = height;
}
=====*/


dijit.placeOnScreenAroundRectangle = function(
	/* DomNode */			node,
	/* dijit.__Rectangle */	aroundRect,
	/* Object */			aroundCorners,
	/* Function */			layoutNode){

	// summary:
	//		Like dijit.placeOnScreenAroundNode(), except that the "around"
	//		parameter is an arbitrary rectangle on the screen (x, y, width, height)
	//		instead of a dom node.

	return dijit._placeOnScreenAroundRect(node, 
		aroundRect.x, aroundRect.y, aroundRect.width, aroundRect.height,	// rectangle
		aroundCorners, layoutNode);
};

dijit._placeOnScreenAroundRect = function(
	/* DomNode */		node,
	/* Number */		x,
	/* Number */		y,
	/* Number */		width,
	/* Number */		height,
	/* Object */		aroundCorners,
	/* Function */		layoutNode){

	// summary:
	//		Like dijit.placeOnScreenAroundNode(), except it accepts coordinates
	//		of a rectangle to place node adjacent to.

	// TODO: combine with placeOnScreenAroundRectangle()

	// Generate list of possible positions for node
	var choices = [];
	for(var nodeCorner in aroundCorners){
		choices.push( {
			aroundCorner: nodeCorner,
			corner: aroundCorners[nodeCorner],
			pos: {
				x: x + (nodeCorner.charAt(1) == 'L' ? 0 : width),
				y: y + (nodeCorner.charAt(0) == 'T' ? 0 : height)
			}
		});
	}

	return dijit._place(node, choices, layoutNode);
};

dijit.placementRegistry = new dojo.AdapterRegistry();
dijit.placementRegistry.register("node",
	function(n, x){
		return typeof x == "object" &&
			typeof x.offsetWidth != "undefined" && typeof x.offsetHeight != "undefined";
	},
	dijit.placeOnScreenAroundNode);
dijit.placementRegistry.register("rect",
	function(n, x){
		return typeof x == "object" &&
			"x" in x && "y" in x && "width" in x && "height" in x;
	},
	dijit.placeOnScreenAroundRectangle);

dijit.placeOnScreenAroundElement = function(
	/* DomNode */		node,
	/* Object */		aroundElement,
	/* Object */		aroundCorners,
	/* Function */		layoutNode){

	// summary:
	//		Like dijit.placeOnScreenAroundNode(), except it accepts an arbitrary object
	//		for the "around" argument and finds a proper processor to place a node.

	return dijit.placementRegistry.match.apply(dijit.placementRegistry, arguments);
};

}

if(!dojo._hasResource["bespin.util.webpieces"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.util.webpieces"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

dojo.provide("bespin.util.webpieces");



// = Utility functions for Web snippets =
//
// There are little widgets and components that we want to reuse

dojo.mixin(bespin.util.webpieces, {
    // -- Center Popup
    showCenterPopup: function(el, isModal) {
        if (isModal) {
            this.showOverlay();
        }
        dojo.style(el, 'display', 'block');

        // retrieve required dimensions
        var elDims = dojo.coords(el);
        var browserDims = dijit.getViewport();
        
        // calculate the center of the page using the browser and element dimensions
        var y = (browserDims.h - elDims.h) / 2;
        var x = (browserDims.w - elDims.w) / 2;

        // set the style of the element so it is centered
        dojo.style(el, {
            position: 'absolute',
            top: y + 'px',
            left: x + 'px'
        });
    },

    hideCenterPopup: function(el) {
        dojo.style(el, 'display', 'none');
        this.hideOverlay();
    },

    // -- Overlay
    
    showOverlay: function() { 
        dojo.style('overlay', 'display', 'block');
    },

    hideOverlay: function() {
        dojo.style('overlay', 'display', 'none');
    },

    // take the overlay and make sure it stretches on the entire height of the screen
    fillScreenOverlay: function() {
	    var coords = dojo.coords(document.body);
	    
	    if (coords.h) {
            dojo.style(dojo.byId('overlay'), 'height', coords.h + "px");
        }
    },

    // -- Status
    showStatus: function(msg) {
        dojo.byId("status").innerHTML = msg;
        dojo.style('status', 'display', 'block');
    },
    
    // -- showContentOverlay displays the center screen overlay with
    // a scrolling pane for content.
    showContentOverlay: function(msg, options) {
        options = options || {};
        var el = dojo.byId('centerpopup');
        var addTags = "";
        var endTags = "";
        
        if (options.pre) {
            addTags = addTags + "<pre>";
            endTags = "</pre>" + endTags;
        }
        
        el.innerHTML = "<div style='background-color: #fff; border: 1px solid #000; height: 100%; overflow: auto'>" + addTags + msg + endTags + "</div>";
        oldwidth = el.style.width;
        oldheight = el.style.height;
        el.style.width = "80%";
        el.style.height = "80%";
        
        

        bespin.util.webpieces.showCenterPopup(el);
        
        var connection = dojo.connect(el, "onclick", function() {
            bespin.util.webpieces.hideCenterPopup(el);
            el.style.width = oldwidth;
            el.style.height = oldheight;
            dojo.disconnect(connection);
        });
    }
});

}

if(!dojo._hasResource["dojo.io.iframe"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.io.iframe"] = true;
dojo.provide("dojo.io.iframe");

/*=====
dojo.declare("dojo.io.iframe.__ioArgs", dojo.__IoArgs, {
	constructor: function(){
		//	summary:
		//		All the properties described in the dojo.__ioArgs type, apply
		//		to this type. The following additional properties are allowed
		//		for dojo.io.iframe.send():
		//	method: String?
		//		The HTTP method to use. "GET" or "POST" are the only supported
		//		values.  It will try to read the value from the form node's
		//		method, then try this argument. If neither one exists, then it
		//		defaults to POST.
		//	handleAs: String?
		//		Specifies what format the result data should be given to the
		//		load/handle callback. Valid values are: text, html, xml, json,
		//		javascript. IMPORTANT: For all values EXCEPT html and xml, The
		//		server response should be an HTML file with a textarea element.
		//		The response data should be inside the textarea element. Using an
		//		HTML document the only reliable, cross-browser way this
		//		transport can know when the response has loaded. For the html
		//		handleAs value, just return a normal HTML document.  NOTE: xml
		//		is now supported with this transport (as of 1.1+); a known issue
		//		is if the XML document in question is malformed, Internet Explorer
		//		will throw an uncatchable error.
		//	content: Object?
		//		If "form" is one of the other args properties, then the content
		//		object properties become hidden form form elements. For
		//		instance, a content object of {name1 : "value1"} is converted
		//		to a hidden form element with a name of "name1" and a value of
		//		"value1". If there is not a "form" property, then the content
		//		object is converted into a name=value&name=value string, by
		//		using dojo.objectToQuery().
		this.method = method;
		this.handleAs = handleAs;
		this.content = content;
	}
});
=====*/

dojo.io.iframe = {
	create: function(/*String*/fname, /*String*/onloadstr, /*String?*/uri){
		//	summary:
		//		Creates a hidden iframe in the page. Used mostly for IO
		//		transports.  You do not need to call this to start a
		//		dojo.io.iframe request. Just call send().
		//	fname: String
		//		The name of the iframe. Used for the name attribute on the
		//		iframe.
		//	onloadstr: String
		//		A string of JavaScript that will be executed when the content
		//		in the iframe loads.
		//	uri: String
		//		The value of the src attribute on the iframe element. If a
		//		value is not given, then dojo/resources/blank.html will be
		//		used.
		if(window[fname]){ return window[fname]; }
		if(window.frames[fname]){ return window.frames[fname]; }
		var cframe = null;
		var turi = uri;
		if(!turi){
			if(dojo.config["useXDomain"] && !dojo.config["dojoBlankHtmlUrl"]){
				console.warn("dojo.io.iframe.create: When using cross-domain Dojo builds,"
					+ " please save dojo/resources/blank.html to your domain and set djConfig.dojoBlankHtmlUrl"
					+ " to the path on your domain to blank.html");
			}
			turi = (dojo.config["dojoBlankHtmlUrl"]||dojo.moduleUrl("dojo", "resources/blank.html"));
		}
		var ifrstr = dojo.isIE ? '<iframe name="'+fname+'" src="'+turi+'" onload="'+onloadstr+'">' : 'iframe';
		cframe = dojo.doc.createElement(ifrstr);
		with(cframe){
			name = fname;
			setAttribute("name", fname);
			id = fname;
		}
		dojo.body().appendChild(cframe);
		window[fname] = cframe;
	
		with(cframe.style){
			if(!(dojo.isSafari < 3)){
				//We can't change the src in Safari 2.0.3 if absolute position. Bizarro.
				position = "absolute";
			}
			left = top = "1px";
			height = width = "1px";
			visibility = "hidden";
		}

		if(!dojo.isIE){
			this.setSrc(cframe, turi, true);
			cframe.onload = new Function(onloadstr);
		}

		return cframe;
	},

	setSrc: function(/*DOMNode*/iframe, /*String*/src, /*Boolean*/replace){
		//summary:
		//		Sets the URL that is loaded in an IFrame. The replace parameter
		//		indicates whether location.replace() should be used when
		//		changing the location of the iframe.
		try{
			if(!replace){
				if(dojo.isWebKit){
					iframe.location = src;
				}else{
					frames[iframe.name].location = src;
				}
			}else{
				// Fun with DOM 0 incompatibilities!
				var idoc;
				//WebKit > 521 corresponds with Safari 3, which started with 522 WebKit version.
				if(dojo.isIE || dojo.isWebKit > 521){
					idoc = iframe.contentWindow.document;
				}else if(dojo.isSafari){
					idoc = iframe.document;
				}else{ //  if(d.isMozilla){
					idoc = iframe.contentWindow;
				}
	
				//For Safari (at least 2.0.3) and Opera, if the iframe
				//has just been created but it doesn't have content
				//yet, then iframe.document may be null. In that case,
				//use iframe.location and return.
				if(!idoc){
					iframe.location = src;
					return;
				}else{
					idoc.location.replace(src);
				}
			}
		}catch(e){ 
			console.log("dojo.io.iframe.setSrc: ", e); 
		}
	},

	doc: function(/*DOMNode*/iframeNode){
		//summary: Returns the document object associated with the iframe DOM Node argument.
		var doc = iframeNode.contentDocument || // W3
			(
				(
					(iframeNode.name) && (iframeNode.document) && 
					(document.getElementsByTagName("iframe")[iframeNode.name].contentWindow) &&
					(document.getElementsByTagName("iframe")[iframeNode.name].contentWindow.document)
				)
			) ||  // IE
			(
				(iframeNode.name)&&(document.frames[iframeNode.name])&&
				(document.frames[iframeNode.name].document)
			) || null;
		return doc;
	},

	send: function(/*dojo.io.iframe.__ioArgs*/args){
		//summary: function that sends the request to the server.
		//This transport can only process one send() request at a time, so if send() is called
		//multiple times, it will queue up the calls and only process one at a time.
		if(!this["_frame"]){
			this._frame = this.create(this._iframeName, dojo._scopeName + ".io.iframe._iframeOnload();");
		}

		//Set up the deferred.
		var dfd = dojo._ioSetArgs(
			args,
			function(/*Deferred*/dfd){
				//summary: canceller function for dojo._ioSetArgs call.
				dfd.canceled = true;
				dfd.ioArgs._callNext();
			},
			function(/*Deferred*/dfd){
				//summary: okHandler function for dojo._ioSetArgs call.
				var value = null;
				try{
					var ioArgs = dfd.ioArgs;
					var dii = dojo.io.iframe;
					var ifd = dii.doc(dii._frame);
					var handleAs = ioArgs.handleAs;

					//Assign correct value based on handleAs value.
					value = ifd; //html
					if(handleAs != "html"){
						if(handleAs == "xml"){
							//	FF, Saf 3+ and Opera all seem to be fine with ifd being xml.  We have to
							//	do it manually for IE.  Refs #6334.
							if(dojo.isIE){
								dojo.query("a", dii._frame.contentWindow.document.documentElement).orphan();
								var xmlText=(dii._frame.contentWindow.document).documentElement.innerText;
								xmlText=xmlText.replace(/>\s+</g, "><");
								xmlText=dojo.trim(xmlText);
								//Reusing some code in base dojo for handling XML content.  Simpler and keeps
								//Core from duplicating the effort needed to locate the XML Parser on IE.
								var fauxXhr = { responseText: xmlText };
								value = dojo._contentHandlers["xml"](fauxXhr); // DOMDocument
							}
						}else{
							value = ifd.getElementsByTagName("textarea")[0].value; //text
							if(handleAs == "json"){
								value = dojo.fromJson(value); //json
							}else if(handleAs == "javascript"){
								value = dojo.eval(value); //javascript
							}
						}
					}
				}catch(e){
					value = e;
				}finally{
					ioArgs._callNext();				
				}
				return value;
			},
			function(/*Error*/error, /*Deferred*/dfd){
				//summary: errHandler function for dojo._ioSetArgs call.
				dfd.ioArgs._hasError = true;
				dfd.ioArgs._callNext();
				return error;
			}
		);

		//Set up a function that will fire the next iframe request. Make sure it only
		//happens once per deferred.
		dfd.ioArgs._callNext = function(){
			if(!this["_calledNext"]){
				this._calledNext = true;
				dojo.io.iframe._currentDfd = null;
				dojo.io.iframe._fireNextRequest();
			}
		}

		this._dfdQueue.push(dfd);
		this._fireNextRequest();
		
		//Add it the IO watch queue, to get things like timeout support.
		dojo._ioWatch(
			dfd,
			function(/*Deferred*/dfd){
				//validCheck
				return !dfd.ioArgs["_hasError"];
			},
			function(dfd){
				//ioCheck
				return (!!dfd.ioArgs["_finished"]);
			},
			function(dfd){
				//resHandle
				if(dfd.ioArgs._finished){
					dfd.callback(dfd);
				}else{
					dfd.errback(new Error("Invalid dojo.io.iframe request state"));
				}
			}
		);

		return dfd;
	},

	_currentDfd: null,
	_dfdQueue: [],
	_iframeName: dojo._scopeName + "IoIframe",

	_fireNextRequest: function(){
		//summary: Internal method used to fire the next request in the bind queue.
		try{
			if((this._currentDfd)||(this._dfdQueue.length == 0)){ return; }
			var dfd = this._currentDfd = this._dfdQueue.shift();
			var ioArgs = dfd.ioArgs;
			var args = ioArgs.args;

			ioArgs._contentToClean = [];
			var fn = dojo.byId(args["form"]);
			var content = args["content"] || {};
			if(fn){
				if(content){
					// if we have things in content, we need to add them to the form
					// before submission
					var pHandler = function(name, value) {
						var tn;
						if(dojo.isIE){
							tn = dojo.doc.createElement("<input type='hidden' name='"+name+"'>");
						}else{
							tn = dojo.doc.createElement("input");
							tn.type = "hidden";
							tn.name = name;
						}
						tn.value = value;
						fn.appendChild(tn);
						ioArgs._contentToClean.push(name);
					};
					for(var x in content){
						var val = content[x];
						if(dojo.isArray(val) && val.length > 1){
							var i;
							for (i = 0; i < val.length; i++) {
								pHandler(x,val[i]);
							}
						}else{
							if(!fn[x]){
								pHandler(x,val);
							}else{
								fn[x].value = val;
							}
						}
					}
				}
				//IE requires going through getAttributeNode instead of just getAttribute in some form cases, 
				//so use it for all.  See #2844
				var actnNode = fn.getAttributeNode("action");
				var mthdNode = fn.getAttributeNode("method");
				var trgtNode = fn.getAttributeNode("target");
				if(args["url"]){
					ioArgs._originalAction = actnNode ? actnNode.value : null;
					if(actnNode){
						actnNode.value = args.url;
					}else{
						fn.setAttribute("action",args.url);
					}
				}
				if(!mthdNode || !mthdNode.value){
					if(mthdNode){
						mthdNode.value= (args["method"]) ? args["method"] : "post";
					}else{
						fn.setAttribute("method", (args["method"]) ? args["method"] : "post");
					}
				}
				ioArgs._originalTarget = trgtNode ? trgtNode.value: null;
				if(trgtNode){
					trgtNode.value = this._iframeName;
				}else{
					fn.setAttribute("target", this._iframeName);
				}
				fn.target = this._iframeName;
				dojo._ioNotifyStart(dfd);
				fn.submit();
			}else{
				// otherwise we post a GET string by changing URL location for the
				// iframe
				var tmpUrl = args.url + (args.url.indexOf("?") > -1 ? "&" : "?") + ioArgs.query;
				dojo._ioNotifyStart(dfd);
				this.setSrc(this._frame, tmpUrl, true);
			}
		}catch(e){
			dfd.errback(e);
		}
	},

	_iframeOnload: function(){
		var dfd = this._currentDfd;
		if(!dfd){
			this._fireNextRequest();
			return;
		}

		var ioArgs = dfd.ioArgs;
		var args = ioArgs.args;
		var fNode = dojo.byId(args.form);
	
		if(fNode){
			// remove all the hidden content inputs
			var toClean = ioArgs._contentToClean;
			for(var i = 0; i < toClean.length; i++) {
				var key = toClean[i];
				//Need to cycle over all nodes since we may have added
				//an array value which means that more than one node could
				//have the same .name value.
				for(var j = 0; j < fNode.childNodes.length; j++){
					var chNode = fNode.childNodes[j];
					if(chNode.name == key){
						dojo.destroy(chNode);
						break;
					}
				}
			}

			// restore original action + target
			if(ioArgs["_originalAction"]){
				fNode.setAttribute("action", ioArgs._originalAction);
			}
			if(ioArgs["_originalTarget"]){
				fNode.setAttribute("target", ioArgs._originalTarget);
				fNode.target = ioArgs._originalTarget;
			}
		}

		ioArgs._finished = true;
	}
}

}

if(!dojo._hasResource["bespin.cmd.commands"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.cmd.commands"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

dojo.provide("bespin.cmd.commands");

// = Commands =
//
// This array stores all of the default commands.

// ** {{{bespin.cmd.commands.store}}} **
//
// The core store to hold commands that others share.
bespin.cmd.commands.store = {};

// ** {{{bespin.cmd.commands.add}}} **
//
// Add the command to the store which has a name -> command hash
bespin.cmd.commands.add = function(command) {
    bespin.cmd.commands.store[command.name] = command;
};

// ** {{{bespin.cmd.commands.get}}} **
//
// Return a command from the store
bespin.cmd.commands.get = function(commandname) {
    return bespin.cmd.commands.store[commandname];
};

// ** {{{Command: bespin.cmd.commands.toArgArray}}} **
// Helper for when you have a command that needs to get a hold of it's params
// as an array for processing
bespin.cmd.commands.toArgArray = function(args) {
    if (args == null) {
        return [];
    }
    else {
        var spliten = args.split(" ");
        if (spliten.length == 1 && spliten[0] == "") {
            return [];
        }
        else {
            return spliten;
        }
    }
};

// == Start adding commands to the store ==
//
bespin.cmd.displayHelp = function(commandStore, commandLine, extra, morehelpoutput) {
    var commands = [];
    var command, name;

    if (commandStore.commands[extra]) { // caught a real command
        command = commandStore.commands[extra];
        commands.push(command['description'] ? command.description : command.preview);
    } else {
        var showHidden = false;

        var subcmdextra = "";
        if (commandStore.subcommandFor) subcmdextra = " for " + commandStore.subcommandFor;

        if (extra) {
            if (extra == "hidden") { // sneaky, sneaky.
                extra = "";
                showHidden = true;
            }
            commands.push("Commands starting with '" + extra + "'.<br/>");
        }

        var tobesorted = [];
        for (name in commandStore.commands) {
            tobesorted.push(name);
        }

        var sorted = tobesorted.sort();

        commands.push("<table>");
        for (var i = 0; i < sorted.length; i++) {
            name = sorted[i];
            command = commandStore.commands[name];

            if (!showHidden && command.hidden) continue;
            if (extra && name.indexOf(extra) != 0) continue;

            var args = (command.takes) ? ' [' + command.takes.order.join('] [') + ']' : '';

            commands.push("<tr>");
            commands.push('<th>' + name + '</th>');
            commands.push('<td>' + command.preview + "</td>");
            commands.push('<td>' + args + '</td>');
            commands.push("</tr>");
        }
        commands.push("</table>");
    }
    commandLine.addOutput(commands.join("") + (morehelpoutput || ""));
};

// ** {{{Command: help}}} **
bespin.cmd.commands.add({
    name: 'help',
    takes: ['search'],
    preview: 'show commands',
    description: 'The <u>help</u> gives you access to the various commands in the Bespin system.<br/><br/>You can narrow the search of a command by adding an optional search params.<br/><br/>If you pass in the magic <em>hidden</em> parameter, you will find subtle hidden commands.<br/><br/>Finally, pass in the full name of a command and you can get the full description, which you just did to see this!',
    completeText: 'optionally, narrow down the search',
    execute: function(commandLine, extra) {
        bespin.cmd.displayHelp(commandLine.commandStore, commandLine, extra);
    }
});

// ** {{{Command: eval}}} **
bespin.cmd.commands.add({
    name: 'eval',
    takes: ['js-code'],
    preview: 'evals given js code and show the result',
    completeText: 'evals given js code and show the result',
    execute: function(commandLine, jscode) {
        try {
            var result = eval(jscode);
        } catch (err) {
            var result = '<b>Error: ' + err.message + '</b>';
        }

        var msg = '';
        var type = '';

        if (dojo.isFunction(result)) {
            // converts the function to a well formated string
            msg = (result + '').replace(/\n/g, '<br>').replace(/ /g, '&#160');
            type = 'function';
        } else if (dojo.isObject(result)) {
            if (dojo.isArray(result)) {
                type = 'array';
            } else {
                type = 'object';
            }

            var items = [];
            var value;

            for (x in result) {
                if (dojo.isFunction(result[x])) {
                    value = "[function]";
                } else if (dojo.isObject(result[x])) {
                    value = "[object]";
                } else {
                    value = result[x];
                }

                items.push({name: x, value: value});
            }

            items.sort(function(a,b) {
                return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
            });

            for (var x = 0; x < items.length; x++) {
                msg += '<b>' + items[x].name + '</b>: ' + items[x].value + '<br>';
            }

        } else {
            msg = result;
            type = typeof result;
        }

        commandLine.addOutput("<u>Result for eval <b>\""+jscode+"\"</b> (type: "+ type+"): </u><br><br>"+ msg);
    }
});

// ** {{{Command: set}}} **
bespin.cmd.commands.add({
        name: 'set',
        takes: ['key', 'value'],
        preview: 'define and show settings',
        completeText: 'optionally, add a key and/or a value, else you will see all settings',
        // complete: function(commandLine, value) {
        //     console.log(commandLine);
        //     console.log(value);
        //     return value;
        // },
        execute: function(commandLine, setting) {
            var output;

            if (!setting.key) { // -- show all
                var settings = commandLine.settings.list();
                output = "";
                dojo.forEach(settings.sort(function (a, b) { // first sort the settings based on the key
                    if (a.key < b.key) {
                        return -1;
                    } else if (a.key == b.key) {
                        return 0;
                    } else {
                        return 1;
                    }
                }), function(setting) { // now add to output unless hidden settings (start with a _)
                    if (setting.key[0] != '_') {
                        output += "<strong>" + setting.key + "</strong> = " + setting.value + "<br/>";
                    }
                });
            } else {
                var key = setting.key;
                if (setting.value === undefined) { // show it
                    var value = commandLine.settings.get(key);
                    if (value) {
                        output = "<strong>" + key + "</strong> = " + value;
                    } else {
                        output = "You do not have a setting for '" + key + "'";
                    }
                } else {
                    output = "Saving setting: <strong>" + key + "</strong> = " + setting.value;
                    commandLine.settings.set(key, setting.value);
                }
            }
            commandLine.addOutput(output);
        }
});

// ** {{{Command: unset}}} **
bespin.cmd.commands.add({
        name: 'unset',
        takes: ['key'],
        preview: 'unset a setting entirely',
        completeText: 'add a key for the setting to delete entirely',
        execute: function(commandLine, key) {
            commandLine.settings.unset(key);
            commandLine.addOutput("Unset the setting for " + key + ".");
        }
});

// ** {{{Command: search}}} **
bespin.cmd.commands.add({
        name: 'search',
        takes: ['searchString'],
        preview: 'searches the current file for the given searchString',
        completeText: 'type in a string to search',
        execute: function(commandLine, str) {
            bespin.get('actions').startSearch(str, 'commandLine');
        }
});

// ** {{{Command: files (ls, list)}}} **
bespin.cmd.commands.add({
    name: 'files',
    aliases: ['ls', 'list'],
    takes: ['project'],
    preview: 'show files',
    completeText: 'optionally, add the project name of your choice',
    execute: function(commandLine, project) {
        if (!project) {
            bespin.withComponent('editSession', function(editSession) {
                project = editSession.project;
            });
        }

        if (!project) {
            commandLine.addErrorOutput("You need to pass in a project");
            return;
        }

        commandLine.files.fileNames(project, function(fileNames) {
            var files = "";
            for (var x = 0; x < fileNames.length; x++) {
                files += fileNames[x].name + "<br/>";
            }
            commandLine.addOutput(files);
        });
    }
});

// ** {{{Command: status}}} **
bespin.cmd.commands.add({
    name: 'status',
    preview: 'get info on the current project and file',
    execute: function(commandLine) {
        bespin.publish("session:status");
    }
});

// ** {{{Command: project}}} **
bespin.cmd.commands.add({
    name: 'project',
    takes: ['projectname'],
    preview: 'show the current project, or set to a new one',
    completeText: 'optionally, add the project name to change to that project',
    execute: function(commandLine, projectname) {
        if (projectname) {
            bespin.publish("project:set", { project: projectname });
        } else {
            commandLine.executeCommand('status');
        }
    }
});

// ** {{{Command: projects}}} **
bespin.cmd.commands.add({
    name: 'projects',
    preview: 'show projects',
    execute: function(commandLine, extra) {
        commandLine.files.projects(function(projectNames) {
            var projects = "";
            for (var x = 0; x < projectNames.length; x++) {
                projects += projectNames[x].name + "<br/>";
            }
            commandLine.addOutput(projects);
        });
    }
});

// ** {{{Command: createproject}}} **
bespin.cmd.commands.add({
    name: 'createproject',
    takes: ['projectname'],
    preview: 'create a new project',
    usage: '[newprojectname]',
    execute: function(commandLine, projectname) {
        if (!projectname) {
            commandLine.showUsage(this);
            return;
        }
        bespin.publish("project:create", { project: projectname });
    }
});

// ** {{{Command: createproject}}} **
bespin.cmd.commands.add({
    name: 'deleteproject',
    takes: ['projectname'],
    preview: 'delete a project',
    usage: '[projectname]',
    execute: function(commandLine, projectname) {
        if (!projectname) {
            commandLine.showUsage(this);
            return;
        }
        bespin.publish("project:delete", { project: projectname });
    }
});

// ** {{{Command: renameproject}}} **
bespin.cmd.commands.add({
    name: 'renameproject',
    takes: ['currentProject', 'newProject'],
    preview: 'rename a project',
    usage: '[currentProject], [newProject]',
    execute: function(commandLine, args) {
        if (!args.currentProject || !args.newProject) {
            commandLine.showUsage(this);
            return;
        }
        bespin.publish("project:rename", { currentProject: args.currentProject, newProject: args.newProject });
    }
});

// ** {{{Command: mkdir}}} **
bespin.cmd.commands.add({
    name: 'mkdir',
    takes: ['path', 'projectname'],
    preview: 'create a new directory in the given project',
    usage: '[path] [projectname]',
    execute: function(commandLine, args) {
        if (!args.path) {
            commandLine.showUsage(this);
            return;
        }

        var opts = { path: args.path };
        if (args.projectname) opts.project = args.projectname;

        bespin.publish("directory:create", opts);
    }
});

// ** {{{Command: save}}} **
bespin.cmd.commands.add({
    name: 'save',
    takes: ['filename'],
    preview: 'save the current contents',
    completeText: 'add the filename to save as, or use the current file',
    withKey: "CMD S",
    execute: function(commandLine, filename) {
        bespin.publish("editor:savefile", {
            filename: filename
        });
    }
});

// ** {{{Command: load (open)}}} **
bespin.cmd.commands.add({
    name: 'load',
    aliases: ['open'],
    takes: ['filename', 'project'],
    preview: 'load up the contents of the file',
    completeText: 'add the filename to open',
    execute: function(commandLine, opts) {
        bespin.publish("editor:openfile", opts);
    }
});

// ** {{{Command: preview}}} **
bespin.cmd.commands.add({
    name: 'preview',
    takes: ['filename'],
    preview: 'view the file in a new browser window',
    completeText: 'add the filename to view or use the current file',
    execute: function(commandLine, filename) {
        bespin.publish("editor:preview", {
            filename: filename
        });
    }
});

// ** {{{Command: editconfig}}} **
bespin.cmd.commands.add({
    name: 'editconfig',
    aliases: ['config'],
    preview: 'load up the config file',
    execute: function(commandLine) {
        bespin.publish("editor:config:edit");
    }
});

// ** {{{Command: runconfig}}} **
bespin.cmd.commands.add({
    name: 'runconfig',
    preview: 'run your config file',
    execute: function(commandLine) {
        bespin.publish("editor:config:run");
    }
});

// ** {{{Command: cmdload}}} **
bespin.cmd.commands.add({
    name: 'cmdload',
    takes: ['commandname'],
    preview: 'load up a new command',
    completeText: 'command name to load (required)',
    usage: '[commandname]: Command name required.',
    execute: function(commandLine, commandname) {
        if (!commandname) {
            commandLine.showUsage(this);
            return;
        }
        bespin.publish("command:load", { commandname: commandname });
    }
});

// ** {{{Command: cmdedit}}} **
bespin.cmd.commands.add({
    name: 'cmdedit',
    takes: ['commandname'],
    aliases: ['cmdadd'],
    preview: 'edit the given command (force if doesn\'t exist',
    completeText: 'command name to edit (required)',
    usage: '[commandname]: Command name required.',
    execute: function(commandLine, commandname) {
        if (!commandname) {
            commandLine.showUsage(this);
            return;
        }

        bespin.publish("command:edit", { commandname: commandname });
    }
});

// ** {{{Command: cmdlist}}} **
bespin.cmd.commands.add({
    name: 'cmdlist',
    preview: 'list my custom commands',
    execute: function(commandLine) {
        bespin.publish("command:list");
    }
});

// ** {{{Command: cmdrm}}} **
bespin.cmd.commands.add({
    name: 'cmdrm',
    takes: ['commandname'],
    preview: 'delete a custom command',
    completeText: 'command name to delete (required)',
    usage: '[commandname]: Command name required.',
    execute: function(commandLine, commandname) {
        if (!commandname) {
            commandLine.showUsage(this);
            return;
        }

        bespin.publish("command:delete", { commandname: commandname });
    }
});

// ** {{{Command: newfile}}} **
bespin.cmd.commands.add({
    name: 'newfile',
    //aliases: ['new'],
    takes: ['filename', 'project'],
    preview: 'create a new buffer for file',
    completeText: 'optionally, name the new filename first, and then the name of the project second',
    withKey: "CTRL SHIFT N",
    execute: function(commandLine, args) {
        if (args.filename) {
            args.newfilename = args.filename;
            delete args.filename;
        }
        bespin.publish("editor:newfile", args || {});
    }
});

// ** {{{Command: rm (remove, del)}}} **
bespin.cmd.commands.add({
    name: 'rm',
    aliases: ['remove', 'del'],
    takes: ['filename', 'project'],
    preview: 'remove the file',
    completeText: 'add the filename to remove, and optionally a specific project at the end',
    execute: function(commandLine, args) {
        var project = args.project || bespin.get('editSession').project;
        var filename = args.filename;

        if (!project) {
            commandLine.addErrorOutput("'rm' only works with the project is set.");
            return;
        }

        if (!filename) {
            commandLine.addErrorOutput("give me a filename or directory to delete");
            return;
        }

        commandLine.files.removeFile(project, filename, function() {
            if (bespin.get('editSession').checkSameFile(project, filename)) commandLine.editor.model.clear(); // only clear if deleting the same file

            commandLine.addOutput('Removed file: ' + filename, true);
        }, function(xhr) {
            commandLine.addErrorOutput("Wasn't able to remove the file <b>" + filename + "</b><br/><em>Error</em> (probably doesn't exist): " + xhr.responseText);
        });
    }
});

// ** {{{Command: closefile}}} **
bespin.cmd.commands.add({
    name: 'closefile',
    takes: ['filename', 'project'],
    preview: 'close the file (may lose edits)',
    completeText: 'add the filename to close (defaults to this file).<br>also, optional project name.',
    execute: function(commandLine, args) {
        bespin.publish("editor:closefile", args);
    }
});

// ** {{{Command: dashboard}}} **
bespin.cmd.commands.add({
    name: 'dashboard',
    preview: 'navigate to the file',
    execute: function(commandLine) {
        bespin.util.navigate.dashboard();
    }
});

// ** {{{Command: version}}} **
bespin.cmd.commands.add({
    name: 'version',
    takes: ['command'],
    preview: 'show the version for Bespin or a command',
    completeText: 'optionally, a command name',
    execute: function(commandLine, command) {
        var bespinVersion = 'Your Bespin is at version ' + bespin.versionNumber + ', Code name: "' + bespin.versionCodename + '"';
        var version;
        if (command) {
            var theCommand = commandLine.commandStore.commands[command];
            if (!theCommand) {
                version = "It appears that there is no command named '" + command + "', but " + bespinVersion;
            } else {
                version = (theCommand.version)
                    ? "The command named '" + command + "' is at version " + theCommand.version
                    : "The command named '" + command + "' is a core command in Bespin version " + bespin.versionNumber;
            }
        }
        else {
            version = bespinVersion;
        }
        commandLine.addOutput(version);
    }
});

// ** {{{Command: clear}}} **
bespin.cmd.commands.add({
    name: 'clear',
    aliases: ['cls'],
    preview: 'clear the file',
    execute: function(commandLine) {
        commandLine.editor.model.clear();
    }
});

// ** {{{Command: goto}}} **
(function () {
    var previewFull      = 'move it! make the editor head to a line number or a function name.';
    var preview          = 'move it! make the editor head to a line number.';
    var completeTextFull = 'add the line number to move to, or the name of a function in the file';
    var completeText     = 'add the line number to move to in the file';
    var gotoCmd = {
        name: 'goto',
        takes: ['value'],
        preview: previewFull,
        completeText: completeTextFull,
        execute: function(commandLine, value) {
            var settings = bespin.get("settings");
            if (value) {
                var linenum = parseInt(value, 10); // parse the line number as a decimal
    
                if (isNaN(linenum)) { // it's not a number, so for now it is a function name
                    if(settings.isOn(settings.get("syntaxcheck"))) {
                        bespin.publish("parser:gotofunction", {
                            functionName: value
                        });
                    } else {
                        bespin.publish("message:error", { msg: "Please enter a valid line number." });
                    }
                } else {
                    bespin.publish("editor:moveandcenter", {
                        row: linenum
                    });
                }
            }
        }
    };
    bespin.cmd.commands.add(gotoCmd);
    bespin.subscribe("settings:set:syntaxcheck", function () {
        var settings = bespin.get("settings");
        if(settings.isOn(settings.get("syntaxcheck"))) {
            gotoCmd.preview = previewFull;
            gotoCmd.completeText = completeTextFull;
        } else {
            gotoCmd.preview = preview;
            gotoCmd.completeText = completeText;
        }
    });
})();

// ** {{{Command: replace}}} **
bespin.cmd.commands.add({
    name: 'replace',
    takes: ['search', 'replace'],
    preview: 's/foo/bar/g',
    completeText: 'add the search regex, and then the replacement text',
    execute: function(commandLine, args) {
        commandLine.editor.model.replace(args.search, args.replace);
    }
});

// ** {{{Command: login}}} **
bespin.cmd.commands.add({
    name: 'login',
    // aliases: ['user'],
    //            takes: ['username', 'password'],
    hidden: true,
    takes: {
        order: ['username', 'password'],
        username: {
            "short": 'u'
        },
        password: {
            "short": 'p',
            optional: true
        }
    },
    preview: 'login to the service',
    completeText: 'pass in your username and password',
    execute: function(commandLine, args) {
        if (!args) { // short circuit if no username
            commandLine.executeCommand("status");
            return;
        }
        bespin.get('editSession').username = args.user; // TODO: normalize syncing
        bespin.get('server').login(args.user, args.pass);
    }
});

// ** {{{Command: logout}}} **
bespin.cmd.commands.add({
    name: 'logout',
    preview: 'log out',
    execute: function(commandLine) {
        delete bespin.get('editSession').username;
        bespin.get('server').logout(function() {
            window.location.href="/";
        });
    }
});

// ** {{{Command: bespin}}} **
bespin.cmd.commands.add({
    name: 'bespin',
    preview: 'has',
    hidden: true,
    messages: [
        "really wants you to trick it out in some way.",
        "is your Web editor.",
        "would love to be like Emacs on the Web.",
        "is written on the Web platform, so you can tweak it."
    ],
    execute: function(commandLine) {
        commandLine.addOutput("Bespin " + this.messages[Math.floor(Math.random() * this.messages.length)]);
    }
});

// ** {{{Command: sort}}} **
bespin.cmd.commands.add({
    name: 'sort',
    takes: ['direction'],
    preview: 'sort the current buffer',
    completeText: 'optionally, sort descending',
    execute: function(commandLine, direction) {
        var buffer = commandLine.editor.model.getDocument().split(/\n/);
        buffer.sort();
        if (direction && /^desc/.test(direction.toLowerCase())) buffer.reverse();
        commandLine.editor.model.insertDocument(buffer.join("\n"));
    }
});

// ** {{{Command: quota}}} **
bespin.cmd.commands.add({
    name: 'quota',
    preview: 'show your quota info',
    megabytes: function(bytes) {
        return (bytes / 1024 / 1024).toFixed(2);
    },
    execute: function(commandLine) {
        var es = bespin.get('editSession');
        var output = "You have " + this.megabytes(es.quota - es.amountUsed) +
                     " MB free space to put some great code!<br>" +
                     "Used " + this.megabytes(es.amountUsed) + " MB " +
                     "out of your " + this.megabytes(es.quota) + " MB quota.";
        commandLine.addOutput(output);
    }
});

// ** {{{Command: export}}} **
bespin.cmd.commands.add({
    name: 'export',
    takes: ['project', 'archivetype'],
    preview: 'export the given project with an archivetype of zip or tgz',
    completeText: 'project name, archivetype (zip | tgz, defaults to zip)',
    execute: function(commandLine, args) {
        var project = args.project || bespin.get('editSession').project;

        var type = args.archivetype;
        if (!bespin.util.include(['zip','tgz','tar.gz'], type)) {
            type = 'zip';
        }

        bespin.get('server').exportProject(project, type); // try to do it via the iframe
    }
});

// ** {{{Command: import}}} **
bespin.cmd.commands.add({
    name: 'import',
    takes: ['url', 'project'],
    preview: 'import the given url as a project.<br>If a project name isn\'t given it will use the filename<br>If no URL is given to import, a file upload box will be shown to import.',
    completeText: 'url (to an archive zip | tgz) and/or project name',
    usage: "[url of archive] [projectname]<br><br><em>If only a URL is given, the projectname will be implied<br><br>If only a project name is given, a file upload window will be shown to upload.</em>",
    // ** {{{calculateProjectName}}}
    //
    // Given a URL, work out the project name as a default
    // For example, given http://foo.com/path/to/myproject.zip
    // return "myproject"
    calculateProjectName: function(url) {
        var split = url.split('/');
        var projectMaker = split[split.length - 1].split(".");
        projectMaker.pop();
        return projectMaker.join("_");
    },
    // ** {{{isURL}}}
    //
    // Test the given string to return if it is a URL.
    // In this context it has to be http(s) only
    isURL: function(url) {
        return (url && (/^http(:|s:)/.test(url)));
    },
    upload: function(project) {
        // use the center popup and inject a form in that points to the right place.
        var el = dojo.byId('centerpopup');


        el.innerHTML = "<div id='upload-container'><form method='POST' name='upload' id='upload' enctype='multipart/form-data'><div id='upload-header'>Import project via upload <img id='upload-close' src='images/icn_close_x.png' align='right'></div><div id='upload-content'><div id='upload-status'></div><p>Browse to find the project archive that you wish to archive<br>and then click on the <code>Upload</code> button.</p><center><input type='file' id='filedata' name='filedata' accept='application/zip,application/x-gzip'> <input type='submit' value='Upload'></center></div></form></div>";

        
        

        

        dojo.connect(dojo.byId('upload'), "submit", function() {
            dojo.byId('upload-status').innerHTML = 'Importing file into new project ' + project;
            dojo.io.iframe.send({
                url: '/project/import/' + project,
                form: dojo.byId('upload'),
                method: 'POST',
                handleAs: 'text',
                preventCache: true,
                contentType: "multipart/form-data",
                load: function(data, ioArg) {
                    dojo.byId('upload-status').innerHTML = 'Thanks for uploading the file!';
                },
                error: function(error, ioArg) {
                    setTimeout(function() {
                        bespin.get('files').projects(function(projectNames) {
                            if (dojo.some(projectNames, function(testProject) { return project + '/' == testProject.name; })) {
                                dojo.byId('upload-status').innerHTML = 'Archive imported and project ' + project + ' has been created!';
                            } else {
                                dojo.byId('upload-status').innerHTML = 'Error uploading the file. Sorry, try again!';
                            }
                        });
                    }, 100);
                }
            });
        });

        bespin.util.webpieces.showCenterPopup(el, true);

        // TODO: refactor this block into webpieces if popup is modal
        // pass the uploadClose DOM element as parameter to showCenterPopup
        var uploadClose, overlay;
        var hideCenterPopup = function(){
            el.removeChild(el.firstChild);
            bespin.util.webpieces.hideCenterPopup(el);
            dojo.disconnect(uploadClose);
            dojo.disconnect(overlay);
        };
        uploadClose = dojo.connect(dojo.byId("upload-close"), "onclick", hideCenterPopup);
        overlay = dojo.connect(dojo.byId("overlay"), "onclick", hideCenterPopup);
    },

    // ** {{{execute}}}
    //
    // Can be called in three ways:
    //
    // * import http://foo.com/path/to/archive.zip
    // * import http://foo.com/path/to/archive.zip projectName
    // * import projectName http://foo.com/path/to/archive.zip
    execute: function(commandLine, args) {
        var project, url;

        // Fail fast. Nothing given?
        if (!args.url) {
            commandLine.showUsage(this);
            return;
        // * checking - import http://foo.com/path/to/archive.zip
        } else if (!args.project && this.isURL(args.url)) {
            args.project = this.calculateProjectName(args.url);
        // * Oops, project and url are the wrong way around. That's fine
        } else if (this.isURL(args.project)) {
            project = args.project;
            url = args.url;
            args.project = url;
            args.url = project;
        // * Make sure that a URL came along at some point, else call up an upload box
        } else if (!this.isURL(args.url)) {
            var project = args.url; // only a project has been passed in
            this.upload(project);
        } else {
        // * A project and URL are here and available to do a URL based import
            project = args.project;
            url = args.url;

            commandLine.addOutput("About to import " + project + " from:<br><br>" + url + "<br><br><em>It can take awhile to download the project, so be patient!</em>");

            bespin.publish("project:import", { project: project, url: url });
        }
    }
});

// ** {{{Command: trim}}} **
bespin.cmd.commands.add({
    name: 'trim',
    takes: ['side'], // left, right, both
    preview: 'trim trailing or leading whitespace',
    completeText: 'optionally, give a side of left, right, or both (defaults to right)',
    execute: function(commandLine, side) {
        commandLine.editor.model.changeEachRow(function(row) {
            if (!side) side = "right";

            if (bespin.util.include(["left", "both"], side)) {
                while (row[0] == ' ') {
                    row.shift();
                }
            }

            if (bespin.util.include(["right", "both"], side)) {
                var i = row.length - 1;

                while (row[i] == ' ') {
                    delete row[i];
                    i--;
                }
            }
            return bespin.util.shrinkArray(row);
        });
    }
});

// ** {{{Command: bindkey}}} **
bespin.cmd.commands.add({
    name: 'bindkey',
    takes: ['modifiers', 'key', 'action'],
    preview: 'Bind a key to an action, or show bindings',
    completeText: 'With no arguments show bindings, else give modifier(s), key, and action name to set',
    execute: function(commandLine, args) {
        if (args.key && args.action) { // bind a new key binding
            if (args.modifiers == "none") args.modifiers = '';

            bespin.publish("editor:bindkey", args);
        } else { // show me the key bindings
            var descriptions = bespin.get('editor').editorKeyListener.keyMapDescriptions;
            var output = "<table>";

            for (var keys in descriptions) {
                var keyData = keys.split(','); // metaKey, ctrlKey, altKey, shiftKey
                var keyCode = parseInt(keyData[0]);

                var modifiers = [];
                if (keyData[1] === "true") modifiers.push("CMD");
                if (keyData[2] === "true") modifiers.push("CTRL");
                if (keyData[3] === "true") modifiers.push("ALT");
                if (keyData[4] === "true") modifiers.push("SHIFT");

                var modifierInfo = modifiers.length > 0 ? modifiers.join(', ') + " " : "";
                var keyInfo = modifierInfo + bespin.util.keys.KeyCodeToName[keyCode] || keyCode;
                output += "<tr><td style='text-align:right;'>" + keyInfo + "</td><td>&#x2192;</td><td>" + descriptions[keys] + "</td></tr>";
            }
            output += "</table>";
            commandLine.addOutput(output);
        }
    }
});

// ** {{{Command: template}}} **
bespin.cmd.commands.add({
    name: 'template',
    takes: ['type'],
    preview: 'insert templates',
    completeText: 'pass in the template name',
    templates: { 'in': "for (var key in object) {\n\n}"},
    execute: function(cmdline, type) {
        cmdline.editor.model.insertChunk(cmdline.editor.cursorPosition, this.templates[type]);
    }
});

// ** {{{Command: alias}}} **
bespin.cmd.commands.add({
    name: 'alias',
    takes: ['alias', 'command'],
    preview: 'define and show aliases for commands',
    completeText: 'optionally, add your alias name, and then the command name',
    execute: function(commandLine, args) {
        var aliases = commandLine.commandStore.aliases;

        if (!args.alias) {
            // * show all
            var output = "<table>";
            for (var x in aliases) {
                output += "<tr><td style='text-align:right;'>" + x + "</td><td>&#x2192;</td><td>" + aliases[x] + "</td></tr>";
            }
            output += "</table>";
            commandLine.addOutput(output);
        } else {
            // * show just one
            if (args.command === undefined) {
              var alias = aliases[args.alias];
              if (alias) {
                  commandLine.addOutput(args.alias + " &#x2192; " + aliases[args.alias]);
              } else {
                  commandLine.addErrorOutput("No alias set for '" + args.alias + "'");
              }
            } else {
                // * save a new alias
                var key = args.alias;
                var value = args.command;
                var aliascmd = value.split(' ')[0];

                if (commandLine.commandStore.commands[key]) {
                    commandLine.addErrorOutput("Sorry, there is already a command with the name: " + key);
                } else if (commandLine.commandStore.commands[aliascmd]) {
                    aliases[key] = value;
                    commandLine.addOutput("Saving alias: " + key + " &#x2192; " + value);
                } else if (aliases[aliascmd]) {
                    // TODO: have the symlink to the alias not the end point
                    aliases[key] = value;
                    commandLine.addOutput("Saving alias: " + key + " &#x2192; " + aliases[value] + " (" + value + " was an alias itself)");
                } else {
                    commandLine.addErrorOutput("Sorry, no command or alias with that name.");
                }
            }
        }
    }
});

// ** {{{Command: history}}} **
bespin.cmd.commands.add({
    name: 'history',
    preview: 'Show history of the commands',
    execute: function(commandLine) {
        var instructions = commandLine.history.getInstructions();
        var output = [];
        output.push("<table>");
        var count = 1;
        dojo.forEach(instructions, function(instruction) {
            output.push("<tr>");
            output.push('<th>' + count + '</th>');
            output.push('<td>' + instruction.typed + "</td>");
            output.push("</tr>");
            count++;
        });
        output.push("</table>");

        commandLine.addOutput(output.join(''));
    }
});

//** {{{Command: history}}} **
bespin.cmd.commands.add({
    name: '!',
    takes: ['number'],
    preview: 'Execute a command from the history',
    execute: function(commandLine, number) {
        number = parseInt(number);
        if (!number) {
            commandLine.addErrorOutput("You're gonna need to give me a history number to execute.");
            return;
        }
        commandLine.addOutput(commandLine.history.getInstructions()[number - 1].typed);
    }
});

// ** {{{Command: use}}} **
bespin.cmd.commands.add({
    name: 'use',
    takes: ['type'],
    preview: 'use patterns to bring in code',
    completeText: '"sound" will add sound support',
    libnames: {
        'jquery': 'jquery.min.js'
    },
    execute: function(commandLine, type) {
        if (type == 'sound') {
            commandLine.editor.model.insertChunk({ row: 3, col: 0 },
                '  <script type="text/javascript" src="soundmanager2.js"></script>\n');
            commandLine.editor.model.insertChunk({ row: 4, col: 0 },
                "  <script>\n  var sound; \n  soundManager.onload = function() {\n    sound =  soundManager.createSound('mySound','/path/to/mysoundfile.mp3');\n  }\n  </script>\n");
        } else if (type == 'js') {
            var jslib = 'http://ajax.googleapis.com/ajax/libs/jquery/1.2.6/jquery.min.js';
            var script = '<script type="text/javascript" src="' + jslib + '"></script>\n';
            commandLine.editor.model.insertChunk({ row: 3, col: 0 }, script);
        }
    }
});

bespin.cmd.commands.add({
    name: 'uc',
    preview: 'Change all selected text to uppercase',
    withKey: "CMD SHIFT U",
    execute: function(commandLine) {
        var args = { stringCase: 'u' };
        commandLine.editor.ui.actions.selectionChangeCase(args);
    }
});

bespin.cmd.commands.add({
    name: 'lc',
    preview: 'Change all selected text to lowercase',
    withKey: "CMD SHIFT L",
    execute: function(commandLine) {
        var args = { stringCase: 'l' };
        commandLine.editor.ui.actions.selectionChangeCase(args);
    }
});

// ** {{{Command: codecomplete}}} **
bespin.cmd.commands.add({
    name: 'complete',
    preview: 'auto complete a piece of code',
    completeText: 'enter the start of the string',
    withKey: "SHIFT SPACE",
    execute: function(self, args) {
        console.log("Complete")
    }
});

// ** {{{Command: outline}}} **
bespin.cmd.commands.add({
    name: 'outline',
    preview: 'show outline of source code',
    withKey: "ALT SHIFT O",
    execute: function(commandLine) {
        bespin.publish("parser:showoutline");
    }
});

//** {{{Command: slow}}} **
bespin.cmd.commands.add({
    name: 'slow',
    takes: ['seconds'],
    preview: 'create some output, slowly, after a given time (default 5s)',
    execute: function(commandLine, seconds) {
        seconds = seconds || 5;

        setTimeout(commandLine.link(function() {
            bespin.publish("session:status");
        }), seconds * 1000);
    }
});

}

if(!dojo._hasResource["bespin.vcs"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.vcs"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

dojo.provide("bespin.vcs");





// Command store for the VCS commands
// (which are subcommands of the main 'vcs' command)
bespin.vcs.commands = new bespin.cmd.commandline.CommandStore({ subCommand: {
    name: 'vcs',
    preview: 'run a version control command',
    completeText: 'subcommands: add, clone, commit, diff, getkey, help, push, remove, resolved, update',
    subcommanddefault: 'help'
}});

bespin.vcs.createStandardHandler = function() {
    var commandLine = bespin.get("commandLine");
    return {
        evalJSON: true,
        onPartial: function(response) {
            console.log("partial", response);
            commandLine.addPartialOutput(response);
        },
        onSuccess: function(response) {
            console.log("success", response);
            commandLine.addOutput(response);
        },
        onFailure: function(xhr) {
            commandLine.addErrorOutput(xhr.response);
        }
    };
};

//** {{{ bespin.vcs.createCancelHandler }}}
// Create an event handler to sort out the output if the user clicks cancel
bespin.vcs.createCancelHandler = function() {
    var commandLine = bespin.get("commandLine");
    return commandLine.link(function() {
        var el = dojo.byId('centerpopup');
        bespin.util.webpieces.hideCenterPopup(el);
        commandLine.addErrorOutput("Cancelled");
    });
};

bespin.vcs._remoteauthCache = {};

// ** {{{ bespin.vcs.get_remoteauth }}}
// Looks in the cache or calls to the server to find
// out if the given project requires remote authentication.
// The result is published at vcs:remoteauth:project
bespin.vcs.getRemoteauth = function(project, callback) {
    var cached = bespin.vcs._remoteauthCache[project];
    if (cached === undefined) {
        bespin.get('server').remoteauth(project, callback);
        return;
    }
    // work from cache
    callback(cached);
};

bespin.subscribe("vcs:remoteauthUpdate", function(event) {
    bespin.vcs._remoteauthCache[event.project] = event.remoteauth;
});

bespin.vcs.clone = function(url) {
    var commandLine = bespin.get("commandLine");
    var el = dojo.byId('centerpopup');

    el.innerHTML = '<form method="POST" id="vcsauth">'
            + '<table><tbody>'
            + '<tr><th colspan=2>Add Project from Source Control</th></tr>'
            + '<tr><td>Keychain password:</td><td>'
            + '<input type="password" name="kcpass" id="kcpass"></td></tr>'
            + '<tr><td>URL:</td>'
            + '<td><input type="text" name="source" value="' + url + '" style="width: 85%"></td></tr>'
            + '<tr><td>Project name:</td>'
            + '<td><input type="text" name="dest" value=""> (defaults to last part of URL path)</td></tr>'
            + '<tr><td>Authentication:</td><td><select name="remoteauth" id="remoteauth">'
            + '<option value="">None (read-only access to the remote repo)</option>'
            + '<option value="write">Only for writing</option>'
            + '<option value="both">For reading and writing</option>'
            + '</select></td></tr>'
            + '<tr id="push_row" style="display:none" class="authfields"><td>Push to URL</td>'
            + '<td><input type="text" name="push" style="width: 85%" value="' + url + '"></td></tr>'
            + '<tr id="authtype_row" style="display:none" class="authfields"><td>Authentication type</td>'
            + '<td><select name="authtype" id="authtype">'
            + '<option value="ssh">SSH</option>'
            + '<option value="password">Username/Password</option>'
            + '</select></td></tr>'
            + '<tr id="username_row" style="display:none" class="authfields"><td>Username</td>'
            + '<td><input type="text" name="username">'
            + '</td></tr>'
            + '<tr id="password_row" style="display:none" class="authfields userfields"><td>Password</td><td>'
            + '<input type="password" name="password">'
            + '</td></tr><tr><td>&nbsp;</td><td>'
            + '<input type="submit" id="vcsauthsubmit" value="Clone">'
            + '<input type="button" id="vcsauthcancel" value="Cancel">'
            + '</td></tr></tbody></table></form>';

    dojo.style("vcsauth", {
        background: "white",
        '-moz-border-radius': "5px",
        padding: "5px"
    });

    dojo.connect(dojo.byId("remoteauth"), "onchange", function() {
        var newval = dojo.byId("remoteauth").value;
        if (newval == "") {
            dojo.query("tr.authfields").style("display", "none");
        } else {
            dojo.query("tr.authfields").style("display", "table-row");
            if (dojo.byId("authtype").value == "ssh") {
                dojo.query("tr.userfields").style("display", "none");
            }
        }
    });

    dojo.connect(dojo.byId("authtype"), "onchange", function() {
        var newval = dojo.byId("authtype").value;
        if (newval == "ssh") {
            dojo.query("tr.userfields").style("display", "none");
        } else {
            dojo.query("tr.userfields").style("display", "table-row");
        }
    });

    dojo.connect(dojo.byId("vcsauthcancel"), "onclick", bespin.vcs.createCancelHandler());

    dojo.connect(dojo.byId("vcsauthsubmit"), "onclick", commandLine.link(function(e) {
        dojo.stopEvent(e);
        bespin.util.webpieces.hideCenterPopup(el);
        var data = dojo.formToObject("vcsauth");
        // prune out unnecessary values
        if (data.remoteauth == "") {
            delete data.push;
            delete data.authtype;
            delete data.username;
            delete data.password;
        } else {
            if (data.authtype == "ssh") {
                delete data.password;
            }
        }
        data = dojo.objectToQuery(data);
        bespin.get('server').clone(data, bespin.vcs.createStandardHandler());
    }));

    bespin.util.webpieces.showCenterPopup(el, true);
    dojo.byId("kcpass").focus();
};

bespin.vcs.setProjectPassword = function(project) {
    var el = dojo.byId('centerpopup');

    el.innerHTML = '<form method="POST" id="vcsauth">'
            + '<table><tbody><tr><td>Keychain password</td><td>'
            + '<input type="password" name="kcpass"></td></tr>'
            + '<tr><td>Username</td><td><input type="text" name="username">'
            + '</td></tr><tr><td>Password</td><td>'
            + '<input type="password" name="password">'
            + '</td></tr><tr><td>&nbsp;</td><td>'
            + '<input type="hidden" name="type" value="password">'
            + '<input type="button" id="vcsauthsubmit" value="Save">'
            + '<input type="button" id="vcsauthcancel" value="Cancel">'
            + '</td></tr></tbody></table></form>';

    dojo.connect(dojo.byId("vcsauthcancel"), "onclick", bespin.vcs.createCancelHandler());

    dojo.connect(dojo.byId("vcsauthsubmit"), "onclick", function() {
        bespin.util.webpieces.hideCenterPopup(el);
        bespin.get("server").setauth(project, "vcsauth",
            {
                onSuccess: function() {
                    bespin.publish("message:output", {msg: "Password saved for " + project});
                },
                onFailure: function(xhr) {
                    bespin.publish("message:error", {msg: "Password save failed: " + xhr.responseText});
                }
            });
    });

    bespin.util.webpieces.showCenterPopup(el, true);
};

// ** {{{ getKeychainPassword }}}
// Presents the user with a dialog requesting their keychain
// password. If they click the submit button, the password
// is sent to the callback. If they do not, the callback
// is not called.
bespin.vcs.getKeychainPassword = function(callback) {
    var el = dojo.byId('centerpopup');

    el.innerHTML = '<form id="vcsauth">'
            + '<table><tbody><tr><td>Keychain password</td><td>'
            + '<input type="password" id="kcpass">'
            + '</td></tr><tr><td>&nbsp;</td><td>'
            + '<input type="button" id="vcsauthsubmit" value="Submit">'
            + '<input type="button" id="vcsauthcancel" value="Cancel">'
            + '</td></tr></tbody></table></form>';

    dojo.connect(dojo.byId("vcsauthcancel"), "onclick", bespin.vcs.createCancelHandler());

    function saveform() {
        bespin.util.webpieces.hideCenterPopup(el);
        var kcpass = dojo.byId("kcpass").value;
        el.innerHTML = "";
        callback(kcpass);
        return false;
    };

    dojo.connect(dojo.byId("vcsauthsubmit"), "onclick", saveform);
    dojo.connect(dojo.byId("vcsauth"), "onsubmit", saveform);

    bespin.util.webpieces.showCenterPopup(el, true);
    dojo.byId("kcpass").focus();
};

// = Commands =
// Version Control System-related commands

// ** {{{{Command: clone}}}} **
bespin.vcs.commands.addCommand({
    name: 'clone',
    takes: ['url'],
    aliases: ['checkout'],
    preview: 'checkout or clone the project into a new Bespin project',
    // ** {{{execute}}} **
    execute: function(commandline, url) {
        bespin.vcs.clone(url || "");
    }
});


// ** {{{Command: push}}} **
bespin.vcs.commands.addCommand({
    name: 'push',
    preview: 'push to the remote repository',
    // ** {{{execute}}} **
    execute: function(commandline, args) {
        var project;

        bespin.withComponent('editSession', function(editSession) {
            project = editSession.project;
        });

        if (!project) {
            commandline.addErrorOutput("You need to pass in a project");
            return;
        }

        bespin.vcs.getKeychainPassword(function(kcpass) {
            bespin.get('server').vcs(project,
                                    {command: ['push', '_BESPIN_PUSH'],
                                    kcpass: kcpass},
                                    bespin.vcs.createStandardHandler());
        });
    }
});

// ** {{{Command: diff}}} **
bespin.vcs.commands.addCommand({
    name: 'diff',
    preview: 'Display the differences in the checkout out files',
    takes: ['*'],
    completeText: 'Use the current file, add -a for all files or add filenames',
    description: 'Without any options, the vcs diff command will diff the currently selected file against the repository copy. If you pass in -a, the command will diff <em>all</em> files. Finally, you can list files to diff individually.',
    // ** {{{execute}}} **
    execute: function(commandline, args) {
        bespin.vcs._performVCSCommandWithFiles("diff", commandline, args);
    }
});

// ** {{{Command: remove}}} **
bespin.vcs.commands.addCommand({
    name: 'remove',
    preview: 'Remove a file from version control (also deletes it)',
    takes: ['*'],
    description: 'The files presented will be deleted and removed from version control.',
    // ** {{{execute}}} **
    execute: function(commandline, args) {
        bespin.vcs._performVCSCommandWithFiles("remove", commandline, args,
            {acceptAll: false});
    }
});

// ** {{{Command: status}}} **
bespin.vcs.commands.addCommand({
    name: 'status',
    preview: 'Display the status of the repository files.',
    description: 'Shows the current state of the files in the repository<br>M for modified, ? for unknown (you may need to add), R for removed, ! for files that are deleted but not removed',
    // ** {{{execute}}} **
    execute: function(commandline, args) {
        var project;

        bespin.withComponent('editSession', function(editSession) {
            project = editSession.project;
        });

        if (!project) {
            commandline.addErrorOutput("You need to pass in a project");
            return;
        }

        bespin.get('server').vcs(project,
                                {command: ['status']},
                                bespin.vcs.createStandardHandler());
    }
});

// ** {{{Command: diff}}} **
bespin.vcs.commands.addCommand({
    name: 'resolved',
    takes: ['*'],
    preview: 'Mark files as resolved',
    completeText: 'Use the current file, add -a for all files or add filenames',
    description: 'Without any options, the vcs resolved command will mark the currently selected file as resolved. If you pass in -a, the command will resolve <em>all</em> files. Finally, you can list files individually.',
    // ** {{{execute}}} **
    execute: function(commandline, args) {
        bespin.vcs._performVCSCommandWithFiles("resolved", commandline, args);
    }
});


// ** {{{Command: update}}} **
bespin.vcs.commands.addCommand({
    name: 'update',
    preview: 'Update your working copy from the remote repository',
    // ** {{{execute}}} **
    execute: function(commandline) {
        var project;

        bespin.withComponent('editSession', function(editSession) {
            project = editSession.project;
        });

        if (!project) {
            commandline.addErrorOutput("You need to pass in a project");
            return;
        }

        var sendRequest = function(kcpass) {
            var command = {
                command: ['update', '_BESPIN_REMOTE_URL']
            };

            if (kcpass !== undefined) {
                command.kcpass = kcpass;
            }

            bespin.get('server').vcs(project,
                                    command,
                                    bespin.vcs.createStandardHandler());
        };

        bespin.vcs.getRemoteauth(project, function(remoteauth) {
            console.log("remote auth is: " + remoteauth);
            if (remoteauth == "both") {
                bespin.vcs.getKeychainPassword(sendRequest);
            } else {
                sendRequest(undefined);
            }
        });

    }
});

bespin.vcs._performVCSCommandWithFiles = function(vcsCommand, commandline, args,
            options) {
    options = options || {
        acceptAll: true
    };
    var project;
    var path;

    bespin.withComponent('editSession', function(editSession) {
        project = editSession.project;
        path = editSession.path;
    });

    if (!project) {
        commandline.addErrorOutput("You need to pass in a project");
        return;
    }

    if (args.varargs.length == 0) {
        if (!path) {
            var dasha = "";
            if (options.acceptAll) {
                dasha = ", or use -a for all files.";
            }
            commandline.addErrorOutput("You must select a file to " + vcsCommand + dasha);
            return;
        }
        var command = [vcsCommand, path];
    } else if (args.varargs[0] == "-a" && options.acceptAll) {
        var command = [vcsCommand];
    } else {
        var command = [vcsCommand];
        command.concat(args.varargs);
    }
    bespin.get('server').vcs(project,
                            {command: command},
                            bespin.vcs.createStandardHandler());
};

// ** {{{Command: add}}} **
bespin.vcs.commands.addCommand({
    name: 'add',
    preview: 'Adds missing files to the project',
    takes: ['*'],
    completeText: 'Use the current file, add -a for all files or add filenames',
    description: 'Without any options, the vcs add command will add the currently selected file. If you pass in -a, the command will add <em>all</em> files. Finally, you can list files individually.',
    // ** {{{execute}}} **
    execute: function(commandline, args) {
        bespin.vcs._performVCSCommandWithFiles("add", commandline, args);
    }
});

// ** {{{Command: commit}}} **
bespin.vcs.commands.addCommand({
    name: 'commit',
    takes: ['message'],
    preview: 'Commit to the repository',
    // ** {{{execute}}} **
    execute: function(commandline, message) {
        if (!message) {
            commandline.addErrorOutput("You must enter a log message");
            return;
        }
        var project;

        bespin.withComponent('editSession', function(editSession) {
            project = editSession.project;
        });

        if (!project) {
            commandline.addErrorOutput("You need to pass in a project");
            return;
        }
        bespin.get('server').vcs(project,
                                {command: ['commit', '-m', message]},
                                bespin.vcs.createStandardHandler());
    }
});

bespin.vcs._displaySSHKey = function(response) {
    bespin.util.webpieces.showContentOverlay(
        '<h2>Your Bespin SSH public key</h2><input type="text" value="'
        + response + '" id="sshkey" style="width: 95%">'
    );
    dojo.byId("sshkey").select();
};

// Retrieve the user's SSH public key using their keychain password.
// This is required if they have not already set up a public key.
bespin.vcs._getSSHKeyAuthenticated = function(commandline) {
    bespin.vcs.getKeychainPassword(function(kcpass) {
        bespin.get('server').getkey(kcpass, {
            onSuccess: bespin.vcs._displaySSHKey,
            on401: function(response) {
                commandline.addErrorOutput("Bad keychain password.");
            },
            onFailure: function(response) {
                commandline.addErrorOutput("getkey failed: " + response);
            }
        });
    });
};

bespin.vcs.commands.addCommand({
    name: 'getkey',
    preview: 'Get your SSH public key that Bespin can use for remote repository authentication. This will prompt for your keychain password.',
    execute: function(commandline) {
        bespin.get('server').getkey(null, {
            onSuccess: bespin.vcs._displaySSHKey,
            on401: bespin.vcs._getSSHKeyAuthenticated(commandline),
            onFailure: function(response) {
                commandline.addErrorOutput("getkey failed: " + response);
            }
        });
    }
});

// ** {{{Command: help}}} **
bespin.vcs.commands.addCommand({
    name: 'help',
    takes: ['search'],
    preview: 'show commands for vcs subcommand',
    description: 'The <u>help</u> gives you access to the various commands in the vcs subcommand space.<br/><br/>You can narrow the search of a command by adding an optional search params.<br/><br/>Finally, pass in the full name of a command and you can get the full description, which you just did to see this!',
    completeText: 'optionally, narrow down the search',
    execute: function(commandline, extra) {
        bespin.cmd.displayHelp(bespin.vcs.commands, commandline, extra);
    }
});

// Command store for the Mercurial commands
// (which are subcommands of the main 'hg' command)
bespin.vcs.hgCommands = new bespin.cmd.commandline.CommandStore({ subCommand: {
    name: 'hg',
    preview: 'run a Mercurial command',
    subcommanddefault: 'help'
}});

// ** {{{Command: help}}} **
bespin.vcs.hgCommands.addCommand({
    name: 'help',
    takes: ['search'],
    preview: 'show commands for hg subcommand',
    description: 'The <u>help</u> gives you access to the various commands in the hg subcommand space.<br/><br/>You can narrow the search of a command by adding an optional search params.<br/><br/>Finally, pass in the full name of a command and you can get the full description, which you just did to see this!',
    completeText: 'optionally, narrow down the search',
    execute: function(commandline, extra) {
        bespin.cmd.displayHelp(bespin.vcs.hgCommands, commandline, extra);
    }
});

// ** {{{Command: init}}} **
bespin.vcs.hgCommands.addCommand({
    name: 'init',
    preview: 'initialize a new hg repository',
    description: 'This will create a new repository in this project.',
    execute: function(commandline) {
        var project;

        bespin.withComponent('editSession', function(editSession) {
            project = editSession.project;
        });

        if (!project) {
            commandline.addErrorOutput("You need to pass in a project");
            return;
        }
        bespin.get('server').vcs(project,
                                {command: ['hg', 'init']},
                                bespin.vcs.createStandardHandler());
    }
});

// == Extension to {{{ bespin.client.Server }}} ==
dojo.extend(bespin.client.Server, {
    // ** {{{ remoteauth() }}}
    // Finds out if the given project requires remote authentication
    // the values returned are "", "both" (for read and write), "write"
    // when only writes require authentication
    // the result is published as an object with project, remoteauth
    // values to vcs:remoteauthUpdate and sent to the callback.
    remoteauth: function(project, callback) {
        var url = '/vcs/remoteauth/' + escape(project) + '/';
        this.request('GET', url, null, {
            onSuccess: function(result) {
                var event = {
                    project: project,
                    remoteauth: result
                };
                bespin.publish("vcs:remoteauthUpdate", event);
                callback(result);
            }
        });
    },

    // ** {{{ vcs() }}}
    // Run a Version Control System (VCS) command
    // The command object should have a command attribute
    // on it that is a list of the arguments.
    // Commands that require authentication should also
    // have kcpass, which is a string containing the user's
    // keychain password.
    vcs: function(project, command, opts) {
        var url = '/vcs/command/' + project + '/';
        this.requestDisconnected('POST', url, dojo.toJson(command), opts);
    },

    // ** {{{ setauth() }}}
    // Sets authentication for a project
    setauth: function(project, form, opts) {
        this.request('POST', '/vcs/setauth/' + project + '/',
                    dojo.formToQuery(form), opts || {});
    },

    // ** {{{ getkey() }}}
    // Retrieves the user's SSH public key that can be used for VCS functions
    getkey: function(kcpass, opts) {
        if (kcpass == null) {
            this.request('POST', '/vcs/getkey/', null, opts || {});
        } else {
            this.request('POST', '/vcs/getkey/', "kcpass=" + escape(kcpass), opts || {});
        }
    },

    // ** {{{ clone() }}}
    // Clone a remote repository
    clone: function(data, opts) {
        this.requestDisconnected('POST', '/vcs/clone/', data, opts);
    }
});

// ** {{{ Event: bespin:vcs:response }}} **
// Handle a response from a version control system command
bespin.subscribe("vcs:response", function(event) {
    var output = event.output;

    // if the output is all whitespace, we should display something
    // nicer
    if (/^\s*$/.exec(output)) {
        output = "(Successful command with no visible output)";
    }

    bespin.util.webpieces.showContentOverlay("<h2>vcs "
                    + event.command
                    + " output</h2><pre>"
                    + output
                    + "</pre>");

    if (event.command) {
        var command = event.command;
        if (command == "clone") {
            bespin.publish("project:create", { project: event.project });
        }
    }
});

// ** {{{ Event: bespin:vcs:error }}} **
// Handle a negative response from a version control system command
bespin.subscribe("vcs:error", function(event) {
    bespin.get("commandLine").addErrorOutput(event.output);
});

}

if(!dojo._hasResource["bespin.jetpack"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.jetpack"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

/*
 * Jetpack Plugin
 * --------------
 *
 * The Jetpack plugin aims to make Bespin a good environment for creating and hosting Jetpack extensions.
 *
 * Read more about Jetpack at: https://wiki.mozilla.org/Labs/Jetpack/API
 */

dojo.provide("bespin.jetpack");





bespin.jetpack.projectName = "jetpacks";

// Command store for the Jetpack commands
// (which are subcommands of the main 'jetpack' command)
bespin.jetpack.commands = new bespin.cmd.commandline.CommandStore({ subCommand: {
    name: 'jetpack',
    preview: 'play with jetpack features',
    completeText: 'jetpack subcommands:<br><br> create [name] [type]<br> install [name]<br> list<br> edit [name]',
    subcommanddefault: 'help'
}});

// = Commands =
// Jetpack related commands

// ** {{{Command: jetpack help}}} **
bespin.jetpack.commands.addCommand({
    name: 'help',
    takes: ['search'],
    preview: 'show commands for jetpack subcommand',
    description: 'The <u>help</u> gives you access to the various commands in the Bespin system.<br/><br/>You can narrow the search of a command by adding an optional search params.<br/><br/>Finally, pass in the full name of a command and you can get the full description, which you just did to see this!',
    completeText: 'optionally, narrow down the search',
    execute: function(commandline, extra) {
        bespin.cmd.displayHelp(bespin.jetpack.commands, commandline, extra, "<br><br>For more info and help on the available API, <a href='https://wiki.mozilla.org/Labs/Jetpack/API'>check out the Reference</a>");
    }
});

// ** {{{Command: jetpack create}}} **
bespin.jetpack.commands.addCommand({
    name: 'create',
    takes: ['feature', 'type'],
    preview: 'create a new jetpack feature of the given type (defaults to sidebar)',
    description: 'Create a new jetpack feature that you can install into Firefox with the new Jetpack goodness.',
    completeText: 'name of your feature, type of JetPack template (sidebar, content, toolbar)',
    execute: function(commandline, opts) {
        var feature = opts.feature || 'newjetpack';
        var type = opts.type || 'sidebar';
        var project = bespin.jetpack.projectName;
        var filename = feature + ".js";

        var templateOptions = {
            stdtemplate: "jetpacks/" + type + ".js",
            values: {
                templateName: feature
            }
        };

        bespin.get("server").fileTemplate(project,
            filename,
            templateOptions,
            {
                onSuccess: function(xhr) {
                    bespin.publish("editor:openfile", {
                        project: project,
                        filename: filename
                    });
                },
                onFailure: function(xhr) {
                    commandline.addErrorOutput("Unable to create " + filename + ": " + xhr.responseText);
                }
            }
        );

    }
});

// ** {{{Command: jetpack install}}} **
bespin.jetpack.commands.addCommand({
    name: 'install',
    takes: ['feature'],
    preview: 'install a jetpack feature',
    description: 'Install a Jetpack feature, either the current file, or the named feature',
    completeText: 'optionally, the name of the feature to install',
    execute: function(commandline, feature) {
        // For when Aza exposes the Jetpack object :)
        // if (!window['Jetpack']) {
        //     bespin.publish("message:error", { msg: "To install a Jetpack, you need to have installed the extension.<br><br>For now this lives in Firefox only, and you can <a href='https://wiki.mozilla.org/Labs/Jetpack/API'>check it out, and download the add-on here</a>." });
        //     return;
        // }

        // Use the given name, or default to the current jetpack
        feature = feature || (function() {
            var editSession = bespin.get('editSession');
            if (editSession.project != bespin.jetpack.projectName) return; // jump out if not in the jetpack project
            var bits = editSession.path.split('.');
            return bits[bits.length - 2];
        })();

        if (!feature) {
            bespin.publish("message:error", { msg: "Please pass in the name of the Jetpack feature you would like to install" });
        } else {
            bespin.jetpack.install(feature);
        }
    }
});

// ** {{{Command: jetpack list}}} **
bespin.jetpack.commands.addCommand({
    name: 'list',
    preview: 'list out the Jetpacks that you have written',
    description: 'Which Jetpacks have you written and have available in BespinSettings/jetpacks. NOTE: This is not the same as which Jetpacks you have installed in Firefox!',
    execute: function(commandline, extra) {
        bespin.get('server').list(bespin.jetpack.projectName, '', function(jetpacks) {
            var output;

            if (!jetpacks || jetpacks.length < 1) {
                output = "You haven't installed any Jetpacks. Run '> jetpack create' to get going.";
            } else {
                output = "<u>Your Jetpack Features</u><br/><br/>";

                output += dojo.map(dojo.filter(jetpacks, function(file) {
                    return bespin.util.endsWith(file.name, '\\.js');
                }), function(c) {
                    return "<a href=\"javascript:bespin.get('commandLine').executeCommand('open " + c.name + " " + bespin.jetpack.projectName + "');\">" + c.name.replace(/\.js$/, '') + "</a>";
                }).join("<br>");
            }

            bespin.publish("message:output", { msg: output });
        });
    }
});

// ** {{{Command: jetpack edit}}} **
bespin.jetpack.commands.addCommand({
    name: 'edit',
    takes: ['feature'],
    preview: 'edit the given Jetpack feature',
    completeText: 'feature name to edit (required)',
    usage: '[feature]: feature name required.',
    execute: function(commandline, feature) {
        if (!feature) {
            commandline.showUsage(this);
            return;
        }

        var path = feature + '.js';

        bespin.get('files').whenFileExists(bespin.jetpack.projectName, path, {
            execute: function() {
                bespin.publish("editor:openfile", {
                    project: bespin.jetpack.projectName,
                    filename: path
                });
            },
            elseFailed: function() {
                bespin.publish("message:error", {
                    msg: "No feature called " + feature + ".<br><br><em>Run 'jetpack list' to see what is available.</em>"
                });
            }
        });
    }
});

/*
 * Jetpack Settings
 *
 * If you "set jetpack on", wire up the toolbar to have the jetpack icon
 */

// ** {{{ Event: settings:set:jetpack }}} **
//
// Turn off the toolbar icon if set to off
bespin.subscribe("settings:set:jetpack", function(event) {
    var newset = bespin.get("settings").isOff(event.value);
    var jptb = dojo.byId('toolbar_jetpack');

    if (newset) { // turn it off
        if (jptb) jptb.style.display = 'none';
    } else { // turn it on
        if (jptb) {
            jptb.style.display = 'inline';
        } else {
            // <img id="toolbar_jetpack" src="images/icn_jetpack.png" alt="Jetpack" style="padding-left: 10px;" title="Jetpack (show or hide menu)">
            dojo.byId('toolbar').appendChild(dojo.create("img", {
               id: "toolbar_jetpack",
               src: "images/icn_jetpack.png",
               alt: "Jetpack",
               style: "padding-left: 10px",
               title: "Jetpack (show or hide menu)"
            }));

            // wire up the toolbar fun
            bespin.get("toolbar").setup("jetpack", "toolbar_jetpack");
        }
    }
});

// Toolbar
// Add the jetpack toolbar

bespin.subscribe("toolbar:init", function(event) {
    event.toolbar.addComponent('jetpack', function(toolbar, el) {
        var jetpack = dojo.byId(el) || dojo.byId("toolbar_jetpack");

        var highlightOn = function() {
            jetpack.src = "images/icn_jetpack_on.png";
        }

        var highlightOff = function() {
            jetpack.src = "images/icn_jetpack.png";
        }

        dojo.connect(jetpack, 'mouseover', highlightOn);
        dojo.connect(jetpack, 'mouseout',  function() {
            var dropdown = dojo.byId('jetpack_dropdown');
            if (!dropdown || dropdown.style.display == 'none') highlightOff();
        });

        // Change the font size between the small, medium, and large settings
        dojo.connect(jetpack, 'click', function() {
            var dropdown = dojo.byId('jetpack_dropdown');

            if (!dropdown || dropdown.style.display == 'none') { // no dropdown or hidden, so show
                highlightOn();

                dropdown = dropdown || (function() {
                    var dd = dojo.create("div", {
                        id: 'jetpack_dropdown',
                    });

                    var editor_coords = dojo.coords('editor');
                    var jetpack_coorders = dojo.coords(jetpack);
                    dojo.style(dd, {
                        position: 'absolute',
                        padding: '0px',
                        top: editor_coords.y + 'px',
                        left: (jetpack_coorders.x - 30) + 'px',
                        display: 'none',
                        zIndex: '150'
                    })

                    dd.innerHTML = '<table id="jetpack_dropdown_content"><tr><th colspan="3">Jetpack Actions</th></tr><tr><td>create</td><td><input type="text" size="7" id="jetpack_dropdown_input_create" value="myjetpack" onfocus="bespin.get(\'editor\').setFocus(false);"></td><td><input id="jetpack_dropdown_now_create" type="button" value="now &raquo;"></td></tr><tr id="jetpack_dropdown_or"><td colspan="3" align="center">or</td></tr><tr><td>install</td><td><select id="jetpack_dropdown_input_install"><option></option></select></td><td><input id="jetpack_dropdown_now_install" type="button" value="now &raquo;"></td></tr></table><div id="jetpack_dropdown_border">&nbsp;</div>';

                    document.body.appendChild(dd);

                    // render out of view to get the size info and then hide again
                    bespin.jetpack.sizeDropDownBorder(dd);

                    var cl = bespin.get("commandLine");
                    // create a new jetpack
                    dojo.connect(dojo.byId('jetpack_dropdown_now_create'), 'click', function() {
                        cl.executeCommand('jetpack create ' + dojo.byId('jetpack_dropdown_input_create').value);
                        dropdown.style.display = 'none';
                    });

                    // install a jetpack
                    dojo.connect(dojo.byId('jetpack_dropdown_now_install'), 'click', function() {
                        cl.executeCommand('jetpack install ' + dojo.byId('jetpack_dropdown_input_install').value);
                        dropdown.style.display = 'none';
                    });

                    return dd;
                })();

                dropdown.style.display = 'block';

                bespin.jetpack.loadInstallScripts();
            } else { // hide away
                highlightOff();

                dropdown.style.display = 'none';
            }
        });
    });
});

bespin.jetpack.install = function(feature) {
    // add the link tag to the body
    // <link rel="jetpack" href="path/feature.js">
    var link = dojo.create("link", {
        rel: 'jetpack',
        href: bespin.util.path.combine("preview/at", bespin.jetpack.projectName, feature + ".js"),
        name: feature
    }, dojo.body());

    // Use the custom event to install
    // var event = document.createEvent("Events");
    // var element = dojo.byId("jetpackInstallEvent");
    //
    // // create a jetpack event element if it doesn't exist.
    // if (!element) {
    //     element = dojo.create("div", {
    //        id: "jetpackEvent",
    //     }, dojo.body());
    //     element.setAttribute("hidden", true);
    // }
    //
    // // set the code string to the "mozjpcode" attribute.
    // element.setAttribute("mozjpcode", bespin.get("editor").model.getDocument());
    //
    // // init and dispatch the event.
    // event.initEvent("mozjpinstall", true, false);
    // element.dispatchEvent(event);
}

bespin.jetpack.sizeDropDownBorder = function(dd) {
    var keephidden = false;
    if (dd) {
        keephidden = true;
    } else {
        dd = dojo.byId('jetpack_dropdown');
    }

    if (keephidden) {
        dd.style.right = '-50000px';
        dd.style.display = 'block';
    }

    var content_coords = dojo.coords('jetpack_dropdown_content');

    if (keephidden) {
        dd.style.right = '';
        dd.style.display = 'none';
    }

    dojo.style('jetpack_dropdown_border', {
        width: content_coords.w + 'px',
        height: content_coords.h + 'px'
    });
}

bespin.jetpack.loadInstallScripts = function() {
    bespin.get('server').list(bespin.jetpack.projectName, '', function(jetpacks) {
        var output;

        if (jetpacks && jetpacks.length > 0) {
            output += dojo.map(dojo.filter(jetpacks, function(file) {
                return bespin.util.endsWith(file.name, '\\.js');
            }), function(c) {
                return "<option>" + c.name.replace(/\.js$/, '') + "</option>";
            }).join("");
        }

        dojo.byId("jetpack_dropdown_input_install").innerHTML = output;
        bespin.jetpack.sizeDropDownBorder();
    });
}

}

if(!dojo._hasResource["bespin.cmd.editorcommands"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.cmd.editorcommands"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */
 
dojo.provide("bespin.cmd.editorcommands");




// = Editor Commands =
//
// This array stores all of the editor commands. 

(function() {
    var keys = []; 
    for (var i in bespin.cmd.commands.store){
        keys.push(i);
    }  
    bespin.cmd.editorcommands.Commands = keys;  
})();

}

if(!dojo._hasResource["th.helpers"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["th.helpers"] = true;
//  ***** BEGIN LICENSE BLOCK *****
// Version: MPL 1.1
// 
// The contents of this file are subject to the Mozilla Public License  
// Version
// 1.1 (the "License"); you may not use this file except in compliance  
// with
// the License. You may obtain a copy of the License at
// http://www.mozilla.org/MPL/
// 
// Software distributed under the License is distributed on an "AS IS"  
// basis,
// WITHOUT WARRANTY OF ANY KIND, either express or implied. See the  
// License
// for the specific language governing rights and limitations under the
// License.
// 
// The Original Code is Bespin.
// 
// The Initial Developer of the Original Code is Mozilla.
// Portions created by the Initial Developer are Copyright (C) 2009
// the Initial Developer. All Rights Reserved.
// 
// Contributor(s):
// 
// ***** END LICENSE BLOCK *****
//  

dojo.provide("th.helpers");

dojo.mixin(th.helpers, {
    isPercentage: function(str){  // TODO: make more robust 
        return (str.indexOf && str.indexOf("%") != -1);
    },

    isCssPixel: function(str) {
        str = dojo.trim(str).toLowerCase();
        return (str.indexOf("px") == str.length - 2);
    }
});

dojo.declare("th.helpers.EventHelpers", null, { 
    // only works on a Scene at the moment as it uses  
    wrapEvent: function(e, root) {
        // compute the canvas-local coordinates
        var coords = dojo.coords(this.canvas, true);
        var x = e.clientX - coords.x;
        var y = e.clientY - coords.y;
        
        var component = root.getComponentForPosition(x, y, true);
        e.thComponent = component;

        this.addComponentXY(e, root, component);
    },
    
    // changes clientX and clientY from space of source to space of dest; no change wraught if dest incompatible with source
    addComponentXY: function(e, source, dest) {
        if (!dest.bounds) {
            console.log("No dest bounds - " + dest.declaredClass);
            console.log(dest.bounds);
            console.log(dest);
            return;
        }

        // compute the canvas-local coordinates
        var coords = dojo.coords(this.canvas, true);
        var x = e.clientX - coords.x;
        var y = e.clientY - coords.y;
   
        var nxy = { x: x, y: y };

        var c = dest;
        while (c) {
            nxy.x -= c.bounds.x;
            nxy.y -= c.bounds.y;
            c = c.parent;

            if (c == source) {
                e.componentX = nxy.x;
                e.componentY = nxy.y;
                return;
            }
        }
    }
}); 
  
dojo.declare("th.helpers.ComponentHelpers", null, {  	
    // returns hash with some handy short-cuts for painting
    d: function() {  
        return {
           b: (this.bounds) ? { x: this.bounds.x, y: this.bounds.y, w: this.bounds.width, h: this.bounds.height,
                                iw: this.bounds.width - this.getInsets().left - this.getInsets().right,
                                ih: this.bounds.height - this.getInsets().top - this.getInsets().bottom } : {},
           i: { l: this.getInsets().left, r: this.getInsets().right, t: this.getInsets().top, b: this.getInsets().bottom,
                w: this.getInsets().left + this.getInsets().right, h: this.getInsets().top + this.getInsets().bottom }
        }
    },

    shouldPaint: function() {
        return (this.shouldLayout() && this.style.visibility != "hidden");
    },

    shouldLayout: function() {
        return (this.style.display != "none");
    },

    emptyInsets: function() {
        return { left: 0, right: 0, bottom: 0, top: 0 };
    },

    resolveCss: function() {
        // right now, all components tie into the global resources bucket; this is fine for now but may need to be loaded from the scene
        var resources = th.global_resources;

        // build a map of declarations
        var declarations = {};

        // process the user agent styles first
        var propertyName;
        var sheetTypes = [ "userAgentCss", "userCss", "authorCss" ];
        for (var i = 0; i < sheetTypes.length; i++) {
            // css splits sheets into user agent, user, and author categories, each of which has different priority
            // we'll implement this by having the same code take three passes, dynamically grabbing the appropriate CSS array
            // from the Resources.
            //
            // this will have to change if we support !important as the user gets a final crack at overridding author sheets
            var currentSheet = sheetTypes[i];
            dojo.forEach(resources[currentSheet], function(css) {
                for (var selector in css) {
                    // a selector may be compound (e.g., foo, bar, car {}) so we split it out by comma to treat each piece of
                    // the selector independently
                    var selectorPieces = selector.split(",");
                    for (var s = 0; s < selectorPieces.length; s++) {
                        var selectorPiece = dojo.trim(selectorPieces[s]);

                        // if this selector selects this component, let's add the rules to the declarations bucket
                        if (this.matchesSelector(selectorPiece)) {
                            var properties = css[selector];

                            for (propertyName in properties) {
                                declarations[propertyName] = properties[propertyName];
                            }
                        }
                    }
                }
            }, this);
        }

        this.styles = declarations;
    },

    // only id and class selectors are supported at the moment. it is assumed the passed in value has already been trimmed.
    matchesSelector: function(selector) {
        var s = selector.toLowerCase();

        // universal selector
        if (s == "*") return true;

        // class selector
        if (s.indexOf(".") == 0) {
            if (!this.className) return false;
            if (this.className.toLowerCase() == s.substring(1)) return true;
        }

        // id selector
        if (s.indexOf("#") == 0) {
            if (!this.id) return false;
            return ("#" + this.id) == s;
        }

        // type selector
        var classPieces = this.declaredClass.split(".");
        var clazz = classPieces[classPieces.length - 1].toLowerCase();
        if (clazz == s) return true;

        // type selector / id hybrid
        if (this.id && (s == (clazz + "#" + this.id))) return true;

        // type selector / class hybrid
        if (this.className && (s == (clazz + "." + this.className.toLowerCase()))) return true;

        // simple child selector support, must be "SEL1 > SEL2"
        if (s.indexOf(">") != -1) {
            var ss = s.split(">");

            if (ss.length != 2) {
                console.log("unsupported child selector syntax; must be SEL1 > SEL2, was '" + selector + "'");
                return false;
            }

            if (this.matchesSelector(dojo.trim(ss[1]))) {
                if (!this.parent) return false;
                return (this.parent.matchesSelector(dojo.trim(ss[0])));
            }

            return false;
        }

        // simple ancestor selector support, must be "SEL1 SEL2"
        if (s.indexOf(" ") != -1) {
            var ss = s.split(" ");

            if (ss.length != 2) {
                console.log("unsupported ancestor selector syntax; must be SEL1 SEL2, was '" + selector + "'");
                return false;
            }

            if (this.matchesSelector(ss[1].trim())) {
                var ancestor = this.parent;
                while (ancestor) {
                    if (ancestor.matchesSelector(ss[0].trim())) return true;
                    ancestor = ancestor.parent;
                }

                return false;
            }
        }

        return false;
    },

    // returns the "specificity" index of the selector. -1 means the first is less specific; 0 means they are equal, 1 means the first
    // is more specific
    getSpecificityIndex: function(selector, otherSelector) {
        if (selector == otherSelector) return 0;

        // if one of them is an id match, they win
        if (selector.indexOf("#") == 0) return 1;
        if (otherSelector.indexOf("#") == 0) return -1;

        // for now, we only match on id and type, so 0 is the only option left
        return 0;
    },

    // paints the background of the component using the optionally passed coordinates using CSS properties; if no coordinates are
    // passed, will default to painting the background on the entire component, which is generally the default and expected behavior
    paintBackground: function(ctx, x, y, w, h) {
        if (!x) x = 0;
        if (!y) y = 0;
        if (!w) w = this.bounds.width;
        if (!h) h = this.bounds.height;

        if (this.styles["background-color"]) {
            ctx.fillStyle = this.styles["background-color"];
            ctx.fillRect(x, y, w, h);
        }

        if (this.styles["background-image"]) {
            var img = this.styles["background-image"];
            this.paintImage(ctx, img, this.styles["background-repeat"], this.styles["background-position"], x, y, w, h);
        }
    },

    // paints the image on the ctx using the optional repeat, position, x, y, w, h values, any of which may be undefined
    paintImage: function(ctx, img, repeat, position, x, y, w, h) {
        if (!repeat) repeat = "repeat";
        if (!position) position = "0% 0%";

        if (!x) x = 0;
        if (!y) y = 0;
        if (!w) w = this.bounds.width;
        if (!h) h = this.bounds.height;

        ctx.save();
        try {
            if ((x != 0) || (y != 0)) ctx.translate(x, y);

            // convert the position string into two different numbers
            var pos = position.toLowerCase().split(" ");
            if (pos.length == 1) pos.push("50%");
            if (pos.length != 2) {
                console.log("Unsupported position syntax; only \"X\" or \"X Y\" supported, you passed in \" + position + \"");
                return;
            }

            // order is x, y *unless* one they are keywords, in which case they *might* be reversed
            var xy = [];
            xy[0] = (pos[0] == "top" || pos[0] == "bottom") ? pos[1] : pos[0];
            xy[1] = (pos[0] == "top" || pos[0] == "bottom") ? pos[0] : pos[1];

            // convert positions to percentages if they are keywords
            dojo.forEach(xy, function(p, index) {
                if (p == "top") xy[index] = "0%";
                if (p == "right") xy[index] = "100%";
                if (p == "bottom") xy[index] = "100%";
                if (p == "left") xy[index] = "0%";
                if (p == "center") xy[index] = "50%";
            });

            // convert positions to pixels; if the positions are lengths, the image's origin is drawn at the specified position.
            // if the positions are percentages, the percentage represents both the position at which the image is to be drawn
            // and the amount the origin should be translated before image is drawn (a touch confusing)
            var txy = [0, 0];
            for (var i = 0; i < xy.length; i++) {
                var percentage = th.helpers.isPercentage(xy[i]);
                var pixelPosition = this.convertPositionToPixel(xy[i], (i == 0) ? w : h);
                if (percentage) txy[i] = this.convertPositionToPixel(xy[i], (i == 0) ? img.width : img.height);
                xy[i] = pixelPosition;
            }

            // now we can draw the frickin' picture
            ctx.drawImage(img, xy[0], xy[1]);
        } finally {
            ctx.restore();
        }
    },

    convertPositionToPixel: function(position, totalLength) {
        if (th.helpers.isPercentage(pos)) {
            var per = pos.substring(0, pos.length - 1) / 100;
            return totalLength * per;
        } else if (th.helpers.isCssPixel(pos)) {
            return pos.substring(0, pos.length - 2);
        }
    }
});

dojo.declare("th.helpers.ContainerHelpers", null, {
    getScene: function() {
        var container = this;
        while (!container.scene && container.parent) container = container.parent;
        return container.scene;
    },

    getChildById: function(id) {
        for (var i = 0; i < this.children.length; i++) {
            if (this.children[i].id == id) return this.children[i];
        }
    },

    getComponentForPosition: function(x, y, recurse) {
        for (var i = 0; i < this.children.length; i++) {
            if (!this.children[i].bounds) continue;
            
            if (this.children[i].bounds.x <= x && this.children[i].bounds.y <= y
                    && (this.children[i].bounds.x + this.children[i].bounds.width) >= x
                    && (this.children[i].bounds.y + this.children[i].bounds.height) >= y) {
                if (!recurse) return this.children[i];
                return (this.children[i].getComponentForPosition) ?
                       this.children[i].getComponentForPosition(x - this.children[i].bounds.x, y - this.children[i].bounds.y, recurse) :
                       this.children[i];
            }
        }
        return this;
    },

    removeAll: function() {
        this.remove(this.children);
    }
});

}

if(!dojo._hasResource["th.css"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["th.css"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is jquery-css-parser.
 *
 * The Initial Developer of the Original Code is Daniel Wachsstock.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *     Bespin Team (bespin@mozilla.com)
 *
 * ORIGINAL MIT-licensed CODE LICENSE HEADER FOLLOWS:

// jQuery based CSS parser
// documentation: http://youngisrael-stl.org/wordpress/2009/01/16/jquery-css-parser/
// Version: 1.0
// Copyright (c) 2009 Daniel Wachsstock
// MIT license:
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following
// conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.
 * ***** END LICENSE BLOCK ***** */


dojo.provide("th.css"); 

dojo.declare("th.css.CSSParser", null, {
    parse: function(str, ret) {
        // parses the passed stylesheet into an object with properties containing objects with the attribute names and values
        if (!ret) ret = {};          
        
        dojo.forEach(this.munge(str, false).split('`b%'), function(css){              
            css = css.split('%b`'); // css[0] is the selector; css[1] is the index in munged for the cssText  
            if (css.length < 2) return; // invalid css
            css[0] = this.restore(css[0]);
            var obj = ret[css[0]] || {};
            ret[css[0]] = dojo.mixin(obj, this.parsedeclarations(css[1]));
        }, this);  
         
        return ret;
    },

    // replace strings and brace-surrounded blocks with %s`number`s% and %b`number`b%. By successively taking out the innermost
    // blocks, we ensure that we're matching braces. No way to do this with just regular expressions. Obviously, this assumes no one
    // would use %s` in the real world.
    // Turns out this is similar to the method that Dean Edwards used for his CSS parser in IE7.js (http://code.google.com/p/ie7-js/)
    REbraces: /{[^{}]*}/,
    
    REfull: /\[[^\[\]]*\]|{[^{}]*}|\([^()]*\)|function(\s+\w+)?(\s*%b`\d+`b%){2}/, // match pairs of parentheses, brackets, and braces and function definitions.
    
    REatcomment: /\/\*@((?:[^\*]|\*[^\/])*)\*\//g, // comments of the form /*@ text */ have text parsed
    // we have to combine the comments and the strings because comments can contain string delimiters and strings can contain comment delimiters
    // var REcomment = /\/\*(?:[^\*]|\*[^\/])*\*\/|<!--|-->/g; // other comments are stripped. (this is a simplification of real SGML comments (see http://htmlhelp.com/reference/wilbur/misc/comment.html) , but it's what real browsers use)
    // var REstring = /\\.|"(?:[^\\\"]|\\.|\\\n)*"|'(?:[^\\\']|\\.|\\\n)*'/g; // match escaped characters and strings
    
    REcomment_string:
      /(?:\/\*(?:[^\*]|\*[^\/])*\*\/)|(\\.|"(?:[^\\\"]|\\.|\\\n)*"|'(?:[^\\\']|\\.|\\\n)*')/g,
    
    REmunged: /%\w`(\d+)`\w%/,
    
    uid: 0, // unique id number
    
    munged: {}, // strings that were removed by the parser so they don't mess up searching for specific characters

    munge: function(str, full) {
        str = str
            .replace(this.REatcomment, '$1') // strip /*@ comments but leave the text (to let invalid CSS through)
            .replace(this.REcomment_string, dojo.hitch(this, function(s, string) { // strip strings and escaped characters, leaving munged markers, and strip comments
                if (!string) return '';
                var replacement = '%s`'+(++this.uid)+'`s%';
                this.munged[this.uid] = string.replace(/^\\/, ''); // strip the backslash now
                return replacement;
            }));
       
        // need a loop here rather than .replace since we need to replace nested braces
        var RE = full ? this.REfull : this.REbraces;
        while (match = RE.exec(str)) {
            replacement = '%b`'+(++this.uid)+'`b%';
            this.munged[this.uid] = match[0];
            str = str.replace(RE, replacement);
        }           
        return str;
    },

    restore: function(str) {
        if (str === undefined) return str;
        while (match = this.REmunged.exec(str)) {
            str = str.replace(this.REmunged, this.munged[match[1]]);
        }
        return dojo.trim(str);
    },

    parsedeclarations: function(index){ // take a string from the munged array and parse it into an object of property: value pairs
        var str = this.munged[index].replace(/(?:^\s*[{'"]\s*)|(?:\s*([^\\])[}'"]\s*$)/g, '$1'); // find the string and remove the surrounding braces or quotes
        str = this.munge(str); // make sure any internal braces or strings are escaped
        var parsed = {};   
        dojo.forEach(str.split(';'), function(decl) {
            decl = decl.split(':');
            if (decl.length < 2) return;
            parsed[this.restore(decl[0])] = this.restore(decl[1]);
        }, this);
        return parsed;
    }
});

}

if(!dojo._hasResource["th.th"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["th.th"] = true;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

dojo.provide("th.th");  

/*
    Constants
 */ 
dojo.mixin(th, {
    VERTICAL: "v",
    HORIZONTAL: "h"    
});

// ** {{{ Resources }}} **
//
// Loads those resources that are shared with all Scenes on the same page, like CSS and layout information.
// Typically there is no need to instantiate this class; a Scene will do it automatically. However, for performance, you may
// wish to eagerly instantiate an instance to request resources earlier in the page realization process.
//
// property cssLoaded
dojo.declare("th.Resources", null, {
    constructor: function() {
        this.loading = false;

        // an array containing objects that correspond to each matching stylesheet in the order specified
        this.userAgentCss = [];
        this.authorCss = [];
        this.userCss = [];

        this.blockUntilImagesLoaded = true;

        // images
        this.images = {};

        // used during the CSS loading process; due to callbacks, this is pushed top-level so it can be shared across functions
        this.sheetCount = 0;
        this.currentSheet = 0;

        // used during image loading process
        this.imageCount = 0;
        this.currentImage = 0;

        this.loaded = false;    // are all the resources loaded, including CSS and other stuff?
        this.cssLoaded = false; // are all the CSS sheets loaded?
        this.imagesLoaded = false;  // are all the images references by the CSS loaded?

        this.callbacks = [];
    },

    load: function() {
        if (this.loaded) return;    // no re-loading
        
        this.loading = true;
        this.parseCSS();
    },

    processImage: function() {
        this.currentImage++;
        if (this.imageCount == this.currentImage) {
            this.imagesLoaded = true;
            this.onLoaded();
        }
    },

    onLoaded: function() {
        if (this.cssLoaded && ((this.blockUntilImagesLoaded && this.imagesLoaded) || !this.blockUntilImagesLoaded)) {
            this.loaded = true;
            this.loading = false;
            if (this.callbacks) {
                dojo.forEach(this.callbacks, function(item) {
                    // check if there is context; if so, execute the callback using the context
                    if (item.context) {
                        item.callback.apply(item.context);
                    } else {
                        item.callback();
                    }
                });
            }
        }
    },

    registerOnLoadCallback: function(callback, context) {
        this.callbacks.push({ callback: callback, context: context });
    },

    parseCSS: function() {
        var links = [];

        // add default stylesheet; cheesy path at the moment, need to come up with a better way to approach this TODO
        links.push({ url: "/js/th/default.css", array: this.userAgentCss, index: 0 });

        var s, l = document.getElementsByTagName('link'), counter = 0;
		for (var i=0; i < l.length; i++){
		    s = l[i];
			if (s.rel.toLowerCase().indexOf('thstylesheet') >= 0 && s.href) {
			    links.push({ url: s.href, array: this.authorCss, index: counter++ });
			}
		}

        // this shouldn't happen; we should always have at least one userAgentCss otherwise things are going to be mighty sparse
        if (links.length == 0) {
            this.cssLoaded = true;
            return this.onLoaded();
        }

        this.sheetCount = links.length;
        dojo.forEach(links, function(link) {
            dojo.xhrGet({
                url: link.url,
                load: dojo.hitch(this, function(response) {
                    this.processCSS(response, link.array, link.index );
                })
            });
        }, this);
    },

    processCSS: function(stylesheet, array, index) {
        array[index] = new th.css.CSSParser().parse(stylesheet);

        // load the images
        for (var rule in array[index]) {
            for (var property in array[index][rule]) {
                var value = array[index][rule][property];
                if (value.indexOf("url(") == 0 && value.indexOf(")") == value.length - 1) {
                    var url = value.substring(4, value.length - 1);

                    this.imageCount++;
                    var image = new Image();

                    if (this.blockUntilImagesLoaded) {
                        this.imagesLoaded = false;
                        dojo.connect(image, "onload", this, this.processImage);
                    }

                    image.src = "." + url;
                    this.images[value] = image;

                    // swap out the value in the CSS with an image; not sure this is the right way to go
                    array[index][rule][property] = image;
                }
            }
        }

        if (++this.currentSheet == this.sheetCount) {
            this.cssLoaded = true;
            this.onLoaded();
        }
    }
});

/*
    Event bus; all listeners and events pass through a single global instance of this class.
 */ 
dojo.declare("th.Bus", null, {
    constructor: function() {
        // map of event name to listener; listener contains a selector, function, and optional context object
        this.events = {};
    },

    // register a listener with an event
    // - event: string name of the event
    // - selector: 
    bind: function(event, selector, listenerFn, listenerContext) {
        var listeners = this.events[event];
        if (!listeners) {
            listeners = [];
            this.events[event] = listeners;
        }
        selector = dojo.isArray(selector) ? selector : [ selector ];
        for (var z = 0; z < selector.length; z++) {
            for (var i = 0; i < listeners.length; i++) {
                if (listeners[i].selector == selector[z] && listeners[i].listenerFn == listenerFn) return;
            }
            listeners.push({ selector: selector[z], listenerFn: listenerFn, context: listenerContext });
        }
    },

    // removes any listeners whose selectors have the *same identity* as the passed selector
    unbind: function(selector) {
        for (var event in this.events) {
            var listeners = this.events[event];

            for (var i = 0; i < listeners.length; i++) {
                if (listeners[i].selector === selector) {
                    this.events[event] = dojo.filter(listeners, function(item){ return item != listeners[i]; });                    
                    listeners = this.events[event];
                    i--;
                }
            }
        }
    },

    // notify all listeners of an event
    fire: function(eventName, eventDetails, component) {
        var listeners = this.events[eventName];
        if (!listeners || listeners.length == 0) return;

        // go through each listener registered for the fired event and check if the selector matches the component for whom
        // the event was fired; if there is a match, dispatch the event
        for (var i = 0; i < listeners.length; i++) {
            // if the listener selector is a string...
            if (listeners[i].selector.constructor == String) {
                // check if the string starts with a hash, indicating that it should match by id
                if (listeners[i].selector.charAt(0) == "#") {
                    if (component.id == listeners[i].selector.substring(1)) {
                        this.dispatchEvent(eventName, eventDetails, component, listeners[i]);
                    }
                // otherwise check if it's the name of the component class
                } else if (listeners[i].selector == component.declaredClass) {
                    this.dispatchEvent(eventName, eventDetails, component, listeners[i]);
                }
            // otherwise check if the selector is the current component
            } else if (listeners[i].selector == component) {
                this.dispatchEvent(eventName, eventDetails, component, listeners[i]);
            }
        }
    },

    // invokes the listener function
    dispatchEvent: function(eventName, eventDetails, component, listener) {
        eventDetails.thComponent = component;

        // check if there is listener context; if so, execute the listener function using that as the context
        if (listener.context) {
            listener.listenerFn.apply(listener.context, [ eventDetails ]);
        } else {
            listener.listenerFn(eventDetails);
        }
    }
});

// create the global event bus
th.global_event_bus = new th.Bus();

// create the global resource loader loader
th.global_resources = new th.Resources();

dojo.declare("th.Scene", th.helpers.EventHelpers, { 
    bus: th.global_event_bus,

    constructor: function(canvas) {
        this.canvas = canvas;

        // whether this scene completely repaints on each render or does something smarter. this is experimental.
        this.smartRedraw = false;

        // aliasing global resources to be a member; not yet clear how components will typically get access to resources, whether
        // through scene or the global
        this.resources = th.global_resources;

        // has this scene registered a render callback? this is done if render() invoked before resources are all loaded
        this.resourceCallbackRegistered = false;

        // if the resource loading process hasn't started, start it!
        if (!this.resources.loaded && !this.resources.loading) this.resources.load();

        dojo.connect(window, "resize", dojo.hitch(this, function() {
            this.render();
        })); 

        this.root = new th.components.Panel({ id: "root" });
        this.root.scene = this; 

        var testCanvas = document.createElement("canvas");
        this.scratchContext = testCanvas.getContext("2d");
        bespin.util.canvas.fix(this.scratchContext);

        dojo.connect(window, "mousedown", dojo.hitch(this, function(e) {
            this.wrapEvent(e, this.root);

            this.mouseDownComponent = e.thComponent;

            th.global_event_bus.fire("mousedown", e, e.thComponent);
        }));

        dojo.connect(window, "dblclick", dojo.hitch(this, function(e) {
            this.wrapEvent(e, this.root);

            th.global_event_bus.fire("dblclick", e, e.thComponent);
        }));

        dojo.connect(window, "click", dojo.hitch(this, function(e) {
            this.wrapEvent(e, this.root);

            th.global_event_bus.fire("click", e, e.thComponent);
        }));

        dojo.connect(window, "mousemove", dojo.hitch(this, function(e) {
            this.wrapEvent(e, this.root);

            th.global_event_bus.fire("mousemove", e, e.thComponent);

            if (this.mouseDownComponent) {
                this.addComponentXY(e, this.root, this.mouseDownComponent);
                th.global_event_bus.fire("mousedrag", e, this.mouseDownComponent);
            }
        }));

        dojo.connect(window, "mouseup", dojo.hitch(this, function(e) {
            if (!this.mouseDownComponent) return;

            this.addComponentXY(e, this.root, this.mouseDownComponent);
            th.global_event_bus.fire("mouseup", e, this.mouseDownComponent);

            delete this.mouseDownComponent;
        }));
    },

    render: function() {
        if (!this.resources.loaded) {
            if (!this.resourceCallbackRegistered) {
                this.resources.registerOnLoadCallback(this.render, this);
                this.resourceCallbackRegistered = true;
            }

            return;
        }

        this.layout();
        this.paint();
    },

    layout: function() {
        if (this.root) {
            this.root.bounds = { x: 0, y: 0, width: this.canvas.width, height: this.canvas.height };
            this.root.layoutTree();
        }
    },

    paint: function(component) {
        if (!this.resources.loaded) {
            if (!this.resourceCallbackRegistered) {
                this.resources.registerOnLoadCallback(this.render, this);
                this.resourceCallbackRegistered = true;
            }

            return;
        }

        if (!component) component = this.root;

        if (component) {
            if (!component.opaque && component.parent) {
                return this.paint(component.parent);
            }

            var ctx = this.canvas.getContext("2d");
            bespin.util.canvas.fix(ctx);

            ctx.save();

            var parent = component.parent;
            var child = component;
            while (parent) {
                try {
                    ctx.translate(child.bounds.x, child.bounds.y);
                } catch (e) {
                    console.log("translate error (" + child.type + ")");
                    console.log("child bounds:", child.bounds);
                    return;
                }
                child = parent;
                parent = parent.parent;
            }
            
            if (!this.smartRedraw) {
                ctx.clearRect(0, 0, component.bounds.width, component.bounds.height);
            }
            ctx.beginPath();
            ctx.rect(0, 0, component.bounds.width, component.bounds.height);
            ctx.closePath();
            ctx.clip(); 
            component.paint(ctx);  
            
            ctx.restore();
        }
    }
});

dojo.declare("th.Border", th.helpers.ComponentHelpers, {
    constructor: function(parms) {
        if (!parms) parms = {};
        this.style = parms.style || {};
        this.attributes = parms.attributes || {};
    },

    getInsets: function() {
        return this.emptyInsets();
    },

    paint: function(ctx) {}
});   
    
dojo.declare("th.Component", th.helpers.ComponentHelpers, {
    constructor: function(parms) { 
        if (!parms) parms = {};
        this.bounds = parms.bounds || {};
        this.style = parms.style || {};
        this.styles = parms.styles || {};
        this.className = parms.className;
        this.attributes = parms.attributes || {};
        this.id = parms.id;
        this.border = parms.border;
        this.opaque = parms.opaque || true;
    
        this.bus = th.global_event_bus; 
    },
    
    // used to obtain a throw-away canvas context for performing measurements, etc.; may or may not be the same canvas as that used to draw the component
    getScratchContext: function() {
        var scene = this.getScene();
        if (scene) return scene.scratchContext;
    },
    
    getPreferredHeight: function(width) {},
    
    getPreferredWidth: function(height) {},
    
    getInsets: function() {
        return (this.border) ? this.border.getInsets() : this.emptyInsets();
    },
    
    paint: function(ctx) {},
    
    repaint: function() {
        // todo: at present, there are some race conditions that cause painting to be invoked before a scene is ready, so this
        // check is necessary to bail. We need to work out better rules for scenes and components, etc.
        if (!this.getScene()) return;
        
        this.getScene().paint(this);
    }
});

dojo.declare("th.Container", [th.Component, th.helpers.ContainerHelpers], {
    constructor: function() {       
        this.children = [];
    },
    
    add: function() {
        for (var z = 0; z < arguments.length; z++) {
            component = dojo.isArray(arguments[z]) ? arguments[z] : [ arguments[z] ]; 
            this.children = this.children.concat(component);
            for (var i = 0; i < component.length; i++) {
                component[i].parent = this;
            }
        }
    },

    remove: function() {
        for (var z = 0; z < arguments.length; z++) {
            component = dojo.isArray(arguments[z]) ? arguments[z] : [ arguments[z] ];
            for (var i = 0; i < component.length; i++) {
                var old_length = this.children.length;
                this.children = dojo.filter(this.children, function(item){ return item != component[i]; });

                // if the length of the array has changed since I tried to remove the current component, assume it was removed and clear the parent
                if (old_length != this.children.length) delete component[i].parent;
            }
        }
    },
    
    replace: function(component, index) {
        this.bus.unbind(this.children[index]);
        component.parent = this;
        this.children[index] = component;
    },

    paint: function(ctx) {
        if (this.shouldPaint()) {
            this.paintSelf(ctx);
            this.paintChildren(ctx);
        }
    },

    paintSelf: function(ctx) {},

    paintChildren: function(ctx) {
        for (var i = 0; i < this.children.length; i++ ) {
            if (!this.children[i].shouldPaint()) continue;

            if (!this.children[i].bounds) {
                // console.log("WARNING: child " + i + " (type: " + this.children[i].declaredClass + ", id: " + this.children[i].id + ") of parent with id " + this.id + " of type " + this.declaredClass + " has no bounds and could not be painted");
                continue;
            }

            ctx.save();
            try {
                ctx.translate(this.children[i].bounds.x, this.children[i].bounds.y);
            } catch (error) {
                // console.log("WARNING: child " + i + " (type: " + this.children[i].declaredClass + ", id: " + this.children[i].id + ") of parent with id " + this.id + " of type " + this.declaredClass + " has malformed bounds and could not be painted");
                // console.log(this.children[i].bounds);
                ctx.restore();
                continue;
            }

            try {
                if (!this.children[i].style["noClip"]) {
                    ctx.beginPath();
                    ctx.rect(0, 0, this.children[i].bounds.width, this.children[i].bounds.height);
                    ctx.closePath();
                    ctx.clip();
                }
            } catch(ex) {
                // console.log("Bounds problem");
                // console.log(this.children[i].declaredClass);
                // console.log(this.children[i].bounds);
            }

            ctx.save();
            this.children[i].resolveCss();
            this.children[i].paint(ctx);
            ctx.restore();

            if (this.children[i].style.border) {
                this.children[i].style.border.component = this.children[i];
                ctx.save();
                this.children[i].style.border.paint(ctx);
                ctx.restore();
            }

            ctx.restore();
        }
    },

    // lays out this container and any sub-containers
    layoutTree: function() {
        this.layout();
        for (var i = 0; i < this.children.length; i++) {  
            if (this.children[i].layoutTree) this.children[i].layoutTree();
        }
    },

    layout: function() {
        var d = this.d();
        if (this.children.length > 0) {
            var totalWidth = this.bounds.width - d.i.w;
            var individualWidth = totalWidth / this.children.length;
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].bounds = { x: (i * individualWidth) + d.i.l, y: d.i.t, width: individualWidth, height: this.bounds.height - d.i.h };
            }
        }
    },

    render: function() {
        if (!th.global_resources.loaded) return;

        this.layoutTree();
        this.repaint();
    }
});

dojo.declare("th.Window", null, {
    constructor: function(parms) {        
        parms = parms || {};
        
        this.containerId = parms.containerId || false;
        this.width = parms.width || 200;
        this.height = parms.height || 300;
        this.title = parms.title || 'NO TITLE GIVEN!';
        this.y = parms.top || 50;
        this.x = parms.left || 50;
        this.isVisible = false;
        this.closeOnClickOutside = !!parms.closeOnClickOutside;

        // some things must be given
        if(!parms.containerId) {
            console.error('The "containerId" must be given!');
            return;            
        }
        
        // for the moment, this is done by hand!
        // if (dojo.byId(this.containerId)) {
        //             console.error('There is already a element with the id "'+this.containerId+'"!');
        //             return;
        //         }
                
        if (!parms.userPanel) {
            console.error('The "userPanel" must be given!');
            return;
        }
        
        /*if (!dojo.byId('popup_insert_point')) {
            // there is no place to add the popups => create one
            for (var x = 0; x < document.childNodes.length; x++) {
                if (document.childNodes[x].nodeType == 1) {
                    // thats the place to add the pop_insert_point
                    var popupParent = document.createElement("div");
                    popupParent.id = 'popup_insert_point';
                    document.childNodes[x].appendChild(popupParent);
                    break;
                }
            }
        }*/
        
        // insert the HTML to the document for the new window and create the scene
        // dojo.byId('popup_insert_point').innerHTML += '<div id="'+this.containerId+'" class="popupWindow"></div>';
        this.container = dojo.byId(this.containerId);
        dojo.attr(this.container, { width: this.width, height: this.height, tabindex: '-1' });

        this.container.innerHTML += "<canvas id='"+this.containerId+"_canvas'></canvas>";
        this.canvas = dojo.byId(this.containerId + '_canvas');
        dojo.attr(this.canvas, { width: this.width, height: this.height, tabindex: '-1' });
        
        this.scene = new th.Scene(this.canvas);
        this.windowPanel = new th.components.WindowPanel(parms.title, parms.userPanel);
        this.windowPanel.windowBar.parentWindow = this;  
        this.scene.root.add(this.windowPanel);
        
        this.move(this.x, this.y);
        
        // add some listeners for closing the window
        
        // close the window, if the user clicks outside the window
        dojo.connect(window, "mousedown", dojo.hitch(this, function(e) {
            if (!this.isVisible || !this.closeOnClickOutside) return;

            var d = dojo.coords(this.container);
            if (e.clientX < d.l || e.clientX > (d.l + d.w) || e.clientY < d.t || e.clientY > (d.t + d.h)) {
                this.toggle();
            }
        }));
        
        // close the window, if the user pressed ESCAPE
        dojo.connect(window, "keydown", dojo.hitch(this, function(e) {
            if (!this.isVisible) return;
            
            if(e.keyCode == bespin.util.keys.Key.ESCAPE) {
                this.toggle();
                dojo.stopEvent(e);
            }
        }));
    }, 
         
    toggle: function() {
        this.isVisible = !this.isVisible;
                
        if (this.isVisible) {
            this.container.style.display = 'block';
            this.layoutAndRender();
        } else {
            this.container.style.display = 'none';
        }
        
        this.scene.bus.fire("toggle", {isVisible: this.isVisible}, this);
    },
    
    layoutAndRender: function() {
        this.scene.layout();
        this.scene.render();
    },
    
    centerUp: function() {
        this.move(Math.round((window.innerWidth - this.width) * 0.5), Math.round((window.innerHeight - this.height) * 0.25));
    },
    
    center: function() {
        this.move(Math.round((window.innerWidth - this.width) * 0.5), Math.round((window.innerHeight - this.height) * 0.5));
    },
    
    move: function(x, y) {
        this.y = y;
        this.x = x;
        this.container.style.top = y + 'px';
        this.container.style.left = x + 'px';
    },
    
    getPosition: function() {
        return { x: this.x, y: this.y };
    }
});

}

if(!dojo._hasResource["th.models"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["th.models"] = true;
//  ***** BEGIN LICENSE BLOCK *****
// Version: MPL 1.1
// 
// The contents of this file are subject to the Mozilla Public License  
// Version
// 1.1 (the "License"); you may not use this file except in compliance  
// with
// the License. You may obtain a copy of the License at
// http://www.mozilla.org/MPL/
// 
// Software distributed under the License is distributed on an "AS IS"  
// basis,
// WITHOUT WARRANTY OF ANY KIND, either express or implied. See the  
// License
// for the specific language governing rights and limitations under the
// License.
// 
// The Original Code is Bespin.
// 
// The Initial Developer of the Original Code is Mozilla.
// Portions created by the Initial Developer are Copyright (C) 2009
// the Initial Developer. All Rights Reserved.
// 
// Contributor(s):
// 
// ***** END LICENSE BLOCK *****
// 

dojo.provide("th.models");

dojo.declare("th.models.LazyTreeModel", null, {
    placeholder: "(placeholder)",

    loading: "(loading)",

    root: this.placeholder,

    getRoot: function() {
        return this.root;
    },

    getChildren: function(parent) {
    },

    loadChildren: function(parent) {
    },

    childrenLoaded: function(parent, children) {        
    }
});

}

if(!dojo._hasResource["th.borders"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["th.borders"] = true;
//  ***** BEGIN LICENSE BLOCK *****
// Version: MPL 1.1
// 
// The contents of this file are subject to the Mozilla Public License  
// Version
// 1.1 (the "License"); you may not use this file except in compliance  
// with
// the License. You may obtain a copy of the License at
// http://www.mozilla.org/MPL/
// 
// Software distributed under the License is distributed on an "AS IS"  
// basis,
// WITHOUT WARRANTY OF ANY KIND, either express or implied. See the  
// License
// for the specific language governing rights and limitations under the
// License.
// 
// The Original Code is Bespin.
// 
// The Initial Developer of the Original Code is Mozilla.
// Portions created by the Initial Developer are Copyright (C) 2009
// the Initial Developer. All Rights Reserved.
// 
// Contributor(s):
// 
// ***** END LICENSE BLOCK *****
// 

dojo.provide("th.borders");

dojo.declare("th.borders.SimpleBorder", th.Border, {
    getInsets: function() {
        return { left: 1, right: 1, top: 1, bottom: 1 };
    },

    paint: function(ctx) {
        var b = this.component.bounds;
        ctx.strokeStyle = this.style.color;
        ctx.strokeRect(0, 0, b.width, b.height);
    }
}); 

dojo.declare("th.borders.EmptyBorder", th.Border, {
    constructor: function(parms) {
        if (!parms) parms = {};
        
        if (parms.size) {
            this.insets = { left: parms.size, right: parms.size, top: parms.size, bottom: parms.size };
        } else {
            this.insets = parms.insets;
        }
    },

    getInsets: function() {
        return this.insets;
    }
});

}

if(!dojo._hasResource["th.components"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["th.components"] = true;
//  ***** BEGIN LICENSE BLOCK *****
// Version: MPL 1.1
// 
// The contents of this file are subject to the Mozilla Public License  
// Version
// 1.1 (the "License"); you may not use this file except in compliance  
// with
// the License. You may obtain a copy of the License at
// http://www.mozilla.org/MPL/
// 
// Software distributed under the License is distributed on an "AS IS"  
// basis,
// WITHOUT WARRANTY OF ANY KIND, either express or implied. See the  
// License
// for the specific language governing rights and limitations under the
// License.
// 
// The Original Code is Bespin.
// 
// The Initial Developer of the Original Code is Mozilla.
// Portions created by the Initial Developer are Copyright (C) 2009
// the Initial Developer. All Rights Reserved.
// 
// Contributor(s):
// 
// ***** END LICENSE BLOCK *****
// 

dojo.provide("th.components");

dojo.declare("th.components.Button", th.Component, {
    paint: function(ctx) {
        var d = this.d();

        var top = this.styles["-th-top-image"];
        var mid = this.styles["-th-middle-image"];
        var bot = this.styles["-th-bottom-image"];

        var back = this.styles["background-image"];

        if (top && mid && bot) {
            if (d.b.h >= top.height + bot.height) {
                ctx.drawImage(top, 0, 0);
                if (d.b.h > top.height + bot.height) {
                    ctx.drawImage(mid, 0, top.height, mid.width, d.b.h - top.height - bot.height);
                }
                ctx.drawImage(bot, 0, d.b.h - bot.height);
            }
        } else if (back) {
            ctx.drawImage(back, 0, 0);
        } else {
            ctx.fillStyle = this.styles["background-color"] || "red";
            ctx.fillRect(0, 0, d.b.w, d.b.h);
        }
    }
});

dojo.declare("th.components.Scrollbar", th.Container, {
    constructor: function(parms) {
        if (!parms) parms = {};
        this.orientation = parms.orientation || th.VERTICAL;
        this.value = parms.value || 0;
        this.min = parms.min || 0;
        this.max = parms.max || 100;
        this.extent = parms.extent || 0.1;
        this.increment = parms.increment || 2;
        this.style = parms.style || {};

        this.up = new th.components.Button({ className: "up" });
        this.down = new th.components.Button({ className: "down" });
        this.bar = new th.components.Button({ className: "bar" });
        this.add([ this.up, this.down, this.bar ]);

        this.bus.bind("click", this.up, this.scrollup, this);
        this.bus.bind("click", this.down, this.scrolldown, this);
        this.bus.bind("mousedrag", this.bar, this.onmousedrag, this);
        this.bus.bind("mouseup", this.bar, this.onmouseup, this);
    },

    onmousedrag: function(e) {
        var currentPosition = (this.orientation == th.VERTICAL) ? e.clientY : e.clientX;

        if (this.dragstart_value == undefined) {
            this.dragstart_value = this.value;
            this.dragstart_mouse = currentPosition;
            return;
        }

        var diff = currentPosition - this.dragstart_mouse;  // difference in pixels; needs to be translated to a difference in value

        var pixel_range = this.bounds.height - this.up.bounds.height - this.down.bounds.height - this.bar.bounds.height; // total number of pixels that map to the value range

        var pixel_to_value_ratio = (this.max - this.min) / pixel_range;

        this.value = this.dragstart_value + Math.floor(diff * pixel_to_value_ratio);
        if (this.value < this.min) this.value = this.min;
        if (this.value > this.max) this.value = this.max;
        if (this.scrollable) this.scrollable.scrollTop = this.value;
        this.render();
        if (this.scrollable) this.scrollable.repaint();
    },

    onmouseup: function(e) {
        delete this.dragstart_value;
        delete this.dragstart_mouse;
    },

    scrollup: function(e) {
        if (this.value > this.min) {
            this.value = Math.max(this.min, this.value - this.increment);
            if (this.scrollable) this.scrollable.scrollTop = this.value;
            this.render();
            if (this.scrollable) this.scrollable.repaint();
        }
    },

    scrolldown: function(e) {
        if (this.value < this.max) {
            this.value = Math.min(this.max, this.value + this.increment);
            if (this.scrollable) this.scrollable.scrollTop = this.value;
            this.render();
            if (this.scrollable) this.scrollable.repaint();
        }
    },

    layout: function() {
        var d = this.d();

        // check if there's a scrollable attached; if so, refresh state
        if (this.scrollable) {
            var view_height = this.scrollable.bounds.height;
            var scrollable_info = this.scrollable.getScrollInfo();
            this.min = 0;
            this.max = scrollable_info.scrollHeight - view_height;
            this.value = scrollable_info.scrollTop;
            this.extent = (scrollable_info.scrollHeight - view_height) / scrollable_info.scrollHeight;
        }

        // if the maximum value is less than the minimum, we're in an invalid state and won't paint anything
        if (this.max < this.min) {
            for (var i = 0; i < this.children.length; i++) delete this.children[i].bounds;
            return;
        }

        if (this.orientation == th.VERTICAL) {
            var w = d.b.iw;
            var h = 12;
            this.up.bounds = { x: d.i.l + 1, y: d.i.t, width: w, height: h };
            this.down.bounds = { x: d.i.l + 1, y: d.b.ih - h, width: w, height: h };

            var scroll_track_height = d.b.ih - this.up.bounds.height - this.down.bounds.height;

            var extent_length = Math.min(Math.floor(scroll_track_height - (this.extent * scroll_track_height), d.b.ih - this.up.bounds.height - this.down.bounds.height));
            var extent_top = Math.floor(this.up.bounds.height + Math.min( (this.value / (this.max - this.min)) * (scroll_track_height - extent_length) ));
            this.bar.bounds = { x: d.i.l + 1, y: extent_top, width: d.b.iw, height: extent_length };
        } else {

        }
    },

    paint: function(ctx) {
        if (this.max < 0) return;

        var top = this.styles["-th-vertical-top-image"];
        var mid = this.styles["-th-vertical-middle-image"];
        var bot = this.styles["-th-vertical-bottom-image"];

        // paint the track
        if (top) ctx.drawImage(top, 1, this.up.bounds.height);
        if (mid) ctx.drawImage(mid, 1, this.up.bounds.height + top.height, mid.width, this.down.bounds.y - this.down.bounds.height - (this.up.bounds.x - this.up.bounds.height));
        if (bot) ctx.drawImage(bot, 1, this.down.bounds.y - bot.height);

        this.inherited(arguments);
    }
});
    
dojo.declare("th.components.Panel", th.Container, {
    paintSelf: function(ctx) {
        this.paintBackground(ctx);
    }
});  


dojo.declare("th.components.ResizeNib", th.Component, { 
    constructor: function(parms) {
        this.bus.bind("mousedown", this, this.onmousedown, this);
        this.bus.bind("mouseup", this, this.onmouseup, this);
        this.bus.bind("mousedrag", this, this.onmousedrag, this);
    },

    onmousedown: function(e) {
        this.startPos = { x: e.clientX, y: e.clientY};
    },

    onmousedrag: function(e) {
        if (this.startPos) {
            if (!this.firedDragStart) {
                this.bus.fire("dragstart", this.startPos, this);
                this.firedDragStart = true;
            }

            this.bus.fire("drag", { startPos: this.startPos, currentPos: { x: e.clientX, y: e.clientY } }, this);
        }
    },

    onmouseup: function(e) {
        if (this.startPos && this.firedDragStart) {
            this.bus.fire("dragstop", { startPos: this.startPos, currentPos: { x: e.clientX, y: e.clientY } }, this);
            delete this.firedDragStart;
        }
        delete this.startPos;
    },

    paint: function(ctx) {
        var d = this.d();  

        if (this.attributes.orientation == th.VERTICAL) {
            var bw = 7;
            var x = Math.floor((d.b.w / 2) - (bw / 2));
            var y = 7;

            ctx.fillStyle = this.styles["-th-vertical-bar-shadow-color"];
            for (var i = 0; i < 3; i++) {
                ctx.fillRect(x, y, bw, 1);
                y += 3;
            }

            y = 8;
            ctx.fillStyle = this.styles["-th-vertical-bar-color"];
            for (var i = 0; i < 3; i++) {
                ctx.fillRect(x, y, bw, 1);
                y += 3;
            }
        } else {
            var bh = 7;

            var dw = 8; // width of the bar area
            var dh = bh + 2; // height of the bar area

            var x = Math.floor(d.b.w / 2 - (dw / 2));
            var y = Math.floor(d.b.h / 2 - (dh / 2));

            // lay down the shadowy bits
            var cx = x;

            if (this.styles["-th-horizontal-bar-subtle-shadow-color"]) {
                ctx.fillStyle = this.styles["-th-horizontal-bar-subtle-shadow-color"];
                for (var i = 0; i < 3; i++) {
                    ctx.fillRect(cx, y, 1, dh);
                    cx += 3;
                }
            }

            // lay down the black shadow
            cx = x + 1;
            ctx.fillStyle = this.styles["-th-horizontal-bar-shadow-color"];
            for (var i = 0; i < 3; i++) {
                ctx.fillRect(cx, y + dh - 1, 1, 1);
                cx += 3;
            }

            // draw the bars
            cx = x + 1;
            ctx.fillStyle = this.styles["-th-horizontal-bar-color"];
            for (var i = 0; i < 3; i++) {
                ctx.fillRect(cx, y + 1, 1, bh);
                cx += 3;
            }
        }
    }    
});



/*
    A "splitter" that visually demarcates areas of an interface. Can also have some "nibs" on its ends to facilitate resizing.
    Provides "dragstart", "drag", and "dragstop" events that are fired when a nib is dragged. Orientation is in terms of a container and
    is confusing; HORIZONTAL means the splitter is actually displayed taller than wide--what might be called vertically, and similarly
    VERTICAL means the splitter is wider than it is tall, i.e., horizontally. This is because the *container* is laid out such that
    different regions are stacked horizontally or vertically, and the splitter demarcates those areas.

    This bit of confusion was deemed better than having the orientation for a hierarchy of components be different but contributing to the
    same end.

    Note also that this component uses getPreferredHeight() and getPreferredWidth() differently than most; only one of the methods is
    valid for a particular orientation. I.e., when in HORIZONTAL orientation, getPreferredWidth() should be used and getPreferredHeight()
    ignored.

 */ 
dojo.declare("th.components.Splitter", th.Container, { 
    constructor: function(parms) {
        this.topNib = new th.components.ResizeNib({ attributes: { orientation: this.attributes.orientation } });
        this.bottomNib = new th.components.ResizeNib({ attributes: { orientation: this.attributes.orientation } });
        this.add(this.topNib, this.bottomNib);

        this.label = parms.label;
        if (this.label) this.add(this.label);

        this.scrollbar = parms.scrollbar;
        if (this.scrollbar) this.add(this.scrollbar);

        this.bus.bind("drag", [ this.topNib, this.bottomNib ], this.ondrag, this);
        this.bus.bind("dragstart", [ this.topNib, this.bottomNib ], this.ondragstart, this);
        this.bus.bind("dragstop", [ this.topNib, this.bottomNib ], this.ondragstop, this);
    },

    ondrag: function(e) {
        this.bus.fire("drag", e, this);
    },

    ondragstart: function(e) {
        this.bus.fire("dragstart", e, this);
    },

    ondragstop: function(e) {
        this.bus.fire("dragstop", e, this);
    },

    getPreferredHeight: function(width) {
        return 20;
    },

    getPreferredWidth: function(height) {
        return 16;
    },

    layout: function() {
        var d = this.d();

        // if the orientation isn't explicitly set, guess it by examining the ratio
        if (!this.attributes.orientation) this.attributes.orientation = (this.bounds.height > this.bounds.width) ? th.HORIZONTAL : th.VERTICAL;

        if (this.attributes.orientation == th.HORIZONTAL) {
            this.topNib.bounds = { x: 0, y: 0, height: d.b.w, width: d.b.w };
            this.bottomNib.bounds = { x: 0, y: this.bounds.height - d.b.w, height: d.b.w, width: d.b.w };

            if (this.scrollbar && this.scrollbar.shouldLayout()) {
                this.scrollbar.bounds = { x: 0, y: this.topNib.bounds.height, height: d.b.h - (this.topNib.bounds.height * 2), width: d.b.w };
            }
        } else {
            this.topNib.bounds = { x: 0, y: 0, height: d.b.h, width: d.b.h };
            this.bottomNib.bounds = { x: d.b.w - d.b.h, y: 0, height: d.b.h, width: d.b.h };

            if (this.label) {
                this.label.bounds = { x: this.topNib.bounds.x + this.topNib.bounds.width, y: 0, height: d.b.h, width: d.b.w - (d.b.h * 2) };
            }
        }
    },

    paintSelf: function(ctx) {
        var d = this.d();
        if (this.attributes.orientation == th.VERTICAL) {
            ctx.fillStyle = "rgb(73, 72, 66)";
            ctx.fillRect(0, 0, d.b.w, 1);
            ctx.fillStyle = "black";
            ctx.fillRect(0, d.b.h - 1, d.b.w, 1);

            var gradient = ctx.createLinearGradient(0, 1, 0, d.b.h - 1);
            gradient.addColorStop(0, "rgb(50, 48, 42)");
            gradient.addColorStop(1, "rgb(22, 22, 19)");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 1, d.b.w, d.b.h - 2);
        } else {
            ctx.fillStyle = "rgb(105, 105, 99)";
            ctx.fillRect(0, 0, 1, d.b.h);
            ctx.fillStyle = "black";
            ctx.fillRect(d.b.w - 1, 0, 1, d.b.h);

            var gradient = ctx.createLinearGradient(1, 0, d.b.w - 2, 0);
            gradient.addColorStop(0, "rgb(56, 55, 49)");
            gradient.addColorStop(1, "rgb(62, 61, 55)");
            ctx.fillStyle = gradient;
            ctx.fillRect(1, 0, d.b.w - 2, d.b.h);
        }
    }
});

dojo.declare("th.components.SplitPanelContainer", th.components.Panel, {
    constructor: function(parms) {
        this.splitter = new th.components.Splitter({ attributes: { orientation: this.attributes.orientation }, label: parms.label });
    },

    getContents: function() {                                                 
        var childrenWithoutSplitter = dojo.filter(this.children, 
            dojo.hitch(this, function(item){ return item != this.splitter; })
        );
        if (childrenWithoutSplitter.length > 0) return childrenWithoutSplitter[0];
    },

    layout: function() {
        var childrenWithoutSplitter = dojo.filter(this.children, 
            dojo.hitch(this, function(item){ return item != this.splitter; })
        );
        if (this.children.length == childrenWithoutSplitter.length) this.add(this.splitter);

        var slength = (this.attributes.orientation == th.HORIZONTAL) ?
                      this.splitter.getPreferredWidth(this.bounds.height) :
                      this.splitter.getPreferredHeight(this.bounds.width);
        if (this.splitter.shouldLayout()) {
            if (this.attributes.orientation == th.HORIZONTAL) {
                this.splitter.bounds = { x: this.bounds.width - slength, y: 0, height: this.bounds.height, width: slength }; 
            } else {
                this.splitter.bounds = { x: 0, y: this.bounds.height - slength, height: slength, width: this.bounds.width };
            }
        } else {
            slength = 0;
        }

        // only the first non-splitter child is laid out
        if (childrenWithoutSplitter.length > 0) {
            if (this.attributes.orientation == th.HORIZONTAL) {
                childrenWithoutSplitter[0].bounds = { x: 0, y: 0, height: this.bounds.height, width: this.bounds.width - slength };
            } else {
                childrenWithoutSplitter[0].bounds = { x: 0, y: 0, height: this.bounds.height - slength, width: this.bounds.width };
            }
        }
    }
});

/*
    A component that allocates all visible space to two or more nested regions.
 */
dojo.declare("th.components.SplitPanel", th.components.Panel, {
    constructor: function(parms) {
        if (!this.attributes.orientation) this.attributes.orientation = th.HORIZONTAL;

        if (!this.attributes.regions) this.attributes.regions = [{},{}];
    },

    ondragstart: function(e) {
        var container = e.thComponent.parent; // splitter -> splitpanecontainer
        container.region.startSize = container.region.size;
    },

    ondrag: function(e) {
        var container = e.thComponent.parent; // splitter -> splitpanecontainer

        var delta = (this.attributes.orientation == th.HORIZONTAL) ? e.currentPos.x - e.startPos.x : e.currentPos.y - e.startPos.y;

        container.region.size = container.region.startSize + delta;
        this.render();
    },

    ondragstop: function(e) {
        var container = e.thComponent.parent; // splitter -> splitpanecontainer
        delete container.region.startSize;
    },

    layout: function() {
        this.remove(this.children); // remove any of the existing region panels

        /*
           iterate through each region, performing a couple of tasks:
            - create a container for each region if it doesn't already have one
            - put the value of the contents property of region into the container if necessary
            - hide the splitter on the last region
         */
        var i;
        for (i = 0; i < this.attributes.regions.length; i++) {
            var region = this.attributes.regions[i];
            if (!region.container) {
                region.container = new th.components.SplitPanelContainer({ attributes: { orientation: this.attributes.orientation }, label: region.label });

                region.container.region = region;   // give the container a reference back to the region

                // capture the start size of the region when the nib's drag starts
                this.bus.bind("dragstart", region.container.splitter, this.ondragstart, this);
                this.bus.bind("drag", region.container.splitter, this.ondrag, this);
                this.bus.bind("dragstop", region.container.splitter, this.ondragstop, this);
            }

            // update the content panel for the split panel container
            if (region.contents && (region.contents != region.container.getContents())) {
                region.container.removeAll();
                region.container.add(region.contents);
            }

            // make the last container's splitter invisible
            if (i == this.attributes.regions.length - 1) region.container.splitter.style.display = "none";

            this.add(region.container);
        }

        var containerSize = (this.attributes.orientation == th.HORIZONTAL) ? this.bounds.width : this.bounds.height;

        // size the regions
        var totalSize = 0;
        for (i = 0; i < this.attributes.regions.length; i++) {
            var r = this.attributes.regions[i];

            if (!r.size) {
                r.size = (this.attributes.defaultSize || (100 / this.attributes.regions.length) + "%");
            }

            if (th.helpers.isPercentage(r.size)) {
                // percentage lengths are allowed, but will be immediately converted to pixels
                r.size = Math.floor((parseInt(r.size) / 100) * containerSize); 
            }

            // enforce a minimum width
            if (r.size < 30) r.size = 30;

            totalSize += r.size;
        }
        if (totalSize > containerSize) {   // if the regions are bigger than the split pane size, shrink 'em, right-to-left
            var diff = totalSize - containerSize;
            for (i = this.attributes.regions.length - 1; i >= 0; i--) {
                var r = this.attributes.regions[i];

                var originalSize = r.size;
                r.size -= diff;
                if (r.size < 30) r.size = 30;
                diff -= (originalSize - r.size);

                if (diff <= 0) break;
            }
        } else if (totalSize < containerSize) {    // if the regions are smaller, grow 'em, all in the last one
            this.attributes.regions[this.attributes.regions.length - 1].size += (containerSize - totalSize);
        }

        var startPx = 0;
        for (i = 0; i < this.attributes.regions.length; i++) {
            var region = this.attributes.regions[i];
            if (this.attributes.orientation == th.HORIZONTAL) {
                region.container.bounds = { x: startPx, y: 0, width: region.size, height: this.bounds.height };
            } else {
                region.container.bounds = { x: 0, y: startPx, width: this.bounds.width, height: region.size };
            }
            startPx += region.size;

        }        
    }
});

dojo.declare("th.components.Label", th.components.Panel, {
    constructor: function(parms) { 
        if (!parms) parms = {};
        if (!this.border) this.border = new th.borders.EmptyBorder({ insets: { left: 5, right: 5, top: 2, bottom: 2 }});
        this.attributes.text = parms.text || "";
        if (!this.style.font) this.style.font = "12pt Arial";
        if (!this.style.color) this.style.color = "black"; 
    },

    styleContext: function(ctx) {
        if (!ctx) return;

        ctx.font = this.style.font;
        ctx.fillStyle = this.style.color;
        
        return ctx;
    },

    getPreferredWidth: function(height) {
        var ctx = this.styleContext(this.parent.getScratchContext());

        // the +2 is to compensate for anti-aliasing on Windows, which isn't taken into account in measurements; this fudge factor should eventually become platform-specific
        var w = ctx.measureText(this.attributes.text).width + 2;
        return w + this.getInsets().left + this.getInsets().right;
    },

    getPreferredHeight: function(width) {
        var ctx = this.styleContext(this.parent.getScratchContext());
        var h = Math.floor(ctx.measureText(this.attributes.text).ascent * 1.5);   // multiplying by 2 to fake a descent and leading
        return h + this.getInsets().top + this.getInsets().bottom;
    },

    paint: function(ctx) {
        var d = this.d();

        if (this.style.backgroundColor) {
            // this is broken as a lot of things are moving at the moment
            if(!dojo.isObject(this.stlyes)) {
                this.styles = {};
            }
            this.styles["background-color"] = this.style.backgroundColor;
            this.inherited(arguments); 
        } 

        this.styleContext(ctx);

        var textMetrics = ctx.measureText(this.attributes.text);

        var textToRender = this.attributes.text;
        var lastLength = textToRender.length - 2;
        while (textMetrics.width > (d.b.w - d.i.w)) {
            if (lastLength == 0) {
                textToRender = "...";
                break;
            }

            var left = Math.floor(lastLength / 2);
            var right = left + (lastLength % 2);
            textToRender = this.attributes.text.substring(0, left) + "..." + this.attributes.text.substring(this.attributes.text.length - right);
            textMetrics = ctx.measureText(textToRender);

            lastLength -= 1;
        }

        var y = this.getInsets().top + textMetrics.ascent;
        if (dojo.isWebKit) y += 1;  // strings are one pixel too high in Safari 4 and Webkit nightly

        ctx.fillText(textToRender, this.getInsets().left, y);
    }
});

dojo.declare("th.components.ExpandingInfoPanel", th.components.Panel, {
    getMinimumRowHeight: function() {
        return 40;
    },

    getMinimumColumnWidth: function() {
        
    },

    layout: function() {
        if (this.children.length == 0) return;

        var d = this.d();


        var rows = Math.floor(Math.sqrt(this.children.length));
        var height = Math.floor(d.b.h / rows);
        while (height < this.getMinimumRowHeight() && rows > 1) {
            rows--;
            height = Math.floor(d.b.h / rows); 
        }


        var perRow = Math.floor(this.children.length / rows);
        var remainder = this.children.length % rows;

        // TODO: verify a minimum height (and perhaps width)

        var currentChild = 0;
        var heightRemainder = d.b.h % rows;

        var currentY = 0;
        for (var i = 0; i < rows; i++) {
            var h = (i == rows - 1) ? height + heightRemainder : height;

            var cols = (remainder > 0) ? perRow + 1 : perRow;
            remainder--;

            var width = Math.floor(d.b.w / cols);
            var widthRemainder = d.b.w % cols;

            var currentX = 0;
            for (var z = 0; z < cols; z++) {
                var w = (z == cols - 1) ? width + widthRemainder : width;
                this.children[currentChild++].bounds = { x: currentX, y: currentY, width: w, height: h };
                currentX += w;
            }
            currentY += h;
        }
    }
});

dojo.declare("th.components.List", th.Container, {
    constructor: function(parms) {
        if (!parms) parms = {};

        this.items = parms.items || [];

        this.scrollTop = 0;
        
        this.allowDeselection = parms.allowDeselection || false;

        this.bus.bind("mousedown", this, this.onmousedown, this);  
        
        this.renderer = new th.components.Label({ style: { border: new th.borders.EmptyBorder({ size: 3 }) }});
        
        if (parms.topLabel) {
            this.label = parms.topLabel;
            this.label.height = 16;
        }
    },

    onmousedown: function(e) {
        var item = this.getItemForPosition({ x: e.componentX, y: e.componentY });
        if (item != this.selected) {
            if (item) {
                this.selected = item; 
                this.bus.fire("itemselected", { container: this, item: this.selected }, this); 
                this.repaint();
            } else if(this.allowDeselection)  {
                delete this.selected;
            }
        }
    },
    
    // be carefull! This does NOT fire the "itemselected" event!!!
    selectItemByText: function(text) {        
        if (this.items.length == 0)  return false;
        var item = null;
        if (dojo.isObject(this.items[0])) {
            for(var x = 0; x < this.items.length; x++) {
                if(this.items[x].name == text) {
                    item = this.items[x];
                    break;
                }
            }
            if (item == null)    return false;
        } else {
            if(this.items.indexOf(text) == -1)   return false;
            item = this.items[this.items.indexOf(text)];
        }

        if (this.selected != item) {
            this.selected = item;
            this.repaint();   
        }

        return true;
    },
    
    moveSelectionUp: function() {
        if (!this.selected || this.items.length == 0) return;
        
        var x = 0;
        while (this.items[x] != this.selected) {
            x ++;
        }
        
        if (x != 0) {
            this.selected = this.items[x - 1];
            this.bus.fire("itemselected", { container: this, item: this.selected }, this); 
            this.repaint();           
        }
    },
     
    moveSelectionDown: function() {
        if (!this.selected || this.items.length == 0) return;

        var x = 0;
        while (this.items[x] != this.selected) {
            x ++;
        }

        if (x != this.items.length - 1) {
            this.selected = this.items[x + 1];
            this.bus.fire("itemselected", { container: this, item: this.selected }, this); 
            this.repaint();           
        }
    },

    getItemForPosition: function(pos) {
        pos.y += this.scrollTop - (this.label ? this.label.height : 0);
        var y = this.getInsets().top;
        for (var i = 0; i < this.items.length; i++) {
            var h = this.heights[i];
            if (pos.y >= y && pos.y <= y + h) return this.items[i];
            y += h;
        }
    },

    getRenderer: function(rctx) {
        this.renderer.attributes.text = rctx.item.toString();
        this.renderer.style.font = this.style.font;
        this.renderer.style.color = this.style.color;
        this.renderer.selected = rctx.selected;
        this.renderer.item = rctx.item;
        return this.renderer;
    },
    
    getRenderContext: function(item, row) {
        return { item: item, even: row % 2 == 0, selected: this.selected == item };
    },

    getRowHeight: function() {
        if (!this.rowHeight) {
            var d = this.d();
            var firstItem = (this.items.length > 0) ? this.items[0] : undefined;
            if (firstItem) {
                var renderer = this.getRenderer(this.getRenderContext(firstItem, 0));
                this.add(renderer);
                this.rowHeight = renderer.getPreferredHeight(d.b.w - d.i.w);
                this.remove(renderer);
            }
        }
        return this.rowHeight || 0;
    },

    getScrollInfo: function() {
        return { scrollTop: this.scrollTop, scrollHeight: this.getRowHeight() * this.items.length }
    },

    paint: function(ctx) {
        var d = this.d();
        
        var paintHeight = Math.max(this.getScrollInfo().scrollHeight, d.b.h);
        var scrollInfo = this.getScrollInfo();

        ctx.save();        
        
        if (this.label) {
            var prefHeight = this.label.height;
            this.label.bounds = { y: y, x: d.i.l, height: prefHeight, width: d.b.w };
            this.label.paint(ctx);
            d.i.t = prefHeight;
        }
        
        ctx.translate(0, -this.scrollTop);

        try {
            if (this.style.backgroundColor) {
                ctx.fillStyle = this.style.backgroundColor;
                ctx.fillRect(0, d.i.t, d.b.w, paintHeight);
            }

            if (this.style.backgroundColorOdd) {
                var rowHeight = this.rowHeight;
                if (!rowHeight) {
                    var firstItem = (this.items.length > 0) ? this.items[0] : undefined;
                    if (firstItem) {
                        var renderer = this.getRenderer(this.getRenderContext(firstItem, 0));
                        this.add(renderer);
                        rowHeight = renderer.getPreferredHeight(d.b.w - d.i.w);
                        this.remove(renderer);
                    }
                }
                if (rowHeight) {
                    var y = d.i.t + rowHeight;
                    ctx.fillStyle = this.style.backgroundColorOdd;
                    while (y < paintHeight) {
                        ctx.fillRect(d.i.l, y, d.b.w - d.i.w, rowHeight);
                        y += rowHeight * 2;
                    }
                }
            }

            if (this.items.length == 0) return;

            if (!this.renderer) {
                console.log("No renderer for List of type " + this.declaredClass + " with id " + this.id + "; cannot paint contents");
                return;
            }


            this.heights = [];
            var y = d.i.t;
            for (var i = 0; i < this.items.length; i++) {
                var stamp = this.getRenderer(this.getRenderContext(this.items[i], i));
                if (!stamp) break;

                this.add(stamp);

                var w = d.b.w - d.i.w;
                var h = (this.rowHeight) ? this.rowHeight : stamp.getPreferredHeight(w);
                this.heights.push(h);
                stamp.bounds = { x: 0, y: 0, height: h, width: w };

                ctx.save();
                ctx.translate(d.i.l, y);
                ctx.beginPath();
                ctx.rect(0, 0, w, h);
                ctx.closePath();
                ctx.clip();

                stamp.paint(ctx);

                ctx.restore();

                this.remove(stamp);

                y+= h;
            }
        } finally {
            ctx.restore();
        }
    }
});

dojo.declare("th.components.HorizontalTree", th.Container, {
    constructor: function(parms) {
        if (!parms) parms = {};
        if (!this.style.defaultSize) this.style.defaultSize = 150;

        this.attributes.orientation = th.HORIZONTAL;

        this.lists = [];
        this.splitters = [];
        this.listWidths = [];
    },

    setData: function(data) {
        for (var i = 0; i < this.lists.length; i++) {
            this.remove(this.lists[i]);
            this.remove(this.splitters[i]);
            this.bus.unbind(this.lists[i]);
            this.bus.unbind(this.splitters[i]);
        }
        this.lists = [];
        this.splitters = [];

        this.data = data;
        this.showChildren(null, data);
    },

    ondragstart: function(e) {
        var splitterIndex = this.splitters.indexOf(e.thComponent);
        this.startSize = this.listWidths[splitterIndex];
    },

    ondrag: function(e) {
        var splitterIndex = this.splitters.indexOf(e.thComponent);
        var delta = (this.attributes.orientation == th.HORIZONTAL) ? e.currentPos.x - e.startPos.x : e.currentPos.y - e.startPos.y;
        this.listWidths[splitterIndex] = this.startSize + delta;
        this.render();
    },

    ondragstop: function(e) {
        delete this.startSize;
    },

    updateData: function(parent, contents) {
        parent.contents = contents;
        if (this.getSelectedItem() == parent) {
            this.showChildren(parent, parent.contents);
        }
    },
    
    replaceList: function(index, contents) {
        this.lists[index].items = contents;
        delete this.lists[index].selected;
        this.render();
    },
    
    removeListsFrom: function(index) {
        for (var x = index; x < this.lists.length; x++)
        {
            this.bus.unbind(this.lists[x]);
            this.bus.unbind(this.splitters[x]);

            this.remove(this.lists[x]);
            this.remove(this.splitters[x]);            
        }
        
        this.lists = this.lists.slice(0, index);
        this.splitters = this.splitters.slice(0, index);        
    },

    showChildren: function(newItem, children) {
        if (this.details) {
            this.remove(this.details);
            delete this.details;
        }

        if (!dojo.isArray(children)) {
            // if it's not an array, assume it's a function that will load the children
            children(this.getSelectedPath(), this);
            return;
        }

        if (!children || children.length == 0) return;
        var list = this.createList(children);
        list.id = "list " + (this.lists.length + 1);

        this.bus.bind("itemselected", list, this.itemSelected, this);
        var tree = this;
        this.bus.bind("dblclick", list, function(e) {
            tree.bus.fire("dblclick", e, tree);
        });
        this.lists.push(list);
        this.add(list);

        var splitter = new th.components.Splitter({ attributes: { orientation: th.HORIZONTAL }, scrollbar: new th.components.Scrollbar() });
        splitter.scrollbar.style = this.style;
        splitter.scrollbar.scrollable = list;
        splitter.scrollbar.opaque = false;
        this.bus.bind("dragstart", splitter, this.ondragstart, this);
        this.bus.bind("drag", splitter, this.ondrag, this);
        this.bus.bind("dragstop", splitter, this.ondragstop, this);
        
        this.splitters.push(splitter);
        this.add(splitter);

        if (this.parent) this.render();
    },

    showDetails: function(item) {
        if (this.details) this.remove(this.details);

//            var panel = new Panel({ style: { backgroundColor: "white" } });
//            var label = new Label({ text: "Some details, please!" });
//            panel.add(label);
//            this.details = panel;
//            this.add(this.details);

        if (this.parent) this.repaint();
    },

    createList: function(items) {
        var list = new th.components.List({ items: items, style: this.style });
        if (this.renderer) list.renderer = this.renderer;
        list.oldGetRenderer = list.getRenderer;
        list.getRenderer = function(rctx) {
            var label = list.oldGetRenderer(rctx);
            label.attributes.text = rctx.item.name;
            return label;
        }
        return list;
    },

    getSelectedItem: function() {
        var selected = this.getSelectedPath();
        if (selected.length > 0) return selected[selected.length - 1];
    },

    getSelectedPath: function(asString) {
        asString = asString || false;
        var path = [];

        for (var i = 0; i < this.lists.length; i++) {
            if (this.lists[i].selected) {
                path.push(this.lists[i].selected);
            } else {
                break;
            }
        }

        if (path.length == 0) return;

        if (asString) {
            var result = '';
            for (var i = 0; i < path.length - 1; i++) {
                result += path[i].name + '/';
            }
            if (!path[path.length - 1].contents) {
                result += path[path.length - 1].name
            } else {
                result += path[path.length - 1].name + '/';
            }
            
            return result;
        } else {
            return path;   
        }
    },

    itemSelected: function(e) {                 
        var list = e.thComponent;

        // add check to ensure that list has an item selected; otherwise, bail
        if (!list.selected) return; 

        var path = [];

        for (var i = 0; i < this.lists.length; i++) {
            path.push(this.lists[i].selected);
            if (this.lists[i] == list) {
                for (var j = i + 1; j < this.lists.length && this.lists[j].selected; j++) {
                    // saves the last selected item if the user want's to get back to this tree via arrows again
                    this.lists[j - 1].selected.lastSelected = this.lists[j].selected.name
                    delete this.lists[j].selected;
                }
                break;
            }
        }
        
        // fire the event AFTER some items maybe got deselected
        this.bus.fire('itemselected', {e: e}, this);

        if (path.length < this.lists.length) {
            // user selected an item in a previous list; must ditch the subsequent lists
            var newlists = this.lists.slice(0, path.length);
            var newsplitters = this.splitters.slice(0, path.length);
            for (var z = path.length; z < this.lists.length; z++) {
                this.bus.unbind(this.lists[z]);
                this.bus.unbind(this.splitters[z]);

                this.remove(this.lists[z]);
                this.remove(this.splitters[z]);
            }
            this.lists = newlists;
            this.splitters = newsplitters;
        }

        // determine whether to display new list of children or details of selection
        var newItem = path[path.length-1];
        if (newItem && newItem.contents) {
            this.showChildren(newItem, newItem.contents);
        } else {
            this.showDetails(newItem);
        }
    },

    getItem: function(pathToItem) {
        var items = this.data;
        var item;
        for (var i = 0; i < pathToItem.length; i++) {
            for (var z = 0; z < items.length; z++) {
                if (items[z] == pathToItem[i]) {
                    item = items[z];
                    items = item.contents;
                    break;
                }
            }
        }
        return item;
    },

    layout: function() {
        var d = this.d();

        var x = d.i.l;
        for (var i = 0; i < this.lists.length; i++) {
            var list = this.lists[i];
            if (!this.listWidths) this.listWidths = [];
            if (!this.listWidths[i]) this.listWidths[i] = this.style.defaultSize;
            var w = this.listWidths[i];
            list.bounds = { x: x, y: d.i.t, width: w, height: d.b.h - d.i.h };

            x += w;

            var splitter = this.splitters[i];
            w = splitter.getPreferredWidth(-1);
            splitter.bounds = { x: x, y: d.i.t, width: w, height: d.b.h - d.i.h };
            x += w;

        }

        if (this.details) {
            this.details.bounds = { x: x, y: d.i.t, width: 150, height: d.b.h - d.i.h };
        }
    },

    paintSelf: function(ctx) {
        var d = this.d();

        if (this.style.backgroundColor) {
            ctx.fillStyle = this.style.backgroundColor;
            ctx.fillRect(0, 0, d.b.w, d.b.h);
        }
    }
});

dojo.declare("th.components.WindowBar", th.Container, {
    constructor: function(parms) {
        if (!parms) parms = {};
         
        function loadImg(url) {
            var img = new Image();
            img.src = url;
            return img;            
        }

        this.imgBackgroundRight = loadImg('../images/window_top_right.png');
        this.imgBackgroundMiddle = loadImg('../images/window_top_middle.png');
        this.imgBackgroundLeft = loadImg('../images/window_top_left.png');

        this.label = new th.components.Label({ text: parms.title || 'NO TEXT', style: { color: "white", font: "8pt Tahoma" } });
        this.label.getInsets = function(){
            return { top: 4, left: 6};
        }

        this.imgCloseButton = loadImg('../images/icn_close_x.png');
        this.closeButton = new th.components.Button({style: { backgroundImage: this.imgCloseButton}});

        this.add(this.label, this.closeButton);

        this.bus.bind('mousedown', this.closeButton, dojo.hitch(this, function() {
            this.parentWindow.toggle();
            delete this.startValue;
        }));
        
        // make the window dragable :)
        this.bus.bind("mousedown", this, this.onmousedown, this);
        this.bus.bind("mouseup", this, this.onmouseup, this);
        // this event is connected to the window itself, as sometimes the mouse gets outside the WindowBar, event the 
        // mouse is still pressed. This version is working even then right.
        dojo.connect(window, "mousemove", dojo.hitch(this, this.onmousemove));  
    },

    onmousedown: function(e) {
        this.startValue = { mouse: { x: e.clientX, y: e.clientY }, window: this.parentWindow.getPosition() };
    },

    onmousemove: function(e) {
        if (this.startValue) {
            var s = this.startValue;
            var x = s.window.x - (s.mouse.x - e.clientX);
            var y = s.window.y - (s.mouse.y - e.clientY);
            this.parentWindow.move(x, y);
            
            dojo.stopEvent(e);
        }
    },

    onmouseup: function(e) {
        delete this.startValue;
    },
    
    getPreferredHeight: function() {
        return 21;
    },
    
    layout: function() {
        var d = this.d();
        var lh = this.label.getPreferredHeight(d.b.w - 30);
        this.label.bounds = { y: 0, x: 3, height: lh, width: d.b.w - 20 };
        this.closeButton.bounds = { x: d.b.w -14, y: 6 , height: 8, width: 8};
    },
    
    paint: function(ctx) {
        var d = this.d();
        
        ctx.drawImage(this.imgBackgroundLeft, 0, 0);
        ctx.drawImage(this.imgBackgroundMiddle, 3, 0, d.b.w - 6, 21);
        ctx.drawImage(this.imgBackgroundRight, d.b.w - 3, 0);
        
        this.label.paint(ctx);
        ctx.drawImage(this.imgCloseButton, d.b.w -14 , 6);            
    }
});

dojo.declare("th.components.WindowPanel", th.components.Panel, {
    constructor: function(title, userPanel) {
        if (!userPanel) {
            console.error('The "userPanel" must be given!');
            return;
        }
        
        this.userPanel = userPanel;
        this.windowBar = new th.components.WindowBar({title: title});
        this.add([this.windowBar, this.userPanel]);
        
        // this is a closed container
        delete this.add;
        delete this.remove;
    },
    
    layout: function() {
        var d = this.d();
        this.width = d.b.w;
        this.height = d.b.h;
        var y = this.windowBar.getPreferredHeight();
        this.windowBar.bounds = { x: 0, y: 0 , height: y, width: d.b.w };
        this.userPanel.bounds = { x: 1, y: y , height: d.b.h - y - 1, width: d.b.w - 2 };
    },
    
    paintSelf: function(ctx) {      
        ctx.lineWidth = 2;
        ctx.strokeStyle = "black";
        
        ctx.strokeStyle = "#2E1F1A";
        ctx.strokeRect(0, 0, this.width, this.height);
    }
});

}

if(!dojo._hasResource["bespin.editor.component"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["bespin.editor.component"] = true;
dojo.provide("bespin.editor.component");










































 // -- Thunderhead... hooooo






// = Editor Component =
//
// This is a component that you can use to embed the Bespin Editor component anywhere you wish.
//
// There are a set of options that you pass in, as well as the container element
//
// * {{{loadfromdiv}}} : Take the innerHTML from the given div and load it into the editor
// * {{{content}}} : Feed the editor the string as the initial content (loadfromdiv trumps this)
// * {{{language}}} : The given syntax highlighter language to turn on (not people language!)
// * {{{dontstealfocus}}} : by default the component will steal focus when it loads, but you can change that by setting this to true

dojo.declare("bespin.editor.Component", null, {
    // ** {{{ constructor }}} **
    //
    // Takes a container element, and the set of options for the component which include those noted above.
    constructor: function(container, opts) {
        opts.actsAsComponent = true;

        var initialcontent;
        if (opts.loadfromdiv) {
            if (dojo.byId('BESPIN_EDITOR_CODE')) {
                var code = dojo.byId('BESPIN_EDITOR_CODE');
                initialcontent = code.value;
            } else {
                initialcontent = dojo.byId(container).innerHTML;
            }
        } else if (opts.content) {
            initialcontent = opts.content;
        }

        this.editor = bespin.register('editor', opts.editor || new bespin.editor.API(container, opts));
        this.editSession = bespin.register('editSession', opts.editSession || new bespin.client.session.EditSession(this.editor));
        this.server = bespin.register('server', opts.server || new bespin.client.Server());
        this.files = bespin.register('files', opts.files || new bespin.client.FileSystem());

        // Fancy a command line anyone?
        if (opts.commandline) {
            
            
            

            var commandlineElement;

            if (typeof opts.commandline == "boolean") { // literally, true
                commandlineElement = dojo.create("div", {
                   id: "commandlinewrapper",
                   hidden: true,
                }, dojo.body());
                commandlineElement.innerHTML = '<table style="display: none;" cellpadding="0"><tr><td id="prompt"><img id="promptimg" src="https://bespin.mozilla.com/images/icn_command.png" alt=">" ></td><td id="commandline"><input id="command" spellcheck="false"></td></tr></table>';
            } else {
                commandlineElement = dojo.byId(opts.commandline);
            }

            this.commandLine = bespin.register('commandLine', new bespin.cmd.commandline.Interface(commandlineElement, bespin.cmd.editorcommands.Commands));
        }

        // Use in memory settings here instead of saving to the server which is default. Potentially use Cookie settings
        bespin.register('settings', opts.settings || new bespin.client.settings.Core(bespin.client.settings.InMemory));

        // How about a Jetpack?
        if (opts.jetpack) {
            var jetpacktoolbar = dojo.create("div", {
                id: "jetpacktoolbar"
            }, dojo.byId(container));

            jetpacktoolbar.innerHTML = '<div class="button"><button id="install" onclick="_editorComponent.executeCommand(\'jetpack install yourfirstjetpack\')">&uarr; Install This JetPack Feature</button></div>\
            <div>Hey, <a href="https://jetpack.mozillalabs.com/">install JetPack first</a>.</div>\
            <style type="text/css">\
                #jetpacktoolbar {\
                    position: relative;\
                    top: -15px;\
                    left: 0;\
                    height: 40px;\
                    background-image: url(https://bespin.mozilla.com/images/footer_bg.png);\
                    background-repeat: repeat-x;\
                    color: white;\
                    font-family: Helvetica, Arial, sans-serif;\
                    font-size: 11px;\
                }\
                #jetpacktoolbar div {\
                    padding: 17px 12px;\
                    float: left;\
                }\
                #jetpacktoolbar div.button {\
                    float: right;\
                    padding: 13px 0;\
                }\
                #jetpacktoolbar button {\
                    margin:0 7px 0 0;\
                }\
                #jetpacktoolbar a {\
                    color: #eee;\
                }\
            </style>';
        }

        dojo.connect(window, 'resize', opts.resize || dojo.hitch(this, function() {
            this.editor.paint();
        }));

        if (initialcontent) {
            this.setContent(initialcontent);
        }

        if (opts.language) { // -- turn on syntax highlighting
            bespin.publish("settings:language", { language: opts.language });
        }

        if (!opts.dontstealfocus) {
            this.editor.canvas.focus();
        }

        if (opts.set) { // we have generic settings
            for (var key in opts.set) {
                if (opts.set.hasOwnProperty(key)) {
                    this.set(key, opts.set[key]);
                }
            }
        }
    },

    // ** {{{ getContent }}} **
    //
    // Returns the contents of the editor
    getContent: function() {
        return this.editor.model.getDocument();
    },

    // ** {{{ setContent }}} **
    //
    // Takes the content and inserts it fresh into the document
    setContent: function(content) {
        return this.editor.model.insertDocument(content);
    },

    // ** {{{ setFocus(bool) }}} **
    //
    // If you pass in true, focus will be set on the editor, if false, it will not.
    setFocus: function(bool) {
        return this.editor.setFocus(bool);
    },

    // ** {{{ setLineNumber }}} **
    //
    // Pass in the line number to jump to (and refresh)
    setLineNumber: function(linenum) {
        bespin.publish("editor:moveandcenter", {
            row: linenum
        });
    },

    // ** {{{ setLineNumber }}} **
    //
    // Talk to the Bespin settings structure and pass in the key/value
    set: function(key, value) {
        bespin.publish("settings:set", {
           key: key,
           value: value
        });
    },

    // ** {{{ onchange }}} **
    //
    // Track changes in the document
    onchange: function(callback) {
        bespin.subscribe("editor:document:changed", callback);
    },

    // ** {{{ bindKey }}} **
    //
    // Given the options that should contain a modifier, key, and action.
    //
    // For example,
    //
    // {
    //   modifiers: "ctrl",
    //   key: "b",
    //   action: "moveCursorLeft"
    // }
    bindKey: function(opts) {
        bespin.publish("editor:bindkey", opts);
    },

    // ** {{{ executeCommand }}} **
    //
    // Execute a given command
    executeCommand: function(command) {
        try {
            this.commandLine.executeCommand(command);
        } catch (e) {
            // catch the command prompt errors
        }
    }
});


}

	//INSERT dojo.i18n._preloadLocalizations HERE

	if(dojo.config.afterOnLoad && dojo.isBrowser){
		//Dojo is being added to the page after page load, so just trigger
		//the init sequence after a timeout. Using a timeout so the rest of this
		//script gets evaluated properly. This work needs to happen after the
		//dojo.config.require work done in dojo._base.
		window.setTimeout(dojo._loadInit, 1000);
	}

})();

