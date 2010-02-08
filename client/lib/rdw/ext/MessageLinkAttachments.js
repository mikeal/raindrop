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

require.modify("rdw/Message", "rdw/ext/MessageLinkAttachments",
["require", "rd", "dojo", "rdw/Message"], function(
  require,   rd,   dojo,   Message) {
    /*
    Applies a display extension to rdw/Message.
    Allows showing links included in the message as inline attachments
    */
    rd.applyExtension("rdw/ext/MessageLinkAttachments", "rdw/Message", {
        replace: {
            defaultLinkHandler: function (link) {
                //NOTE: the "this" in this function is the instance of rdw/Message.
                var html = '<div class="link hbox"><a target="_blank" href="'
                           + link.url + '">' + link.url + '</a></div>';
                this.addAttachment(html, "link");
            }
        }
    });
});
