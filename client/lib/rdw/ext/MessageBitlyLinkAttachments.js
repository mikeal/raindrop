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
/*global run: false */
"use strict";

run.modify("rdw/Message", "rdw/ext/MessageBitlyLinkAttachments",
["run", "rd", "dojo", "rdw/Message"],
function (run, rd, dojo, Message) {
    /*
    Applies a display extension to rdw/Message.
    Allows showing links included in the message as inline attachments
    */

    rd.addStyle("rdw/ext/css/MessageBitlyLinkAttachments");

    rd.applyExtension("rdw/ext/MessageBitlyLinkAttachments", "rdw/Message", {
        after: {
            postCreate: function () {
                //NOTE: the "this" in this function is the instance of rdw.Message.
    
                //Check for links found in a message
                var bitly_schema = this.msg.schemas["rd.msg.body.bit.ly"],
                    href, title, owner, desc, linkNode;
                if (!bitly_schema) {
                    return;
                }

                href = "href=\"" + bitly_schema.longUrl + "\"";
                title = "<a target=\"_blank\" class=\"title\" " + href + "\">" +
                                    bitly_schema.htmlTitle + "</a>";
                owner = "<abbr class=\"owner\">" + bitly_schema.shortenedByUser + "</abbr>";
                desc = "<div class=\"description\">" + bitly_schema.longUrl + "</div>";

                //Create a node to hold the link object
                linkNode = dojo.create("div", {
                    "class": "bitly link",
                    innerHTML: title + owner + desc
                });
                dojo.query(".message .attachments", this.domNode).addContent(linkNode);
                dojo.connect(linkNode, "onclick", this, "onMessageBitlyLinkAttachmentClick");
    
            }
        },
        addToPrototype: {
            /**
             * Handles clicking anywhere on the link attachment block
             */
            onMessageBitlyLinkAttachmentClick: function (evt) {
                var link_schema = this.msg.schemas["rd.msg.body.bit.ly"];
                if (!link_schema) {
                    return;
                }
            }
        }
    });
});
