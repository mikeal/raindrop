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
/*global run: false, setTimeout: false, clearTimeout: false, console: false,
setInterval: false, clearInterval: false */
"use strict";

run("rd/engine",
["rd", "dojo"],
function (rd, dojo) {
    var engine = {
        baseUrl: rd.dbPath + "_raindrop/",

        //Milliseconds to use for the watch polling
        //to check when sync is done.
        watchInterval: 3000,

        /**
         * Starts up an auto sync at the given interval.
         * It will publish out a topic when syncing is complete.
         * @param {Number} interval, number of seconds to wait between autosync calls.
         */
        autoSync: function (interval) {            
            //Latest caller wins on the interval.
            this._syncInterval = interval * 1000;
    
            if (!this._syncId) {
                this._syncId = setTimeout(dojo.hitch(this, "_autoCallback"), this._syncInterval);
            }
        },

        /**
         * Tells the back-end to sync immediately.
         */
        syncNow: function () {
            this._autoCallback();
        },
    
        cancelAutoSync: function () {
            clearTimeout(this._syncId);
            this._syncId = 0;
        },

        /**
         * Calls the back end and syncs messages. Only requests a
         * sync if the system is not busy, otherwise waits for system to not be busy,
         * then does the sync call.
         * @param {Function} callback
         * @param {String} [type]
         * @param {Function} [errback]
         */
        syncMessages: function (callback, type, errback) {    
            if (this._watchId) {
                this._watch(false, callback, type, errback);
            } else {
                this._isBusy(dojo.hitch(this, function (busy) {
                        if (busy) {
                            this._watch(false, callback, type, errback);
                        } else {
                            this._sync(callback, type, errback);
                        }
                    }),
                    errback
                );
            }
        },
    
        _autoCallback: function () {
            this.syncMessages(
                //Success callback.
                dojo.hitch(this, function () {
                    if (this._syncInterval) {
                        this._syncId = setTimeout(dojo.hitch(this, "_autoCallback"), this._syncInterval);
                    }
                    rd.pub("rd-engine-sync-done");
                }),
    
                //type, we want all syncs to run, so pass null.
                null,
    
                //Error callback.
                dojo.hitch(this, function (error) {
                    //Error case. For now, if an error, just stop trying to poll.
                    this._syncId = 0;
                    console.error("rd/engine.autoSync error: " + error);
                    rd.pub("rd-engine-sync-error", error);
                })
            );
        },

        /**
         * Starts watching and adds arguments to the callback queue.
         * @param {Boolean} isSyncCallback
         * @param {Function} callback
         * @param {String} [type]
         * @param {Function} [errback]
         */
        _watch: function (isSyncCallback, callback, type, errback) {
            if (!this._watchId) {
                this._watchId = setInterval(dojo.hitch(this, "_check"), this.watchInterval);
            }
            this._queue.push(arguments);
        },
    
        _queue: [],
    
        /**
         * Calls the server to see if it is still busy.
         */
        _check: function () {
            this._isBusy(
                //Success callback
                dojo.hitch(this, function (busy) {
                    if (!busy) {
                        this._stopInterval();
                        
                        //Process the queue.
                        var args, isSyncCallback, callback;
                        while ((args = this._queue.shift())) {
                            isSyncCallback = args[0];
                            callback = args[1];
    
                            //If isSynccallback, do the callback,
                            //otherwise it means there was a sync request in queue,
                            //so call sync and break out.
                            if (isSyncCallback) {
                                callback();
                            } else {
                                this._sync.apply(this, args);
                                break;
                            }
                        }
                    }
                }),
    
                //Error callback
                dojo.hitch(this, function (error) {
                    //If an error, just inform all queued calls of the error.
                    var queue = this._queue;
                    this._queue = [];
                    this._stopInterval();
    
                    dojo.forEach(queue, function (args) {
                        if (args[3]) {
                            args[3](error);
                        }
                    });
                })
            );
        },
    
        _stopInterval: function () {
            clearInterval(this._watchId);
            this._watchId = 0;        
        },

        /**
         * Checks with the server and then calls the callback.
         * Calls the callback with a boolean value. false means nothing is running,
         * true means something is still in queue.
         * @param {Function} callback
         * @param {Functions} [errback]
         */
        _isBusy: function (callback, errback) {
            dojo.xhrGet({
                url: this.baseUrl + "status",
                handleAs: "json",
                contentType: " ", //hack needed for couch externals?
                handle: dojo.hitch(this, function (response, ioArgs) {
                    //Handle error case
                    if (response instanceof Error) {
                        if (errback) {
                            errback(response);
                        }
                        return response;
                    }
    
                    var empty = {}, i, account,
                            accounts = response.conductor.accounts,
                            busy = false;
    
                    //Make sure all accounts are done.
                    //TODO: can make this more fine-grained, syncing specific accounts.
                    if (accounts && accounts.length) {
                        for (i = 0; (account = accounts[i]); i++) {
                            if (account.status !== "idle") {
                                busy = true;
                                break;
                            }
                        }
                    }
    
                    callback(busy);
                    return response;
                })
            });        
        },

        /**
         * Does the real synchronize call.
         * @param {Function} callback
         * @param {String} [type]
         * @param {Function} [errback]
         */
        _sync: function (callback, type, errback) {
            dojo.xhrGet({
                url: this.baseUrl + "sync-messages" + (type ? "?protocol=" + type : ""),
                contentType: " ", //hack needed for couch externals?
                handleAs: "json",
                handle: dojo.hitch(this, function (response, ioArgs) {
                    //Handle error case
                    if (response instanceof Error) {
                        if (errback) {
                            errback(response);
                        }
                        return response;
                    }
    
                    this._watch(true, callback, type, errback);
    
                    return response;
                })
            });
        }
    };

    return engine;
});

