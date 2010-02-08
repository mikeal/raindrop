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

require.modify("rdw/Message", "rdw/ext/MessageLinkImgAttachments",
["require", "rd", "dojo", "rd/schema", "rdw/Message"], function (
  require,   rd,   dojo,   rdSchema,    Message) {

    rd.addStyle("rdw/ext/css/MessageLinkImgAttachments");

    /* Applies a display extension to rdw/Message.
      Designed to show img urls.
      Img urls should give us some of the following properties.
        thumb:        thumbnail image (around 100px square)
        img:          large image
        href:         link to external site
        title:        proper title or link
        userName:     username of author
        realName:     real name of the author
        description:  description of the image
    */
    rd.applyExtension("rdw/ext/MessageLinkImgAttachments", "rdw/Message", {
        addToPrototype: {
            linkHandlers: [
                function (link) {
                    //NOTE: the "this" in this function is the instance of rdw/Message.

                    //See if link matches the schema on message.
                    var schema = rdSchema.getMsgMultipleMatch(this.msg, "rd.msg.body.attachment.link.img", "ref_link", link.url),
                        html;
                    if (!schema) {
                        return false;
                    }

                    html = rd.template(this.photoAttachTemplate, {
                        extraClass: link.domain,
                        imgUrl: schema.thumb,
                        imgClass: link.domain,
                        href: schema.href,
                        title: schema.title,
                        userName: schema.userName,
                        realName: schema.realName,
                        description: schema.description
                    });

                    this.addAttachment(html, 'photo');

                    return true;
                }
            ]
        }
    });
});

