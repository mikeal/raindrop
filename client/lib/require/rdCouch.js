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
/*jslint plusplus: false */
/*global require: false, XMLHttpRequest: false */

"use strict";

(function () {
    require.rdCouch = {
        safeProps: {
            "id": 1, //technically not view compatible, but desirable for our server API
            "message_limit": 1, // also not part of views, but part of our API.
            "key": 1,
            "keys": 1,
            "startkey": 1,
            "startkey_docid": 1,
            "endkey": 1,
            "endkey_docid": 1,
            "limit": 1,
            "stale": 1,
            "descending": 1,
            "skip": 1,
            "group": 1,
            "group_level": 1,
            "reduce": 1,
            "include_docs": 1,
            "docs": 1
        },

        /**
         * Taken from dojo's objectToQuery, but do not want to depend on dojo here.
         */
        objectToQuery: function (map) {
            var enc = encodeURIComponent, pairs = [], backstop = {}, name, value, assign, i;
            for (name in map) {
                if (map.hasOwnProperty(name)) {
                    value = map[name];
                    if (value !== backstop[name]) {
                        assign = enc(name) + "=";
                        if (require.isArray(value)) {
                            for (i = 0; i < value.length; i++) {
                                pairs.push(assign + enc(value[i]));
                            }
                        } else {
                            pairs.push(assign + enc(value));
                        }
                    }
                }
            }
            return pairs.join("&"); // String 
        },

        /**
         * Does an XHR call to the couch.
         *
         * @param args {Object} the args to pass to XHR call. This method will
         * pull out the CouchDB-safe parameters and use that for a "content" arg
         * as part of args.
         */
        xhr: function (args, callback) {
            var url = args.url, xhr, bodyData = args.bodyData || null,
                content = args.content || {}, empty = {}, prop, method, value,
                safe = require.rdCouch.safeProps;

            //Pull out CouchDB-safe parameters.
            for (prop in args) {
                if (!(prop in empty) && prop in safe) {
                    value = args[prop];
                    //Couch likes array and object values as json data
                    if (value !== undefined &&
                       (value === null || typeof value === "object" || require.isArray(value) || require.isFunction(value))) {
                        value = JSON.stringify(value);
                    }
                    content[prop] = value;
                }
            }

            //Figure out the kind of DB method.
            method = args.method;
            if (!method) {
                method = "GET";
                if (content.keys) {
                    method = "POST";
                    bodyData = '{ "keys": ' + content.keys + '}';
                    delete content.keys;
                } else if (content.docs) {
                    //Probably a bulk doc operation.
                    method = "POST";
                    bodyData = '{ "docs": ' + content.docs + '}';
                    delete content.docs;
                }
            }

            //convert content to an URL.
            //Note that even for POST urls to couch, couch only wants certain
            //things in the POST, but expects other params in the querystring.
            url = url + (url.indexOf("?") === -1 ? "?" : "&") + require.rdCouch.objectToQuery(content);
            //You make the call!
            xhr = new XMLHttpRequest();
            xhr.open(method, url, true);
            xhr.onreadystatechange = function (evt) {
                //Do not explicitly handle errors, those should be
                //visible via console output in the browser.
                if (xhr.readyState === 4) {
                    var obj = JSON.parse(xhr.responseText);

                    if (callback) {
                        callback(obj);
                    }
                }
            };
            xhr.send(bodyData);
        }
    };

    require.plugin({
        prefix: "rdCouch",

        /**
         * This callback is prefix-specific, only gets called for this prefix
         */
        require: function (name, deps, callback, context) {
            //No-op, require never gets these couch items, they are always
            //a dependency, see load for the action.
        },

        /**
         * Called when a new context is defined. Use this to store
         * context-specific info on it.
         */
        newContext: function (context) {
            require.mixin(context, {
                rdCouch: {},
                rdCouchWaiting: []
            });

            //Set up the require.rdCouch as a module in the context,
            //so its methods can be used by modules.
            context.defined["require/rdCouch"] = require.rdCouch;
        },

        /**
         * Called when a dependency needs to be loaded.
         */
        load: function (name, contextName) {
            //Name has format: megaview:json
            
            var index = name.indexOf(":"),
                action = name.substring(0, index),
                json = name.substring(index + 1, name.length),
                args,
                context = require.s.contexts[contextName],
                waiting = context.rdCouchWaiting;

            //If couch response is not available, load it.
            if (!context.rdCouch[name] && !waiting[name]) {
                waiting[name] = waiting[(waiting.push({
                    name: name
                }) - 1)];

                //Convert JSON to arguments
                args = JSON.parse(json);

                //Set the URL
                if (!args.url) {
                    if (action === "megaview") {
                        args.url = (context.config.rd.dbPath || "/raindrop/") + "_design/raindrop!content!all/_view/megaview";
                    }
                }

                //Set up the success action and make the XHR call.
                context.loaded[name] = false;
                require.rdCouch.xhr(args, function (obj) {
                    context.rdCouch[name] = obj;
                    context.loaded[name] = true;
                    require.checkLoaded(contextName);
                });
            }
        },

        /**
         * Called when the dependencies of a module are checked.
         */
        checkDeps: function (name, deps, context) {
            //No-op, checkDeps never gets these couch items, they are always
            //a dependency, see load for the action.
        },

        /**
         * Called to determine if a module is waiting to load.
         */
        isWaiting: function (context) {
            return !!context.rdCouchWaiting.length;
        },

        /**
         * Called when all modules have been loaded.
         */
        orderDeps: function (context) {
            //Clear up state since further processing could
            //add more things to fetch.
            var i, dep, text, waiting = context.rdCouchWaiting;
            context.rdCouchWaiting = [];
            for (i = 0; (dep = waiting[i]); i++) {
                context.defined[dep.name] = context.rdCouch[dep.name];
            }
        }
    });
}());
