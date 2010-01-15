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
["run", "rd", "dojo", "rdw/Message"], function (
  run,   rd,   dojo,   Message) {
    /*
    Applies a display extension to rdw/Message.
    Allows showing links included in the message as inline attachments
    */

    rd.addStyle("rdw/ext/css/MessageBitlyLinkAttachments");

    rd.applyExtension("rdw/ext/MessageBitlyLinkAttachments", "rdw/Message", {
        addToPrototype: {
            linkHandlers: [
                function (link) {
                    //NOTE: the "this" in this function is the instance of rdw/Message.
                    var schema = this.msg.schemas["rd.msg.body.bit.ly"],
                          linkNode, templateObj, template, titleTemplate;
                    if (!schema || schema.ref_link !== link) {
                        return false;
                    }
    
                    template = '<a target="_blank" class="title" title="${longUrl}" href="${shortUrl}">${longUrl}</a>' +
                               '<span class="by">by</span> ' +
                               '<abbr class="owner">${owner}</abbr>';
    
                    titleTemplate = '<a target="_blank" class="title" title="${longUrl}" href="${shortUrl}">${title}</a>' +
                                    '<div class="description">${longUrl}</div>' +
                                    '<span class="by">by</span> ' +
                                    '<abbr class="owner">${owner}</abbr>';
    
                    templateObj = {
                        longUrl   : schema.longUrl,
                        shortUrl  : "http://bit.ly/" + schema.globalHash,
                        title     : schema.htmlTitle,
                        owner     : schema.shortenedByUser
                    };
    
                    //Check if a title is included and use the alt template
                    if (schema.htmlTitle) {
                        template = titleTemplate;
                    }

                    this.addAttachment('<div class="bitly link">' + rd.template(template, templateObj) + '</div>', 'link');
                    return true;
                }
            ]
        }
    });
});
