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

require.def("rd/api/me",
["rd", "dojo", "rd/api", "rd/accountIds", "rd/api/identity"],
function (rd, dojo, api, accountIds, identity) {
    var me = {
        /**
         * @private
         * loads the account info just one time.
         *
         * @param dfd {dojo.Deferred} a deferred to call when loading is complete.
         */
        _load: function (dfd) {
            //If the request has not been triggered, do it now.
            if (!this._dfd) {
                this._dfd = new dojo.Deferred();

                api().identity({
                    ids: accountIds
                })
                .ok(this, function (identities) {
                    this._dfd.callback(identities);
                })
                .error(this._dfd);
            }
    
            //Now register the dfd with the private callback.
            this._dfd.addCallback(dfd, "callback");
            this._dfd.addErrback(dfd, "errback");
        }
    };

    api.extend({
        /**
         * Retrieves identities associated with current user account.
         */
        me: function () {
            me._load(this._deferred);
            return this;
        }
    });
    
    return me;
});
