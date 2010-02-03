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

require.modify("rdw/Message", "rdw/ext/MessageDebug-rdw/Message",
["rd", "dojo", "rdw/Message"],
function (rd, dojo, Message) {

    rd.addStyle("rdw/ext/css/MessageDebug");

    rd.applyExtension("rdw/ext/MessageDebug", "rdw/Message", {
        after: {
            /** Adds debug links to show documents associated with message */
            postCreate: function () {
                //NOTE: the "this" in this function is the instance of rdw/Message.

                //Create a node to hold the debug links
                var debugNode = dojo.create("div", {
                        "class": "debug"
                    }),
                    prop, schema;

                //Loop over the sources and add links for each kind.
                for (prop in this.msg.schemas) {
                    if (this.msg.schemas.hasOwnProperty(prop)) {
                        schema = this.msg.schemas[prop];
                        if (!schema._id) {
                            continue;
                        }
                        dojo.create("a", {
                            "class": "tag",
                            target: "_blank",
                            title: schema.rd_schema_id,
                            href: "http://127.0.0.1:5984/_utils/document.html?raindrop/" + encodeURIComponent(schema._id),
                            innerHTML: schema.rd_schema_id.replace(/rd\.msg\./, '')
                        }, debugNode);
                    }
                }

                //Attach the debug div to the Messsage.
                dojo.query(".message", this.domNode).addContent(debugNode);
            }
        }
    });
});
