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

function(head, req) {
  var row;
  send('{"rows": [');

  var identity = req.query.identity || "";
  var type = req.query.type || "";

  //Generate case-insensitive regexp matching at the start
  //of strings or word boundaries.
  var re = new RegExp("(\\b|^)" + identity.replace(/\\/g, "\\\\"), "i");

  var prefix = "";
  while((row = getRow(true))) {
    var id_id = row.value.rd_key[1];
    if ((!type || id_id[0] == type) && re.test(id_id[1])) {
        send(prefix + toJSON(row));
        if (!prefix) {
          prefix = ",";
        }
    }
  };
  send("]}");
};
