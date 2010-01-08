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

run.modify("rdw/Message", "rdw/ext/MessageVimeoLinkAttachments",
["run", "rd", "dojo", "rdw/Message"],
function (run, rd, dojo, Message) {

    /*
    Applies a display extension to rdw/Message.
    Allows showing links included in the message as inline attachments
    */
    rd.addStyle("rdw/ext/css/MessageVimeoLinkAttachments");
    
    rd.applyExtension("rdw/ext/MessageVimeoLinkAttachments", "rdw/Message", {
        after: {
            postCreate: function () {
                //NOTE: the "this" in this function is the instance of rdw/Message.
    
                //Check for links found in a message
                var vimeo_schema = this.msg.schemas["rd.msg.body.quoted.hyperlinks.vimeo"],
                    img_src, href, img, title, owner, desc, linkNode;
                if (!vimeo_schema) {
                    return;
                }
    
                img_src = vimeo_schema.thumbnail_small;
    
                href = "href=\"http://vimeo.com/" + vimeo_schema.id + "\"";
                img = "<div class=\"thumbnail boxFlex0\"><a target=\"_blank\" " + href + "><img src=\"" +
                                img_src + "\" class=\"vimeo\"/></a></div>";
                title = "<a target=\"_blank\" class=\"title\" " + href + "\">" +
                                    vimeo_schema.title + "</a>";
                owner = "<abbr class=\"owner\">" + vimeo_schema.user_name + "</abbr>";
                desc = "<div class=\"description\">" + vimeo_schema.description + "</div>";
    
                //Create a node to hold the link object
                linkNode = dojo.create("div", {
                    "class": "vimeo video link hbox",
                    innerHTML: img + "<div class=\"information boxFlex1\">" + title + owner + desc + "</div>"
                });
                dojo.query(".message .attachments", this.domNode).addContent(linkNode);
                dojo.connect(linkNode, "onclick", this, "onMessageVimeoLinkAttachmentClick");
            }
        },
        addToPrototype: {
            onMessageVimeoLinkAttachmentClick: function (evt) {
                //summary: handles clicking anywhere on the link attachment block
                var link_schema = this.msg.schemas["rd.msg.body.quoted.hyperlinks.vimeo"];
                if (!link_schema) {
                    return;
                }
            }
        }
    });
});
