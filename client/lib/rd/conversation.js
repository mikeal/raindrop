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

run("rd/conversation",
["rd", "dojo", "rd/api"],
function (rd, dojo, api) {
    var conversation = {
        //Gets conversations based on message IDs passed in. ids can be one string
        //message document ID or an array of string message document IDs.
        messageKey: function (/*String|Array*/ids, /*Function*/callback, /*Function*/errback) {
            var apiInst = api({
                url: 'inflow/conversations/with_messages',
                keys: ids
            });
            if (callback) {
                apiInst.ok(callback);
            }
            if (errback) {
                apiInst.error(errback);
            }
        },

        //Gets the most recent messages up to a limit for a given imap folder
        //location ID, then pulls the conversations associated with those messages.
        //Conversation with the most recent message will be first.
        location: function (/*Array*/locationId, /*Number*/limit, /*Function*/callback, /*Function*/errback) {
            api().megaview({
                key: ["rd.msg.location", "location", locationId],
                reduce: false,
                limit: limit
            })
            .ok(this, function (json) {
                //Get message keys
                var keys = [], i, row;
                for (i = 0; (row = json.rows[i]); i++) {
                    keys.push(row.value.rd_key);
                }

                this.messageKey(keys, callback, errback);
            });
        }
    };

    return conversation;
});

