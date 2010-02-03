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
/*global require: false */
"use strict";

require.def("rdw/Loading",
["rd", "dojo", "rdw/_Base"], function (
  rd,   dojo,   Base) {

    //Turn on io event publishing in dojo,
    //if no specific preference has already been set.
    if (!("ioPublish" in dojo.config)) {
        dojo.config.ioPublish = true;
    }

    //A widget that shows a loading indicator whenever there is an outstanding
    //IO request.
    return dojo.declare("rdw.Loading", [Base], {
        templateString: '<div class="rdwLoading">${i18n.loading}</div>',

        /** Dijit lifecycle method, after template is in the DOM. */
        postCreate: function () {
            this.domNode.style.display = "none";
            this.subscribe("/dojo/io/start", "ioStart");
            this.subscribe("/dojo/io/send", "ioSend");
            this.subscribe("/dojo/io/stop", "ioStop");
        },

        /**
         * Only listen to iosend in case this widget is instantiated after
         * io calls start.
         */
        ioSend: function () {
            this.ioStart();
        },

        /** Triggered when there is at least one oustanding IO request. */
        ioStart: function () {
            this.domNode.style.display = "";
        },

        /** Triggered when all outstanding IO reqeusts stop. */
        ioStop: function () {
            this.domNode.style.display = "none";
        }
    });
});
