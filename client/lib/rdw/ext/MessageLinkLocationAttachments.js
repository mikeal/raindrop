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

require.modify("rdw/Message", "rdw/ext/MessageLinkLocationAttachments",
["require", "rd", "dojo", "rd/schema", "rdw/Message"], function (
  require,   rd,   dojo,   rdSchema,    Message) {

    rd.addStyle("rdw/ext/css/MessageLinkLocationAttachments");

    /* Applies a display extension to rdw/Message.
      Designed to show venue type location links specific to foursquare.com right now
    */
    rd.applyExtension("rdw/ext/MessageLinkLocationAttachments", "rdw/Message", {
        addToPrototype: {
            linkHandlers: [
                function (link) {
                    //NOTE: the "this" in this function is the instance of rdw/Message.

                    //See if link matches the schema on message.
                    var schema = rdSchema.getMsgMultipleMatch(this.msg, "rd.msg.body.attachment.link.foursquare", "ref_link", link.url),
                        html, template;
                    if (!schema) {
                        return false;
                    }
                    template = '<div class="location link hbox">' +
                               '  <div class="thumbnail boxFlex0">' +
                               '  </div>' +
                               '  <div class="information boxFlex1">' +
                               '    <div class="name">${name}</div>' +
                               '    <div class="address">${address}</div>' +
                               '    <div class="city">${city}</div>' +
                               '    <div><a href="${href}" class="link">${link}</a></div>' +
                               '  </div>' +
                               '</div>';
                    html = rd.template(template, {
                        q       : encodeURIComponent(schema.venue.name + " " + schema.venue.address + " " + schema.venue.city),

                        geolat  : schema.venue.geolat,
                        geolong : schema.venue.geolong,
                        // XXX API KEY this key is only good for 127.0.0.1
                        key     : "ABQIAAAAqVZbLKBCznFQ46dDHPptjRRi_j0U6kJrkFvY4-OX2XYmEAa76BQcyjGXWTk_Abw-Vka5798pOTnknA",

                        name    : schema.venue.name,
                        address : schema.venue.address,
                        city    : schema.venue.city,

                        href    : 'http://foursquare.com/venue/' + schema.venue.id,
                        link    : 'http://foursquare.com/venue/' + schema.venue.id
                    });

                    this.addAttachment(html, 'link');

                    return true;
                }
            ]
        }
    });
});

