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

run("rdw/Summary",
["rd", "dojo", "rdw/_Base", "rd/api", "rd/api/contact"],
function (rd, dojo, Base, api, contact) {

    return dojo.declare("rdw.Summary", [Base], {
        templateString: '<div class="rdwSummary"></div>',

        /** Clears the summary display */
        clear: function () {
            this.destroySupportingWidgets();
            this.domNode.className = "rdwSummary";
            this.domNode.innerHTML = "";
        },

        /** Removes the supporting widgets */
        destroySupportingWidgets: function () {
            if (this._supportingWidgets && this._supportingWidgets.length) {
                var supporting;
                while ((supporting = this._supportingWidgets.shift())) {
                    supporting.destroy();
                }
            }
        },
    
        //**************************************************
        //start topic subscription endpoints
        //**************************************************
        /** Responds to rd-protocol-home topic. */
        home: function () {
            this.domNode.innerHTML = "<strong>Inflow</strong>";
        },

        /**
         * Responds to showing a full conversation.
         * @param {Object} conversation
         */
        conversation: function (conversation) {
            var title = conversation.subject || "",
                html = rd.escapeHtml(title) + '<div class="actions"><button name="archive">archive</button><button name="delete">delete</button></div>';
            this.domNode.innerHTML = html;
            dojo.addClass(this.domNode, "conversation");
        },

        /**
         * Responds to rd-protocol-contact topic
         * @param {String} contactId
         */
        contact: function (contactId) {
            api().contact({
                ids: [contactId]
            }).ok(this, function (contacts) {
                //Use megaview to select all messages based on the identity
                //IDs.
                var contact = contacts[0],
                    keys = dojo.map(contact.identities, dojo.hitch(this, function (identity) {
                        rd.escapeHtml("Person: " + contact.name + identity.rd_key[1], this.domNode);
                    }));
            });
        },

        /** Responds to rd-protocol-direct topic. */
        direct: function () {
        },

        /** Responds to rd-protocol-group topic. */
        group: function () {
            rd.escapeHtml("Recent group conversations", this.domNode);
        },

        /**
         * Responds to rd-protocol-locationTag topic.
         * @param {String} locationId
         */
        locationTag: function (locationId) {
            rd.escapeHtml("Folder location: " + locationId, this.domNode);
        },
    
        /**
         * Responds to rd-protocol-locationTag starred.
         * @param {String} locationId
         */
        starred: function (/*String*/locationId) {
            rd.escapeHtml("Starred Messages (unimplemented)", this.domNode);
        },
    
        /**
         * Responds to rd-protocol-sent topic.
         * @param {String} locationId
         */
        sent: function (/*String*/locationId) {
            rd.escapeHtml("Sent Messages", this.domNode);
        }
        //**************************************************
        //end topic subscription endpoints
        //**************************************************
    });
});
