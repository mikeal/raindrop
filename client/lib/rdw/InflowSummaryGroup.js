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

/*jslint nomen: false, plusplus: false */
/*global run: false */
"use strict";

run("rdw/InflowSummaryGroup",
["rd", "dojo", "rdw/_Base", "rd/api"],
function (rd, dojo, Base, api) {

    rd.addStyle("rdw/InflowSummaryGroup");

    return dojo.declare("rdw.InflowSummaryGroup", [Base], {
        templateString: '<div class="rdwExtSummaryGroup"><strong>Inflow Summary</strong><ul dojoAttachPoint="containerNode"><li dojoAttachPoint="totalCountNode"></li></ul></div>',
  
        /** Dijit lifecycle method after template insertion in the DOM. */
        postCreate: function () {
            this.inherited("postCreate", arguments);
            this.apiHandle = api.subscribe("inflow/conversations/personal", this, "onApiUpdate");
        },
  
        /** Dijit lifecycle method. */
        destroy: function () {
            api.unsubscribe(this.apiHandle);
            this.inherited("destroy", arguments);
        },

        onApiUpdate: function (conversations) {
            var i, convo, unread = 0;
            if (!conversations || conversations.length === 0) {
                this.domNode.innerHTML = "No conversations";
            } else {
                for (i = 0; (convo = conversations[i]); i++) {
                    unread += convo.unread || 0;
                }
                //TODO: not localized.
                dojo.place('<span class="count">' + unread + '</span> unread message' + (unread !== 1 ? 's' : ''), this.totalCountNode, "only");
            }
        }
    });
});
