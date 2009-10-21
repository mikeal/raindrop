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

dojo.provide("rdw.Search");

dojo.require("rd");
dojo.require("rdw._Base");
dojo.require("rdw.DataSelector");
dojo.require("rd.pref");

dojo.declare("rdw.Search", [rdw._Base], {
  templatePath: dojo.moduleUrl("rdw.templates", "Search.html"),
  widgetsInTemplate: true,

  historyTemplate: '<li><a href="#rd:${type}:${id}">${value}</a></li>',

  //The name to use for the rd.pref calls.
  prefId: "rdw.Search:" + rd.appName,

  //The maximum number of history items to show.
  maxHistory: 3,

  postMixInProperties: function() {
    //summary: dijit lifecycle method before template is generated.
    this.inherited("postMixInProperties", arguments);
  },

  postCreate: function() {
    //summary: dijit lifecycle method after template is inserted.
    this.inherited("postCreate", arguments);

    //Connect to dataSelector to get new searches.
    this.connect(this.dataSelector, "onDataSelected", "onDataSelected");

    //Load saved preferences. Create a default in case there
    //are no prefs.
    this.prefs = {
      history: [],
      historyKeys: {}
    };
    rd.pref(this.prefId, dojo.hitch(this, "onPrefLoad"));
  },

  onPrefLoad: function(/*Object*/prefs) {
    //summary: triggered with preferences are loaded.
    if (prefs) {
      this.prefs = prefs;
    }

    this.showHistory();
  },

  onPrefSaveError: function(/*Object*/error) {
    //summary: handles errors when saving prefs. Most likely error
    //is an out of data prefs document.
    if (error && error.message == "rd.docOutOfDate") {
      //Out of date, try to merge data best we can.
      var history = this.prefs.history;
      rd.pref(this.prefId, dojo.hitch(this, function(prefs) {
        //Combine our history with latest history, 
        //Combine our history with latest history, avoiding duplicates.
        for (var i = history.length - 1, data; (i > -1) && (data = history[i]); i--) {
          if (!prefs.historyKeys[data.id]) {
            prefs.history.unshift(data);
            prefs.historyKeys[data.id] = 1;
          }
        }

        //Sort by timestamp, then slice out up to maxHistory, then save
        //with latest _rev.
        prefs.history.sort(function(a, b) {
          return a.timestamp > b.timestamp ? -1 : 1;
        });
        this.prefs.history = prefs.history.slice(0, this.maxHistory);
        this.prefs._rev = error.currentRev;

        //Try a save again, but if still an error, give up.
        rd.pref.save(this.prefId, this.prefs, dojo.hitch(this, "onPrefLoad"));
      }));
    } else {
      console.error(error);
    }
  },

  onDataSelected: function(/*Object*/data) {
    //summary: connection to dataSelector's onDataSelected call.

    //Add a timestamp and then add data to history as first item.
    var history = this.prefs.history;

    //Look for a duplicate query. If so, then remove the old one
    //in favor of the new one.
    if(!this.prefs.historyKeys[data.id]) {
      data.timestamp = (new Date()).getTime();
      history.unshift(data);
      this.prefs.historyKeys[data.id] = 1;

      //Trim history to max length.
      if (history.length > this.maxHistory) {
        this.prefs.history = history.slice(0, this.maxHistory);
      }
  
      rd.pref.save(this.prefId, this.prefs, dojo.hitch(this, "onPrefLoad"), dojo.hitch(this, "onPrefSaveError"));
    }
  },

  showHistory: function() {
    //summary: uses the this.prefs data to show the search history.
    var history = this.prefs.history;
    if (history && history.length) {
      var html = "";
      for (var i = 0, data; (i < this.maxHistory) && (data = history[i]); i++) {
        html += dojo.string.substitute(this.historyTemplate, data);
      }
      dojo.place(html, this.recentListNode, "only");
    }
  }
});
