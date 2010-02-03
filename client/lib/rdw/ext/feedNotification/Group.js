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

require.def("rdw/ext/feedNotification/Group",
["rd", "dojo", "rdw/conversation/GenericGroup"],
function (rd, dojo, GenericGroup) {

    return dojo.declare("rdw/ext/feedNotification/Group", [GenericGroup], {
        /**
         * The relative importance of this group widget. 0 is most important.
         */
        groupSort: 10,
    
        /**
         * Holds on to the ID for the feed.
         */
        feedId: "",
    
        /**
         * pulls the feed ID out of the msg's rss-entry schema.
         */
        getFeedId: function (msg) {
            return msg.schemas["rd.msg.rss-feed"] && msg.schemas["rd.msg.rss-feed"].feed_id;
        },
    
        /**
         * Determines if conversation is supported.
         *
         * @param conversation {object} the conversation API object
         */
        canHandle: function (conversation) {
            var feedId = this.getFeedId(conversation.messages[0]);
            return (feedId && !this.feedId) || (this.feedId === feedId);
        },
    
        postMixInProperties: function () {
            this.inherited("postMixInProperties", arguments);
            if (this.conversation) {
                var msg = this.conversation.messages[0];
                this.setTitle(msg);
                if (!this.feedId) {
                    this.feedId = this.getFeedId(msg);
                }
            }
        },
    
        /**
         * Sets the title given a message.
         *
         * @param {Object} msg the messsage object.
         */
        setTitle: function (msg) {
            var schema = msg && msg.schemas["rd.msg.rss-feed"];
            if (schema) {
                this.groupTitle = schema.title || "";
            }
        }
    });
});