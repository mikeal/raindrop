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
["run", "rd", "dojo", "rdw/Message"], function (
  run,   rd,   dojo,   Message) {

    /*
    Applies a display extension to rdw/Message.
    Allows showing links included in the message as inline attachments
    */
    rd.addStyle("rdw/ext/css/MessageVimeoLinkAttachments");
    
    rd.applyExtension("rdw/ext/MessageVimeoLinkAttachments", "rdw/Message", {
        addToPrototype: {
            linkHandlers: [
                function (link) {
                    //NOTE: the "this" in this function is the instance of rdw/Message.
        
                    //See if link matches the schema on message.
                    var schema = this.msg.schemas["rd.msg.body.quoted.hyperlinks.vimeo"],
                        html;
                    if (!schema || link.indexOf('vimeo.com/' + schema.id) === -1) {
                        return false;
                    }
    
                    html = '<div class="vimeo video link hbox">' +
                           '    <div class="thumbnail boxFlex0"><a target="_blank\" " + href + ">' +
                           '    <img src="' + schema.thumbnail_small + '" class="vimeo"></a>' +
                           '    <div class="play"></div>' +
                           '    </div>' +
                           '    <div class=\"information boxFlex1\">' +
                           '        <a target="_blank" class="title" href="http://vimeo.com/' + schema.id + '">' +
                                    schema.title + '</a>' +
                           '        <abbr class="owner">' + schema.user_name + '</abbr>' +
                           '        <div class="description">' + schema.description + '</div>'  +
                           '    </div>' +
                           '</div>';
    
                    this.addAttachment(html, 'link');
    
                    return true;
                }
            ]
        }
    });
});
