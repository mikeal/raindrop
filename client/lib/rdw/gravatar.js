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

dojo.provide("rdw.gravatar");

dojo.require("dojox.encoding.digests.MD5");

;(function(){
  var digests = dojox.encoding.digests;
  
  rdw.gravatar = {
    _store: {},

    get: function(/*String*/email) {
      //summary: gets the gravatar URL given an email address.
      var digest = this._store[email];
      if (!digest) {
        digest = this._store[email] = digests.MD5(email, digests.outputTypes.Hex);
      }
      return "http://www.gravatar.com/avatar/" + digest + ".jpg?d=wavatar&s=48";
    }
  };

})();
