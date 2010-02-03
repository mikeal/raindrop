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

/*global require: false */
"use strict";

require.def("rdw/conversation/FullConversation",
["dojo", "rdw/Conversation", "rdw/conversation/FullMessage",
 "text!rdw/conversation/templates/FullConversation!html"],
function (dojo, Conversation, FullMessage, template) {
    return dojo.declare("rdw.conversation.FullConversation", [Conversation], {
        //The name of the constructor function (module) that should be used
        //to show individual messages.
        messageCtorName: "rdw/conversation/FullMessage",

        //A style to add to any messages that are replies.
        replyStyle: "",

        templateString: template
    });
});
