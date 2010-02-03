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

require.def("rdw/gravatar",
["rd", "dojox", "dojox.encoding.digests.MD5"],
function (rd, dojox) {
    var digests = dojox.encoding.digests;

    return {
        _store: {},

        /**
         * Gets the gravatar URL given an email address.
         * @param {String} email
         */
        get: function (email) {
            var digest = this._store[email];
            if (!digest) {
                digest = this._store[email] = digests.MD5(email, digests.outputTypes.Hex);
            }
            return "http://www.gravatar.com/avatar/" + digest + ".jpg?d=wavatar&s=48";
        }
    };
});
