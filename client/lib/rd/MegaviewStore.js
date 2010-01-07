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
/*global run: false, console: false */
"use strict";

run("rd/MegaviewStore",
["run", "rd", "dojo", "dojo/DeferredList", "rd/api"],
function (run, rd, dojo, DeferredList, api) {
    //This implements the dojo.data Read and Identity interfaces so it can
    //be used in widgets that consume dojo.data stores. The items in this
    //store have properties: "type", "id", and "name".
    
    //TODO: make sure that close/abort clear out _items correctly.
    //Should _items be placed on the Request object? How does that work
    //for fetchByIdentity?

    var MegaviewStore = dojo.declare("rd.MegaviewStore", null, {
        //The types of schema queries to perform. Assumes there is a xQuery
        //method defined on an instance of this store for each type. So if
        //"contact" is in schemaQueryTypes, then there should be a contactQuery
        //method defined that returns a dojo.Deferred object.
        //This is a prototype property, so adding to it affects all instances,
        //where reassigning a new array on an instance will just affect that instance.
        //an array of schemaQueryTypes can be passed to the constructor as well.
        //"identityContact" is a valid value, but not default. "identityContact" will load
        //Contacts that match for the identity too.
        schemaQueryTypes: [
            "contact",
            "locationTag"
        ],
    
        //A restriction that can be used on the schemaQueryType. Useful mainly for
        //"identityContact" schemaQueryType, that
        //limits the types of identities and associated contacts to that type.
        //Could also be used by extensions that add support for other schemaQueryTypes.
        subType: "",
    
        constructor: function (/*Object?*/ args) {
            //constructs an instance. Acceptable properties on the args
            //argument are:
            //shemaQueryTypes: the array of types of megaview queries to do.
            //Only use values that have an associated Query method on this object.
            args = args || {};
            if (args.schemaQueryTypes) {
                this.schemaQueryTypes = args.schemaQueryTypes;
            }
            if (args.subType) {
                this.subType = args.subType;
            }
        },
    
        getValue: function (/*item*/ item,
                                             /*attribute-name-string*/ attribute,
                                             /*value?*/ defaultValue) {
            //console.log("getValue", item, attribute, defaultValue);
            return attribute in item ? item[attribute] : defaultValue;
        },
    
        getValues: function (/*item*/ item, /*attribute-name-string*/ attribute) {
            //console.log("getValues", item, attribute);
            return attribute in item ? [item[attribute]] : [];
        },
    
        getAttributes: function (/*item*/ item) {
            //console.log("getAttributes", item);
            var attrs = ["type", "id", "name"], ret = [], i, attr;
            for (i = 0; (attr = attrs[i]); i++) {
                if (attr in item) {
                    ret.push(attr);
                }
            }
            return ret;
        },
    
        hasAttribute: function (/*item*/ item, /*attribute-name-string*/ attribute) {
            //console.log("hasAttribute", item, attribute);
            return (attribute in item);
        },
    
        containsValue: function (/*item*/ item, /*attribute-name-string*/ attribute, /*anything*/ value) {
            //console.log("containsValue", item, attribute, value);
            return item[attribute] === value;
        },
    
        isItem: function (/*anything*/ something) {
            //console.log("isItem", something);
            return typeof something.id === "string" &&
                    something.type === "string" &&
                    something.name === "string";
        },
    
        isItemLoaded: function (/*anything*/ something) {
            //console.log("isItemLoaded", something);
            return this.isItem(something) && dojo.indexOf(this._items, something);
        },
    
        loadItem: function (/*Object*/ args) {
            //console.log("loadItem", args);
            var item = args.item, onItem;
            if (this.isItem(item) && !dojo.indexOf(this._items, item)) {
                this._items.push(item);
                onItem = args.onItem;
                if (onItem) {
                    onItem.call(args.scope || dojo.global, item);
                }
            }
            //onError: support? Really try to call the megaview?
        },
    
        fetch: function (/*Object*/ args) {
            //right now only accepts args.query that is a string or an object
            //with a name property. No filtering options like * or ? are supported.
            //All queries are assumed to be queryvalue*
            //console.log("fetch", args);
            /*
             Still TODO:
             queryOptions: {
                ignoreCase: bool
                deep: bool
             },
             scope:
             start:
             sort: 
            */
            this._items = [];
    
            var query = args.query, dfds = [], i, type, req, dfdList;
            if (query.name) {
                query = query.name;
            }
    
            //Remove special filter characters since they are not supported yet.
            query = query.replace(/\*/g, "").replace(/\?/g, "");

            for (i = 0; (type = this.schemaQueryTypes[i]); i++) {
                if (this[type + "Query"]) {
                    dfds.push(this[type + "Query"](query, args.count));
                } else {
                    console.log("rd/MegaviewStore: unsupported schemaQueryTypes: " + type);
                }
            }
    
            req = this._makeRequest(args);
    
            dfdList = new DeferredList(dfds, false, true);
            dfdList.addCallbacks(dojo.hitch(this, "_fetchDone", req, args), dojo.hitch(this, "_fetchError", req, args));
    
            req._dfdList = dfdList;
            return req;
        },

        _fetchDone: function (/*Request*/req, /*Object*/ fetchArgs, /*Object*/ response) {
            //console.log("_fetchDone");
            //called when all deferreds for the schemaQueryTypes finish.
    
            //Sort the values by name.
            this._items.sort(function (a, b) {
                return a.name > b.name ? 1 : -1;
            });

            //Now process the callbacks.
            var scope = fetchArgs.scope || dojo.global,
                func = fetchArgs.onBegin,
                i, item;
            if (func) {
                func.call(scope, this._items.length, req);
            }

            func = fetchArgs.onItem;
            if (func) {
                for (i = 0; (item = this._items[i]); i++) {
                    func.call(scope, item, req);
                }
            }
    
            func = fetchArgs.onComplete(this._items, req);
    
            return response;
        },
    
        _fetchError: function (/*Request*/req, /*Object*/ fetchArgs, /*Error*/ response) {
            //console.log("_fetchError", req, fetchArgs, response);
            
            //If the error is from a deferred cancel, do not surface it as an error.
            if (response.dojoType === "cancel") {
                return true;
            }
    
            var onError = fetchArgs.onError;
            if (onError) {
                onError.call((fetchArgs.scope || dojo.global), response, req);
            }
            return response;
        },
    
        getFeatures: function () {
            //console.log("getFeatures");
            return {
                'dojo.data.api.Read': true
            };
        },
    
        close: function (/*dojo.data.api.Request || keywordArgs || null*/ request) {
            //console.log("close", request);
        },
    
        getLabel: function (/*item*/ item) {
            //console.log("getLabel", item);
            return item.name;
        },
    
        getLabelAttributes: function (/*item*/ item) {
            //console.log("getLabelAttributes", item);
            return ["name"];
        },
    
        _makeRequest: function (/*Object*/ args) {
            //console.log("_makeRequest", args);
            //used to make a dojo.data.api.Request object.
            var req = dojo.delegate(args);
            req.abort = this._requestAbort;
            return req;
        },
    
        _requestAbort: function () {
            //console.log("_requestAbort");
            //the function definition used for a dojo.data.api.Request
            //object.
            if (this._dfdList) {
                this._dfdList.cancel();
            }
        },
    
        /**** Start schemaQueryType built-in Query methods ****/
        _addItems: function (/*Array*/ items) {
            //console.log("_addItems", items);
            //called by the schemaQueryType Query methods to add items to the
            //final result. Each item in the array should have the following properties:
            //id: a unique ID
            //name: a display name
            //type: the type of item. Should match the schemaQueryType that generated
            //these items.
            this._items.push.apply(this._items, items);
        },
    
        identityContactQuery: function (/*String*/query, /*Number*/ count) {
            //does an rd.identity.contacts query for the "identityContact" schemaQueryType.
            //console.log("identityContactQuery", query, count);
            var dfd = new dojo.Deferred();
    
            run(["rd/contact"], function (contact) {
                var args = {
                    key: ["rd.core.content", "schema_id", "rd.identity.contacts"],
                    reduce: false,
                    ioPublish: false,
                    identity: query,
                    type: this.subType || "",
                    include_docs: true
                };
        
                if (count && count !== Infinity) {
                    args.limit = count;
                }
        
                args.listName = "rdidentity";
                api().megaviewList(args)
                .ok(this, function (json) {
                    var items = [], idtys = [], ids = {}, i, row, name;
                    //TODO, just collect the contactIds if include_docs on a list view
                    //would give back the docs.
                    for (i = 0; (row = json.rows[i]); i++) {
                        name = row.value.rd_key[1][1];
                        if (!name || ids[name]) {
                            continue;
                        }
                        //emit the identity.
                        items.push({
                            id: name,
                            type: "identity",
                            name: name
                        });
                        idtys.push(row.value.rd_key[1]);
                        ids[name] = 1;
                    }
                    this._addItems(items);
    
                    //Now request the contact records.
                    contact.byIdentity(
                        idtys,
                        dojo.hitch(this, function (contacts) {
                            var items = [], i, contact;
                            if (contacts) {
                                for (i = 0; (contact = contacts[i]); i++) {
                                    if (!contact.name || !ids[contact.name]) {
                                        continue;
                                    }
                                    items.push({
                                        id: contact.rd_key[1],
                                        type: "contact",
                                        name: contact.name
                                    });
                                    ids[contact.name] = 1;
                                }
                                this._addItems(items);
                            }
                            dfd.callback();
                        }),
                        function (err) {
                            dfd.errback(err);
                        }
                    );
                })
                .error(dfd);
            });
    
            return dfd;     
        },
    
        contactQuery: function (/*String*/query, /*Number*/ count) {
            //does a contact query for the "contact" schemaQueryType.
            //console.log("contactQuery", query, count);
            var dfd = new dojo.Deferred(),
                args = {
                    startkey: ["rd.contact", "name", query],
                    endkey: ["rd.contact", "name", query + "\u9999"],
                    reduce: false,
                    ioPublish: false
                };
    
            if (count && count !== Infinity) {
                args.limit = count;
            }
    
            api().megaview(args)
            .ok(this, function (json) {
                var items = [], i, row, name;
                for (i = 0; (row = json.rows[i]); i++) {
                    name = row.key[2];
                    if (!name) {
                        continue;
                    }
                    items.push({
                        id: row.value.rd_key[1],
                        type: "contact",
                        name: name
                    });
                }
                this._addItems(items);
                dfd.callback();
            })
            .error(dfd);
            return dfd;
        },
    
        locationTagQuery: function (/*String*/query, /*Number*/ count) {
            //does a locationTag query (imap folders) for the "locationTag" schemaQueryType.
            //console.log("locationTagQuery", query, count);
            var dfd = new dojo.Deferred(),
                args = {
                    startkey: ["rd.msg.location", "location", [query]],
                    endkey: ["rd.msg.location", "location", [query + "\u9999", {}]],
                    reduce: true,
                    group: true,
                    ioPublish: false
                };
    
            if (count && count !== Infinity) {
                args.limit = count;
            }
    
            api().megaview(args)
            .ok(this, function (json) {
                var items = [], i, row, name;
                for (i = 0; (row = json.rows[i]); i++) {
                    name = row.key[2];
                    if (!name) {
                        continue;
                    }
                    items.push({
                        id: row.key[2],
                        type: "locationTag",
                        name: row.key[2]
                    });
                }
                this._addItems(items);
                dfd.callback();
            })
            .error(dfd);
            return dfd;
        }
    });

    return MegaviewStore;
});