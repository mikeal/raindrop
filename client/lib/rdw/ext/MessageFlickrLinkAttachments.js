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

require.modify("rdw/Message", "rdw/ext/MessageFlickrLinkAttachments",
["require", "rd", "dojo", "rd/schema", "rdw/Message"], function (
  require,   rd,   dojo,   rdSchema,    Message) {

    rd.addStyle("rdw/ext/css/MessageFlickrLinkAttachments");

    /* Applies a display extension to rdw/Message.
    Allows showing links included in the message as inline attachments
    */
    rd.applyExtension("rdw/ext/MessageFlickrLinkAttachments", "rdw/Message", {
        addToPrototype: {
            linkHandlers: [
                function (link) {
                    //NOTE: the "this" in this function is the instance of rdw/Message.

                    //See if link matches the schema on message.
                    var schema = rdSchema.getMsgMultipleMatch(this.msg, "rd.msg.body.flickr", "ref_link", link),
                        template, templateObj, handled = false;
                    if (!schema) {
                        return false;
                    }

                    // http://farm{farm-id}.static.flickr.com/{server-id}/{id}_{secret}_[mstb].jpg
                    imgUrl = "http://farm" + schema.farm + ".static.flickr.com/" +
                                        schema.server + "/" + schema.id + "_" +
                                        schema.secret + "_s.jpg";
    
                    // http://www.flickr.com/services/api/misc.urls.html
                    href = 'http://www.flickr.com/' + schema.owner.nsid + '/' + schema.id + '/';

                    html = rd.template(this.photoAttachTemplate, {
                        extraClass: "flickr",
                        imgUrl: imgUrl,
                        imgClass: "flickr",
                        href: href,
                        title: schema.title._content,
                        userName: schema.owner.username,
                        realName: schema.owner.realname,
                        description: schema.description._content
                    });

                    this.addAttachment(html, 'photo');

                    return true;
                }
            ]
        }
    });
});

