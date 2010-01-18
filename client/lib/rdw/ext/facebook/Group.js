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

run.def("rdw/ext/facebook/Group",
["rd", "dojo", "rdw/conversation/GenericGroup"],
function (rd, dojo, GenericGroup) {

    return dojo.declare("rdw.ext.facebook.Group", [GenericGroup], {
        /**
         * The relative importance of this group widget. 0 is most important.
         */
        groupSort: 1,
    
        /**
         * Determines if message is supported.
         *
         * @param conversation {object} the conversation API object.
         */
        canHandle: function (conversation) {
            var msg = conversation.messages[0],
                notification = msg.schemas["rd.msg.notification"];
    
            return notification && notification.type === "facebook";
        },
        
        postMixInProperties: function () {
            this.inherited("postMixInProperties", arguments);
            this.groupTitle = "Facebook Notifications";
        },
    
        postCreate: function () {
            this.inherited("postCreate", arguments);
            dojo.removeClass(this.domNode, "rdwConversationGenericGroup");
            dojo.addClass(this.domNode, "rdwExtAccountGroup rdwExtFacebookGroup");
        }
    });
});
