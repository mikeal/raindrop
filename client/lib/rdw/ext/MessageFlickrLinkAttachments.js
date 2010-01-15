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

run.modify("rdw/Message", "rdw/ext/MessageFlickrLinkAttachments",
["run", "rd", "dojo", "rdw/Message"], function (
  run,   rd,   dojo,   Message) {

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
                    var schema = this.msg.schemas["rd.msg.body.flickr"],
                        template, templateObj, handled = false;
                    if (!schema || schema.ref_link !== link) {
                        return false;
                    }

                    //If URL does not match the flickr url then kick it out.
                    handled = dojo.some(schema.urls.url, function (url) {
                        return link === url._content;
                    });
                    if (!handled) {
                        return false;
                    }

                    template = '<div class="thumbnail boxFlex0">' +
                               '    <a target="_blank" href="${href}">' +
                               '      <img src="${img}" class="flickr">' +
                               '    </a>' +
                               '</div>' +
                               '<div class="information boxFlex1">' +
                               '  <a target="_blank" class="title" href="${href}">${content}</a>' +
                               '  <abbr class="owner" title="${username}">${realname}</abbr>' +
                               '  <div class="description">${description}</div>' +
                               '</div>';

                    templateObj = {
                        // http://www.flickr.com/services/api/misc.urls.html
                        href        : 'http://www.flickr.com/' + schema.owner.nsid + '/' + schema.id + '/',
                        // http://farm{farm-id}.static.flickr.com/{server-id}/{id}_{secret}_[mstb].jpg
                        img         : "http://farm" + schema.farm + ".static.flickr.com/" +
                                           schema.server + "/" + schema.id + "_" +
                                           schema.secret + "_s.jpg",
                        content     : schema.title._content,
                        username    : schema.owner.username,
                        realname    : schema.owner.realname,
                        description : schema.description._content
                    };

                    this.addAttachment('<div class="flickr photo link hbox">' + rd.template(template, templateObj) + '</div>', 'photo');

                    return true;
                }
            ]
        }
    });
});

