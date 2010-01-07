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

/*jslint nomen: false, plusplus: false */
/*global run: false, console: false */
"use strict";

run("rdw/Search",
["rd", "dojo", "rdw/_Base", "rdw/DataSelector", "rd/api", "rd/api/pref",
 "text!rdw/templates/Search!html"],
function (rd, dojo, Base, DataSelector, api, pref, template) {

    return dojo.declare("rdw.Search", [Base], {
        templateString: template,
        widgetsInTemplate: true,
    
        historyTemplate: '<li><a href="#rd:${type}:${id}">${value}</a></li>',
    
        //The name to use for the rd.api.pref calls.
        prefId: "rdw/Search:" + rd.appName,
    
        //The maximum number of history items to show.
        maxHistory: 3,

        /** Dijit lifecycle method before template is generated. */
        postMixInProperties: function () {
            this.inherited("postMixInProperties", arguments);
        },

        /** Dijit lifecycle method after template is inserted. */
        postCreate: function () {
            this.inherited("postCreate", arguments);
    
            //Connect to dataSelector to get new searches.
            this.connect(this.dataSelector, "onDataSelected", "onDataSelected");
    
            //Load saved preferences. Create a default in case there
            //are no prefs.
            this.prefs = {
                history: [],
                historyKeys: {}
            };
            api().pref({
                id: this.prefId
            })
            .ok(this, "onPrefLoad");
        },

        /**
         * Triggered with preferences are loaded.
         * @param {Object} prefs
         */
        onPrefLoad: function (prefs) {
            if (prefs) {
                this.prefs = prefs;
            }
    
            this.showHistory();
        },

        /**
         * Handles errors when saving prefs. Most likely error
         * is an out of data prefs document.
         * @param {Object} error
         */
        onPrefSaveError: function (error) {
            if (error && error.message === "rd/docOutOfDate") {
                //Out of date, try to merge data best we can.
                var history = this.prefs.history, i, data;
                api().pref({
                    id: this.prefId
                })
                .ok(this, function (prefs) {
                    //Combine our history with latest history, 
                    //Combine our history with latest history, avoiding duplicates.
                    for (i = history.length - 1; (i > -1) && (data = history[i]); i--) {
                        if (!prefs.historyKeys[data.id]) {
                            prefs.history.unshift(data);
                            prefs.historyKeys[data.id] = 1;
                        }
                    }
    
                    //Sort by timestamp, then slice out up to maxHistory, then save
                    //with latest _rev.
                    prefs.history.sort(function (a, b) {
                        return a.timestamp > b.timestamp ? -1 : 1;
                    });
                    this.prefs.history = prefs.history.slice(0, this.maxHistory);
                    this.prefs._rev = error.currentRev;
    
                    //Try a save again, but if still an error, give up.
                    api().pref({
                        id: this.prefId,
                        prefs: this.prefs
                    })
                    .ok(this, "onPrefLoad");
                });
            } else {
                console.error(error);
            }
        },

        /**
         * Connection to dataSelector's onDataSelected call.
         * @param {Object} data
         */
        onDataSelected: function (data) {
            //Add a timestamp and then add data to history as first item.
            var history = this.prefs.history;
    
            //Look for a duplicate query. If so, then remove the old one
            //in favor of the new one.
            if (!this.prefs.historyKeys[data.id]) {
                data.timestamp = (new Date()).getTime();
                history.unshift(data);
                this.prefs.historyKeys[data.id] = 1;
    
                //Trim history to max length.
                if (history.length > this.maxHistory) {
                    this.prefs.history = history.slice(0, this.maxHistory);
                }
        
                api().pref({
                    id: this.prefId,
                    prefs: this.prefs
                })
                .ok(this, "onPrefLoad")
                .error(this, "onPrefSaveError");
            }
        },

        /** Uses the this.prefs data to show the search history. */
        showHistory: function () {
            var history = this.prefs.history, html, i, data;
            if (history && history.length) {
                html = "";
                for (i = 0; (i < this.maxHistory) && (data = history[i]); i++) {
                    html += rd.template(this.historyTemplate, data);
                }
                dojo.place(html, this.recentListNode, "only");
            }
        }
    });
});
