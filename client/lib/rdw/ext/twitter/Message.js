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

run("rdw/ext/twitter/Message",
["rd", "dojo", "rdw/Message", "rd/contact", "text!rdw/ext/twitter/Message!html"],
function (rd, dojo, Message, contact, template) {

    return dojo.declare("rdw.ext.twitter.Message", [Message], {
        templateString: template,

        imgUrl: run.nameToUrl("rdw/resources/blank", ".png"),

        postCreate: function () {
            this.inherited("postCreate", arguments);

            //Load the twitter picture for the sender.
            contact.byIdentity(this.msg.schemas["rd.msg.body"].from, dojo.hitch(this, function (contact) {
                contact = contact[0];
                var url = contact && contact.twitter && contact.twitter.image;
                if (url) {
                    this.pictureNode.src = url;
                }
            }));
        }
    });
});
