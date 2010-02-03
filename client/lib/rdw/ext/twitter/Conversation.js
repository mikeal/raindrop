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

require.def("rdw/ext/twitter/Conversation",
["rd", "dojo", "rdw/Conversation", "rdw/ext/twitter/Message",
 "text!rdw/ext/twitter/Conversation!html"],
function (rd, dojo, Conversation, Message, template) {

    /**
     * Groups twitter broadcast messages into one "conversation"
     */
    return dojo.declare("rdw.ext.twitter.Conversation", [Conversation], {
        //The name of the constructor function (module) that should be used
        //to show individual messages.
        messageCtorName: "rdw/ext/twitter/Message",

        templateString: template,

        /**
         * Determines if the widget can support this conversation.
         *
         * @param conversation {object} the conversation API object.
         */
        canHandle: function (conversation) {
            var msg = conversation.messages[0];
            return !this.conversation && conversation.message_ids[0][0] === "tweet";
        }
    });
});
