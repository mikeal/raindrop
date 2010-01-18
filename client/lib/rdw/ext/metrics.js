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
/*global run: false, setTimeout: false */
"use strict";

run.def("rdw/ext/metrics",
["run", "rd", "dojo", "dojo/NodeList-traverse", "rd/api", "rd/api/pref"],
function (run, rd, dojo, traverse, api, pref) {

    var metrics = {
        //TODO: there is a chance we can miss some metrics if the metric trigger
        //fires before we can load the prefs for the metrics extension. But would
        //rather have that than logging metrics if the prefs say metrics are disabled.
        enabled: false,
        dbPath: '/raindrop-metrics/',
        id: "rdw/ext/metrics:inflow",
        deleteDb: function () {
            dojo.xhrDelete({
                url: this.dbPath
            });
        },

        createDb: function () {
            dojo.xhrGet({
                url: this.dbPath,
                failOk: true,
                error: function (err, ioArgs) {
                    //If a 404 then we need to create it.
                    if (ioArgs.xhr.status === 404) {
                        dojo.xhrPut({
                            url: metrics.dbPath
                        });
                    }
                }
            });
        },

        send: function (json) {
            if (this.enabled) {
                dojo.xhr("POST", {
                    url: this.dbPath,
                    rawBody: dojo.toJson(json)
                });
            }
        },

        savePref: function () {
            api().pref({
                id: metrics.id
            })
            .ok(function (doc) {
                if (!doc) {
                    metrics._save();
                } else {
                    doc.enabled = metrics.enabled;
                    api().pref({
                        id: metrics.id,
                        prefs: doc
                    });
                }
            })
            .error(function (err) {
                //No doc, make a new one.
                metrics._save();
            });
        },

        _save: function () {
            api().pref({
                id: metrics.id,
                prefs: {
                    enabled: metrics.enabled
                }
            });
        },

        explode: function (ary, func) {
            //Returns a new array that is larger, had more elements
            //than the input array. func is used to give more values.
            var ret = [], len = ary.length, temp, i;
            for (i = 0; i < len; i++) {
                temp = func(ary[i]);
                if (temp) {
                    ret.push.apply(ret, temp);
                }
            }
            return ret;
        }
    };

    //Only hook in to rd.api for the inflow app, do not burden other apps
    //with these metrics.
    run.modify("inflow", "rdw/ext/metrics-inflow", ["inflow"], function (inflow) {
        //Register extension for API calls.
        rd.applyExtension("rdw/ext/metrics", "rd/api", {
            after: {
                serverApi: function (url, args) {
                    if (metrics.enabled) {
                        //Only track broadcast calls at the moment
                        //TODO: this should only be notification broadcasts, not any broadcast,
                        //but our data model story is incomplete for notifications right now.
                        if (url === 'inflow/conversations/broadcast') {
                            //Get the deferred returned by the serverApi call
                            var dfd = arguments.callee.targetReturn;
                            dfd.ok(function (conversations) {
                                //timeout to avoid blocking other things
                                if (conversations && conversations.length) {
                                    setTimeout(function () {
                                        var totals = [], count = 0, oldKey = "", key, i,
                                            froms = metrics.explode(conversations, function (conv) {
                                            return metrics.explode(conv.messages, function (msg) {
                                                var body = msg.schemas["rd.msg.body"],
                                                    from = "", idx;
                                                if (body && body.from && body.from[0] === "email") {
                                                    from = body.from[1];
                                                    idx = from.indexOf("@");
                                                    if (idx !== -1) {
                                                        return [from.substring(idx + 1, from.length)];
                                                    }
                                                }
                                                return null;
                                            });
                                        });

                                        froms.sort();

                                        for (i = 0; i < froms.length; i++) {
                                            key = froms[i];
                                            if (!key) {
                                                continue;
                                            }
                                            if (key !== oldKey) {
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
        api().pref({
            id: metrics.id
        })
        .ok(function (prefDoc) {
            //No preferences doc means it is enabled, as well
            //as explicit pref doc saying it is enabled.
            if (!prefDoc) {
                metrics.enabled = true;
                metrics.createDb();

                //No pref doc, so show the user the dialog.
                run.ready(function () {
                    var html =  '<div class="notice rdwExtMetrics">' +
                                '    <div class="header">' +
                                '        <div class="row">' +
                                '            <span class="title">&hearts; Welcome!</span>' +
                                '        </div>' +
                                '    </div>' +
                                '    <div class="message">' +
                                '        <div class="row">' +
                                '            <span class="content"><strong>Raindrop</strong> is designed, developed, and tested through a constant process of community participation and we try to ensure everyone can participate by sharing anonymous survey information.    We respect you and your privacy, to learn more <a href="https://wiki.mozilla.org/Raindrop/Community/Metrics_Survey" target="_blank">click here</a>.</span>' +
                                '            <span class="action"><div><input name="metrics" type="checkbox" checked> Participating</div><span class="close"><button>Close</button></span></span>' +
                                '        </div>' +
                                '    </div>' +
                                '</div>',
                        node = dojo._toDom(html),
                        nodes;
                    inflow.addNotice(node);

                    //Wire up events
                    nodes = dojo.query(node)
                        .query("button").onclick(function (evt) {
                            dojo.query(evt.target).parents(".rdwExtMetrics").remove();
                            metrics.savePref();
                        })
                    .end()
                        .query("input").onclick(function (evt) {
                            metrics.enabled = !!evt.target.checked;
                            metrics.savePref();
                            metrics[metrics.enabled ? "createDb" : "deleteDb"]();
                        });
                });
            } else {
                metrics.enabled = prefDoc.enabled;
            }
        })
        .error(function (err) {
            //If an error, just assume disabled.
            metrics.enabled = false;
        });
    });

    return metrics;
});
