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
 * The Original Code is Raindrop.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Messaging, Inc..
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * */

/*jslint plusplus: false, nomen: false */
/*global require: false, setTimeout: false, location: false, console: false */
"use strict";

//This block needs to be outside the require() call so that modifiers are set up
//before any dependency resolution is attempted.
(function () {
    //Call require.modify to set up all extensions that might alter some other code.
    //THIS CODE ASSUMES IT IS TIED TO THE DEFAULT require CONTEXT.
    var reqExts = require.s.contexts._.config.rd.exts, i, reqExt, prop, modifier, empty = {};

    if (reqExts) {
        for (i = 0; (reqExt = reqExts[i]); i++) {
            for (prop in reqExt) {
                //TODO: take out the dot indexOf check some time down the road,
                //just leaving it in there for now so we do not register old
                //ui extension schema data (so people do not have to dump their
                //DB right away). Just keep it in for a while until everyone has
                //had a chance to delete their DB for other reasons.
                if (!(prop in empty) && reqExt[prop].indexOf(".") === -1) {
                    modifier = {};
                    modifier[prop] = reqExt[prop];
                    require.modify(modifier);
                }
            }
        }
    }
}());

require.def("rd",
["require", "dojo", "dijit", "dojox", "dojo/data/ItemFileReadStore", "dojo/string",
"dojox/encoding/base64", "dojo/NodeList-traverse", "dojo/NodeList-manipulate"],
function (require, dojo, dijit, dojox) {
    /*
    This file provides some basic environment services for raindrop.
    */

    //Delegate to native JSON parsing where available.
    if (typeof JSON !== "undefined" && JSON.parse) {
        dojo.fromJson = function (text) {
            return JSON.parse(text);
        };
    }
    
    //Add ok and error as aliases for methods on dojo.Deferred.
    if (dojo.Deferred) {
        dojo.Deferred.prototype.ok = dojo.Deferred.prototype.addCallback;
        dojo.Deferred.prototype.error = dojo.Deferred.prototype.addErrback;
    }
    
    //Override a function in dojo so that we can cancel publish calls by returning false
    //from a listener.
    dojo._listener.getDispatcher = function () {
        // following comments pulled out-of-line to prevent cloning them 
        // in the returned function.
        // - indices (i) that are really in the array of listeners (ls) will 
        //         not be in Array.prototype. This is the 'sparse array' trick
        //         that keeps us safe from libs that take liberties with built-in 
        //         objects
        // - listener is invoked with current scope (this)
        return function () {
            var ap = Array.prototype, c = arguments.callee, ls = c._listeners, t = c.target,
                // return value comes from original target function
                r = t && t.apply(this, arguments),
                // make local copy of listener array so it is immutable during processing
                lls = [].concat(ls),
                i;
            
            // invoke listeners after target function
            for (i in lls) {
                if (!(i in ap)) {
                    //RAINDROP change to handle return type.
                    if (lls[i].apply(this, arguments) === false) {
                        break;
                    }
                }
            }
            // return value comes from original target function
            return r;
        };
    };        

    var rd = {}, i, subs = require.config.rd.subs,
        extSubs = {}, subObj,
        extSubHandles = {},
        empty = {},
        topic, ext;

    dojo.mixin(rd, {
        //Set path to the raindrop database
        dbPath: require.config.rd.dbPath,

        //Set app name for sure in configuration/preferences
        appName: require.config.rd.appName,

        uiExtId: "rd.ui.rd",

        /**
         * applies a binary function to an array from left
         * to right using a seed value as a starting point; returns the final
         * value. (Taken from dojox.lang.functional.fold.foldl)
         * @param {Array} a
         * @param {Function} f
         * @param {Object} z
         * @param {Object} [o]
         */
        reduce: function (a, f, z, o) {
            // summary: repeatedly 
            o = o || dojo.global;
            var i, n;
            for (i = 0, n = a.length; i < n; z = f.call(o, z, a[i], i, a), ++i) {}
            return z;        // Object
        },

        /**
         * Converts html string to a DOM node or DocumentFragment. Optionally
         * places that node/fragment relative refNode. "position" values are same as
         * dojo.place: "first" and "last" indicate positions as children of refNode,
         * "replace" replaces refNode, "only" replaces all children.        "before" and "last"
         * indicate sibling positions to refNode. position defaults to "last" if not specified.
         * @param {String} html
         * @param {DOMNode} [refNode] Where to place the HTML.
         * @param {String} [position] The relation of the HTML to the refNode.
         */
        html: function (html, refNode, position) {
            //summary: 
            html = dojo._toDom(html);
            if (refNode) {
                return dojo.place(html, refNode, position);
            } else {
                return html;
            }
        },

        /**
         * escapes HTML string so it is safe to embed in the DOM. Optionally
         * places that HTML relative refNode. "position" values are same as
         * dojo.place: "first" and "last" indicate positions as children of refNode,
         * "replace" replaces refNode, "only" replaces all children. "before" and "last"
         * indicate sibling positions to refNode. position defaults to "last" if not specified.
         * @param {String} html
         * @param {DOMNode} [refNode] Where to place the HTML.
         * @param {String} [position] The relation of the HTML to the refNode.
         */
        escapeHtml: function (/*String*/html, /*DOMNode?*/refNode, /*String?*/position) {
            //summary: 
            html = html && html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            if (refNode) {
                var name = refNode.nodeName.toLowerCase();
                //If an input/textarea, just set value to the html,
                //otherwise do fancy html placement options.
                if (name === "input" || name === "textarea") {
                    return (refNode.value = html);
                } else {
                    return rd.html(html, refNode, position);
                }
            } else {
                return html;
            }
        },        

        template: dojo.string.substitute,

        /**
         * Returns a base64 string encoding of the JS object
         * @param {Object} obj if obj is a string, it will just be encoded,
         * otherwise, dojo.toJson() will be used to convert the object to
         * a string. For any value, all line returns are stripped before encoding.
         */
        toBase64: function (obj) {
            var key = (typeof obj === "string" ? obj : dojo.toJson(obj)),
                byteKey = this.stringToBytes(key.replace(/\n/g, ""));
            return dojox.encoding.base64.encode(byteKey);
        },

        stringToBytes: function (s) {
            //utility to convert string to bytes. :)
            var b = [], i;
            for (i = 0; i < s.length; ++i) {
                b.push(s.charCodeAt(i));
            }
            return b;
        },

        /**
         * Creates a dojo.data.ItemFileReadStore for an array of objects.
         * @param {Array} items array of objects for the store.
         * @param {String} identifier the property to use on the objects.
         * in the items array as an ID for the object
         * @param {String} label the property
         * to use on the objects in the array to get the label for the object.
         * @returns {dojo.data.ItemFileReadStore}
         */
        toIfrs: function (items, identifier, label) {
            //
            var data = {
                items: items
            };

            if (identifier) {
                data.identifier = identifier;
            }
            if (label) {
                data.label = label;
            }

            return new dojo.data.ItemFileReadStore({
                data: data
            });
        },

        /**
         * Shortcut methods for dojo.publish and subscribe. rd.pub more aesthetically pleasing
         * than dojo.publish because it does not force the parameters to be in an array,
         * but rather as variable number of arguments to rd.pub. Also, rd.sub allows for passing
         * in a extension module name, to allow us to disable the subscription extension on demand.
         * Based on plugd versions of the code: http://code.google.com/p/plugd/source/browse/trunk/base.js
         */
        sub: function (moduleName, topic) {
            //summary: allows for extension modules names to be passed to allow dynamic
            //disable of an extension.
            if (typeof topic === "string") {
                //Extension case.
                var extKey = moduleName + ":" + topic, handle,
                //Convert arguments to an array and strip off the first arg,
                //which is the extension module name.
                    ary = dojo._toArray(arguments);
                ary.shift();
                
                //Store the handle of the subscription to allow disabling.
                //Also store subscription args to allow dynamic subscription
                //if the extension is enabled on the fly.
                handle = dojo.subscribe.apply(dojo, ary);
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
        pub: function () {
            var a = dojo._toArray(arguments);
            return dojo.publish(a.shift(), a);
        },
    
        convertLines: function (text) {
            //Converts line returns to BR tags
            return text && text.replace(/\n/g, "<br>");        
        },

        /**
         * loads a CSS file based on a modulePath. This allows for reskinning
         * by overriding the modulePath via djConfig.modulePaths/dojo.registerModulePath()
         * @param {String} modulePath a dot-separated module path to the resource.
         */
        addStyle: function (modulePath) {
            //summary: 
            var url = require.nameToUrl(modulePath, ".css"), link;
            //Adjust URL a bit so we get dojo.require-like behavior
            link = dojo.create("link", {
                type: "text/css",
                rel: "stylesheet",
                "data-rdstylename": modulePath,
                href: url
            });
            dojo.doc.getElementsByTagName("head")[0].appendChild(link);
        },

        /**
         * Removes the link tag that was associated with the modulePath.
         * The opposite method to addStyle -- needs the same modulePath
         * passed in as it was to addStyle to work.
         * @param {String} modulePath a dot-separated module path to the resource.
         */
        removeStyle: function (modulePath) {
            //summary: 
            dojo.query('[data-rdstylename="' + modulePath + '"]').orphan();
        },

        /**
         * Handles rd.pub calls to extensions for the first time.
         * This function will unregister itself after loading the extension
         * so that this code is only involved with initial loading of an extension.
         */
        onExtPublish: function () {
            var topic = arguments[0],
                //Convert arguments to an array and pull off
                //the topic name since real endpoint subscribers in the
                //extensions will not be expecting it.
                args = dojo._toArray(arguments);
            args.shift();

            //Unsubscribe so this function is not called again
            //for this topic
            dojo.unsub(extSubHandles[topic]);

            //Execute the code to load the extension in a timeout so we can
            //return false from this listener to stop propagating the topic
            //publishing to other listeners. This will help ensure that the loaded
            //code does not get a topic publish twice.
            setTimeout(function () {
                //Load the code
                var modules = extSubs[topic]; //an array
                require(modules, function () {
                    dojo.publish(topic, args);
                });
            }, 20);
    
            //Stop the topic from continuing to notify other listeners
            return false;
        },

        /**
         * Dispatches events on HTML to nearest widget. This allows widgets
         * to implement event handlers without having to do explicit connects
         * and disconnects. For it to work, there should be a data-dclick
         * attribute on the node, with the value being the name of the
         * function to call on the widget. The widget is found by searching
         * up the node's parents finding the first one with a widgetid attribute.
         * The DOM is walked up from the current click to find the first data-dclick
         * attribute, and a node with a widgetid. The DOM will be walked up
         * to find the first widget in the chain that has a method matching
         * data-dclick
         * @param {Event} evt
         */
        onDelegateClick: function (evt) {
            var node = evt.target, click, widgetId, widget;
            //Now find parent widget
            while (node && node.nodeType === 1) {
                if (!widgetId) {
                    widgetId = node.getAttribute("widgetid");
                }
                if (!click) {
                    click = node.getAttribute("data-dclick");
                }
                if (click && widgetId) {
                    widget = dijit.byId(widgetId);
                    if (widget && widget[click]) {
                        widget[click](evt);
                        break;
                    } else {
                        //Keep looking for widgets
                        widgetId = null;
                    }
                }
                node = node.parentNode;
            }
        },

        /**
         * Sets the current page to a fragment ID.
         * @param {String} fragId the fragment ID to use *without* the # symbol.
         */
        setFragId: function (/*String*/fragId) {
            //summary: 
            location.href = "#" + fragId;
        },

        /**
         * Converts a qualifying fragment ID (url #hash value)
         * into a rd-protocol topic. Useful if want to dispatch a protocol
         * topic without changing the page URL.
         * @param {String} fragId the fragment ID to use *without* the # symbol.
         */
        dispatchFragId: function (fragId) {
            var topic = this.getFragIdTopic(fragId);
            if (topic) {
                rd.pub(topic.name, topic.data);
            }
        },

        /**
         * If the topic is a fragment ID that maps to a rd-protocol topic,
         * get the value as a rd-protocol topic.
         * @param {String} fragId the fragment ID to use *without* the # symbol.
         */
        getFragIdTopic: function (fragId) {
            if (fragId && fragId.indexOf("rd:") === 0) {
                //Have a valid rd: protocol link.
                fragId = fragId.split(":");
                var proto = fragId[1];
        
                //Strip off rd: and protocol: for the final
                //value to pass to protocol handler.
                fragId.splice(0, 2);
                if (fragId.length) {
                    return {name: "rd-protocol-" + proto, data: fragId.join(":")};
                } else {
                    return {name: "rd-protocol-" + proto};
                }
            }
            return null;
        },

        //Types of extension wrapping. Similar to aspected oriented advice.
        _extTypes: ["before", "after", "around", "replace", "add", "addToPrototype"],

        _extDisabled: {},
        _exts: {},
        _extSubs: {},
        _extSubArgs: {},

        /**
         * Updates an extension module code to the latest code.
         * Also refreshes target instances if they are being used in the page.
         * @param {String} extName
         * @param {Array} targets
         */
        _updateExtModule: function (extName, targets) {        
            //targets could be an array from another window. In that case, the targets
            //are serialized to json to avoid cross window array goofiness.
            if (typeof targets === "string") {
                targets = dojo.fromJson(targets);
            }

            //If a subscription extension, unsub since reloading the extension
            //will cause a resubscribe.
            var i, key, target, context;
            for (i = 0; (target = targets[i]); i++) {
                key = extName + ":" + target;
                if (rd._extSubArgs[key]) {
                    rd.unsub(rd._extSubs[key]);
                }
            }

            //Force the module reload by tweaking require interals.
            delete require.context.specified[extName];
            delete require.context.defined[extName];

            require([extName], function () {
                //Update instances of targets as appropriate.
                for (var i = 0, target; (target = targets[i]); i++) {
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
            _supportingWidgets: 1,
            nodeType: 1 //to avoid DOM nodes
        },

        /**
         * If the the module is something that can be instantiated
         * and is being shown in the page, update those instances to the new code.
         * @param {String} moduleName
         */
        _updateInstances: function (moduleName) {
            var instances, module;
            if (dijit && dijit.registry &&
                (instances = dijit.registry.byClass(moduleName.replace(/\//g, "."))) &&
                instances.length) {
                module = require(moduleName);

                instances.forEach(dojo.hitch(this, function (instance) {
                    this._updateInstance(instance, module);
                }));
            }
        },

        /**
         * updates a single widget instance with a new instance of the
         * same widget type.
         * @param {Object} instance
         * @param {Function} Ctor
         */
        _updateInstance: function (instance, Ctor) {
            //Build up a list of instance properties. It is an instance property
            //if it differs from the defaultProps
            var initProps = {}, widget = dijit._Widget.prototype, empty = {},
                prop, parentNode, nextSibling, refreshed;
            for (prop in instance) {
                if (!(prop in empty) &&
                    (!(prop in Ctor.prototype) || Ctor.prototype[prop] !== instance[prop])) {
                    //Do not pick up id values or dom nodes, or default widget properties.
                    if (!(prop in widget) && !(prop in rd._skipInstanceProperties)) {
                        initProps[prop] = instance[prop];
                    }
                }
            }

            parentNode = instance.domNode.parentNode;
            nextSibling = instance.domNode.nextSibling;
            //Destroy the old one first in case it is holding on to widgets
            //that will be recreated when new instance is created.
            instance.destroy();
    
            //Make the new instance and place it accordingly.
            refreshed = new Ctor(initProps);
            if (nextSibling) {
                parentNode.insertBefore(refreshed.domNode, nextSibling);
            } else {
                parentNode.appendChild(refreshed.domNode);
            }
        
        },

        /**
         * marks an extension as enabled or disabled. If no value is
         * passed in, then reads the enabled state.
         * @param {String} extName
         * @param {String} moduleName
         * @param {Boolean} [enabled]
         */
        extensionEnabled: function (extName, moduleName, enabled) {
            var key = extName + ":" + moduleName, reqExts, exts, ret;
            if (typeof enabled !== "undefined") {
                //If a subscription enable/disable as appropriate.
                if (rd._extSubArgs[key]) {
                    if (enabled) {
                        rd.sub.apply(rd, rd._extSubArgs[key]);
                    } else {
                        rd.unsub(rd._extSubs[key]);
                    }
                }

                //If the extension is not in the active list update it.
                reqExts = require.config.rd.exts;
                exts = reqExts[moduleName];
                if (!exts) {
                    reqExts[moduleName] = [extName];
                    this.checkLoadExtension(extName, moduleName);
                } else if (dojo.indexOf(exts, extName) === -1) {
                    exts.push(extName);
                    this.checkLoadExtension(extName, moduleName);
                }
        
                ret = rd._extDisabled[key] = !enabled;
        
                //rd.checkLoadExtension could load code asynchronously,
                //so do the following work after waiting for any modules
                //to load.
                require(dojo.hitch(this, function () {
                    //Update instances of the module.
                    rd._updateInstances(moduleName);
                }));

                return ret;
            } else {
                return !rd._extDisabled[key];
            }
        },

        /**
         * if the moduleName is loaded, then load the extName
         * at least once. Should only be called when enabling/disabling extensions
         * that may have not been loaded before.
         * @param {String} extName
         * @param {String} moduleName
         */
        checkLoadExtension: function (extName, moduleName) {
            if (dojo._loadedModules[moduleName] && !dojo._loadedModules[extName]) {
                require([extName]);
            }
        },

        /**
         * Modifies the module object by attaching an extension to it.
         * ASSUMES the module has already been loaded. Each extension should
         * require() load the module it will be extending.
         * @param {String} extName
         * @param {String} moduleName
         * @param {Object} extension
         */
        applyExtension: function (extName, moduleName, extension) {
            var module = require(moduleName),
                extKey = extName + ":" + moduleName,
                existing = rd._exts[extKey] || {},
                empty = {},
                proto = module.prototype,
                i, prop, type, targetObj, extType, extValue;

            rd._exts[extKey] = extension;

            //Cycle through allowed extension types
            for (i = 0; (type = this._extTypes[i]); i++) {
                if (extension[type]) {
                    //For each method for the given extension type, add the extension
                    //function but only if it is not on the existing extension. Filter
                    //out bad code that adds thing to Object.prototype via the empty tests.
                    for (prop in extension[type]) {
                        if (!(prop in empty) && (!existing[type] || !(prop in existing[type]))) {
                            //Figure out if the extension applies to a module method
                            //or a method on the module's prototype.
                            targetObj = module;
                            extType = type;
                            if (type === "addToPrototype") {
                                extType = "add";
                                targetObj = proto;
                            } else {
                                //If the prototype has the property, then favor that over
                                //a module property, if the prototype exists.
                                if (proto && prop in proto) {
                                    targetObj = proto;
                                }
                            }
                    
                            extValue = extension[type];
                            if (targetObj[prop] instanceof Array && extValue[prop] instanceof Array) {
                                //An array extension. Only allow for before or after.
                                if (type === "before") {
                                    targetObj[prop] = extValue[prop].concat(targetObj[prop]);
                                } else {
                                    targetObj[prop] = targetObj[prop].concat(extValue[prop]);
                                }
                            } else if (typeof targetObj[prop] === "object") {
                                //Object extension, so like a mixin. Should only be for simple
                                //properties that are numbers or strings.
                                if (type === "add" || type === "addToPrototype") {
                                    dojo._mixin(targetObj[prop], extValue[prop]);
                                } else {
                                    console.error("Invalid object extension type, '" + type + "', for extension on object " +
                                            moduleName +
                                            " for property: " +
                                            prop + ". Only 'add' or 'addToPrototype' is allowed for object extensions");
                                }
                            } else if (extType !== "add" && (!(prop in targetObj) || !dojo.isFunction(targetObj[prop]))) {
                                //Inform developer if there is no match for the extension.
                                console.error("Trying to register a '" + type + "' extension on object " +
                                        moduleName +
                                        " for non-existent function property: " +
                                        prop);
                            } else {
                                this["_ext_" + extType](extKey, type, targetObj, prop, targetObj[prop]);
                            }
                        }
                    }
                }
            }
        },

        /**
         * Applies the extension on the named function before the
         * real function on the object. If the before function returns any
         * value, it will be treated as an array of arguments to pass to
         * the original function.
         */
        _ext_before: function (extKey, type, obj, prop, oldValue) {
            obj[prop] = function () {
                var args = arguments,
                    extFunc = rd._exts[extKey] && rd._exts[extKey][type];
                extFunc = extFunc && extFunc[prop];
                if (extFunc && !rd._extDisabled[extKey]) {
                    args = extFunc.apply(this, arguments);
                    if (typeof args === undefined) {
                        args = arguments;
                    }
                }
                return oldValue.apply(this, args);
            };
        },

        /**
         * Applies the extension on the named function after the
         * real function on the object. Passes the return value of the original
         * function as "targetReturn" property on the extension function.
         * Extension function can access it via arguments.callee.targetReturn.
         * If the targetReturn is needed, it should be grabbed as the first operation
         * of the extension function, in case a nested/cyclical call to the same
         * function happens after it starts to operate
         * (in which case the .target property could change)
         * @private
         */
        _ext_after: function (extKey, type, obj, prop, oldValue) {
            obj[prop] = function () {
                var aftRet, ret = oldValue.apply(this, arguments),
                    extFunc = rd._exts[extKey] && rd._exts[extKey][type];
                extFunc = extFunc && extFunc[prop];
                if (extFunc && !rd._extDisabled[extKey]) {
                    extFunc.targetReturn = ret;
                    aftRet = extFunc.apply(this, arguments);
                    if (typeof aftRet !== "undefined") {
                        ret = aftRet;
                    }
                    delete extFunc.targetReturn;
                }
                return ret;        
            };
        },

        /**
         * Applies the extension on the named function around the
         * real function. Attaches the original function as arguments.callee.target.
         * The around function has the option to change the arguments passed
         * to arguments.callee.target and also to modify the return value. Extension
         * needs to call arguments.callee.target.apply(this, arguments) to trigger
         * original function. If the target function is needed, it should be grabbed
         * as the first operation of the extension function, in case a
         * nested/cyclical call to the same function happens after it starts to operate
         * (in which case the .target property could change)
         * @private
         */
        _ext_around: function (extKey, type, obj, prop, oldValue) {
            obj[prop] = function () {
                var extFunc = rd._exts[extKey] && rd._exts[extKey][type],
                    ret;
                extFunc = extFunc && extFunc[prop];
                if (extFunc && !rd._extDisabled[extKey]) {
                    extFunc.target = oldValue;
                    ret = extFunc.apply(this, arguments);
                    delete extFunc.target;
                    return ret;
                } else {
                    return oldValue.apply(this, arguments);
                }
            };
        },

        /**
         * Replaces the named property with the new value.
         * @private
         */
        _ext_replace: function (extKey, type, obj, prop, oldValue) {
            obj[prop] = function () {
                var extFunc = rd._exts[extKey] && rd._exts[extKey][type];
                extFunc = extFunc && extFunc[prop];
                if (extFunc && !rd._extDisabled[extKey]) {
                    return extFunc.apply(this, arguments);
                } else {
                    return oldValue.apply(this, arguments);
                }
            };
        },

        /**
         * Adds the named property with the new value.
         * @private
         */
        _ext_add: function (extKey, type, obj, prop, oldValue) {
            obj[prop] = function () {
                var extFunc = rd._exts[extKey] && rd._exts[extKey][type];
                extFunc = extFunc && extFunc[prop];
                //If extension is not disabled, execute the function,
                //otherwise ignore the call.
                if (extFunc && !rd._extDisabled[extKey]) {
                    return extFunc.apply(this, arguments);
                }
                return null;
            };
        }
    });

    //Register for the extenstion subscriptions as appropriate
    //These were set in djConfig.rd.subs, but we use require.config
    //here in case there is another dojo in the page that overwrites our djConfig.
    if (subs) {
        for (i = 0; (subObj = subs[i]); i++) {
            for (topic in subObj) {
                //Use empty to weed out stuff added by other JS code to Object.prototype
                if (!empty[topic]) {
                    if (!extSubs[topic]) {
                        extSubs[topic] = [];
                        extSubHandles[topic] = rd.sub(topic, dojo.hitch(rd, "onExtPublish", topic));
                    }
                    extSubs[topic].push(subObj[topic]);
                }
            }
        }
    }

    require.ready(function () {
        //Register an onclick handler on the body to handle "#rd:" protocol URLs.
        rd.sub("rd/onHashChange", rd, "dispatchFragId");
        
        //Sets click handler on the document to handle dynamic delegated event
        //dispatch based on widget IDs.
        dojo.connect(dojo.doc.documentElement, "onclick", rd, "onDelegateClick");
    });

    return rd;
});
