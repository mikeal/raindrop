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

run.def("rdw/ext/mailingList/GroupMessage",
["rd", "dojo", "rdw/Message", "text!rdw/ext/mailingList/GroupMessage!html"],
function (rd, dojo, Message, template) {

    return dojo.declare("rdw.ext.mailingList.GroupMessage", [Message], {
        templateString: template,

        postMixInProperties: function () {
            this.inherited("postMixInProperties", arguments);
            this.convoFromDisplay = this.msg.convoFromDisplay.join(", ");
            this.unreadDisplay = "";
            if (this.msg.convoUnreadCount && this.msg.convoUnreadCount > 1) {
                this.unreadDisplay = rd.template(this.i18n.newCount, {
                    count: this.msg.convoUnreadCount
                });
            } else {
                // in the future we should add a friendly date as there is only one new
                // message that has arrived in this conversation
            }

        }
    });
});
