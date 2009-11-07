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

dojo.provide("rdw.ext.metrics");

//Only require inflow if this is the inflow app.
dojo.requireIf(rd.appName == "inflow", "inflow");
dojo.require("rd.pref");
dojo.require("rd.api.Api");

rdw.ext.metrics = {
  //TODO: there is a chance we can miss some metrics if the metric trigger
  //fires before we can load the prefs for the metrics extension. But would
  //rather have that than logging metrics if the prefs say metrics are disabled.
  enabled: false,
  dbPath: '/raindrop-metrics/',

  deleteDb: function() {
    dojo.xhrDelete({
      url: this.dbPath
    })
  },

  createDb: function() {
    dojo.xhrGet({
      url: this.dbPath,
      failOk: true,
      error: function(err, ioArgs) {
        //If a 404 then we need to create it.
        if (ioArgs.xhr.status == 404) {
          dojo.xhrPut({
            url: rdw.ext.metrics.dbPath
          })
        }
      }
    });
  },

  send: function(json) {
    if (this.enabled) {
      dojo.xhr("POST", {
        url: this.dbPath,
        rawBody: dojo.toJson(json)
      });
    }
  },
  
  savePref: function() {
    rd.pref("rdw.ext.metrics:inflow",
      function(doc) {
        if (!doc) {
          rdw.ext.metrics._save();
        } else {
          doc.enabled = rdw.ext.metrics.enabled;
          rd.pref.save("rdw.ext.metrics:inflow", doc, function(){});
        }
      },
      function(err) {
        //No doc, make a new one.
        rdw.ext.metrics._save();
      }
    );
  },

  _save: function() {
    rd.pref.save("rdw.ext.metrics:inflow", {
      enabled: rdw.ext.metrics.enabled
    }, function(){});
  },

  explode: function(ary, func) {
    //Returns a new array that is larger, had more elements
    //than the input array. func is used to give more values.
    var ret = [], len = ary.length, temp;
    for (var i = 0; i < len; i++) {
      temp = func(ary[i]);
      if (temp) {
        ret.push.apply(ret, temp);
      }
    }
    return ret;
  }
}

if (rd.appName == "inflow") {
  (function() {
      var metrics = rdw.ext.metrics;

      //Register extension for API calls.
      rd.applyExtension("rdw.ext.metrics", "rd.api.Api", {
        after: {
          rest: function(url, args) {
            if (metrics.enabled) {
              //Only track broadcast calls at the moment
              //TODO: this should only be notification broadcasts, not any broadcast,
              //but our data model story is incomplete for notifications right now.
              if (url == 'inflow/conversations/broadcast') {
                //Get the deferred returned by the rest call
                var dfd = arguments.callee.targetReturn;
                dfd.ok(function(conversations) {
                  //timeout to avoid blocking other things
                  if (conversations && conversations.length) {
                    setTimeout(function() {
                      var froms = metrics.explode(conversations, function(conv) {
                        return metrics.explode(conv.messages, function(msg) {
                          var body = msg.schemas["rd.msg.body"];
                          var from = "";
                          if (body && body.from && body.from[0] == "email") {
                            var from = body.from[1];
                            var idx = from.indexOf("@");
                            if (idx != -1) {
                              return [from.substring(idx + 1, from.length)];
                            }
                          }
                          return null;
                        })
                      })

                      froms.sort();
                      
                      var totals = [], count = 0, oldKey = "", key;
                      for (var i = 0; i < froms.length; i++) {
                        key = froms[i];
                        if (!key) {
                          continue;
                        }
                        if (key != oldKey) {
                          if (count) {
                            totals.push(count);
                          }
                          oldKey = key;
                          count = 1;
                        } else {
                          count += 1;
                        }
                      }
                      if (count) {
                        totals.push(count);
                      }

                      metrics.send({
                        type: "broadcast.domain.totalmessages",
                        totals: totals
                      });
                    }, 100);
                  }
                });
              }
            }
          }
        }
      });

      //Load the preferences and set up UI/enabled accordingly.
      rd.pref("rdw.ext.metrics:inflow",
        function(prefDoc) {
          //No preferences doc means it is enabled, as well
          //as explicit pref doc saying it is enabled.
          if (!prefDoc) {
            metrics.enabled = true;
            metrics.createDb();

            //No pref doc, so show the user the dialog.
            dojo.addOnLoad(function() {
              var html = '<div class="notice"><input type="checkbox" checked> Metrics Enabled. <a href="https://wiki.mozilla.org/Raindrop/MetricsInfo" target="_blank">Learn More</a> <button>Close</button></div>';
              var node = dojo._toDom(html);
              inflow.addNotice(node);

              //Wire up events
              var nodes = dojo.query(node)
                .query("button").onclick(function(evt) {
                  dojo.destroy(evt.target.parentNode);
                  metrics.savePref();
                })
              .end()
                .query("input").onclick(function(evt) {
                  metrics.enabled = !!evt.target.checked;
                  metrics.savePref();
                  metrics[metrics.enabled ? "createDb" : "deleteDb"]();
                });
            });
          } else {
            metrics.enabled = prefDoc.enabled;
          }
        },
        function(err) {
          //If an error, just assume disabled.
          metrics.enabled = false;
        }
      );
  }());
}
