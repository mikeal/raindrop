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

require.modify("rdw/Message", "ext/linkIndex",
["rd", "dojo", "rdw/Message"],
function (rd, dojo, Message) {

    rd.applyExtension("ext/linkIndex", "rdw/Message", {
        after: {
            postCreate: function () {
                var schema = this.msg.schemas["rd.msg.body.quoted.hyperlinks"],
                    links = schema && schema.links;
                if (!links) {
                    return;
                }
    
                links = dojo.map(links, function (link) {
                    return rd.template(
                        '<li><a href="${url}">${url}</a></li>',
                        { url: link }
                    );
                });

                $(this.domNode)
                    .append('<ul class="linkIndex">' + links.join('') + '</ul>')
                    .find(".linkIndex")
                    .css({
                        paddingBottom: "8px",
                        listStyle: "none",
                        fontSize: "small"
                    })
                    .find("a")
                    .css({
                        color: "#1a1a1a",
                        opacity: 0.5,
                        textDecoration: "none"
                    });
            }
        }
    });
});
