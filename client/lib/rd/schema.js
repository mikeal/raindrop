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

require.def("rd/schema",
function () {

    return {
        /**
         * Finds a match in the schema._multiples area for a given
         * schema name, see if a property name matches the value.
         * Will also use the plaing schema item if there are no multiples.
         * @param {Object} msg the message object from the server API
         * @param {"String"} schemaId
         * @param {String} prop
         * @param {String} value
         */
        getMsgMultipleMatch: function(msg, schemaId, prop, value) {
            var list = (msg._multiples && msg._multiples[schemaId]) || [msg.schemas[schemaId]],
                i, item, match = null;
            if (list && list.length && list[0]) {
                for (i = 0; (item = list[i]); i++) {
                    if (item[prop] === value) {
                        match = item;
                        break;
                    }
                }
            }
            return match;
        }
    };
});

