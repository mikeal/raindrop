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
/*global require: false */
"use strict";

require.modify("rdw/Message", "ext/flickrIndex",
["rd", "dojo", "dojo/io/script", "rdw/Message"],
function (rd, dojo, script, Message) {

    rd.applyExtension("ext/flickrIndex", "rdw/Message", {
        after: {
            postCreate: function () {
                var schema = this.msg.schemas["rd.msg.body.quoted.hyperlinks"],
                    links = schema && schema.links, flickrRegExp, idRegExp,
                    section;
                if (!links) {
                    return;
                }

                flickrRegExp = /https?:\/\/[^\/]*flickr\.com\//;
                links = dojo.filter(links, function (link) {
                    return flickrRegExp.test(link) ? link : null;
                });

                if (links.length) {
                    section = dojo.query(this.domNode)
                            .query(".content")
                                .after('<ul class="flickrIndex"></ul>')
                                .end()
                            .query(".flickrIndex");
    
                    section.style({
                        "MozBorderRadius": "5px",
                        "WebkitBorderRadius": "5px",
                        "backgroundColor": "#CCCCCC",
                        "padding": "1ex"
                    });
    
                    idRegExp = /\/(\d+)\//;
    
                    dojo.map(links, function (link) {
                        var id = idRegExp.exec(link);
                        id    = id && id[1];
                        if (id) {
                            script.get({
                                url: "http://api.flickr.com/services/rest/",
                                content: {
                                    api_key: "002cc8ab023aea75b1fa37c31c75abe6",
                                    method: "flickr.photos.getSizes",
                                    photo_id: id,
                                    format: "json"
                                },
                                jsonp: "jsoncallback",
                                load: function (json) {
                                    if (json.stat === "ok") {
                                        var url = json.sizes.size[0].source;
                                        section.append('<img src="' + url + '">');
                                    }
                                }
                            });
                        }
                    });
                }
            }
        }
    });
});
