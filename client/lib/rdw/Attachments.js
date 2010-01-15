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

run("rdw/Attachments",
["rd", "dojo", "rdw/_Base", "text!rdw/templates/Attachments!html"],
function (rd, dojo, Base, template) {

    return dojo.declare("rdw.Attachments", [Base], {
        templateString: template,

        /**
         * @private tracks if the attachments have been displayed
         */
        _displayed: false,

        /**
         * The order in which to group the attachment types.
         */
        tabTypes: [
            "video",
            "photo",
            "file",
            "link"
        ],

        /**
         * The object dictionary to hold on to attachments based on type.
         * Set via postCreate.
         */
        types: null,

        /** The total count of attachments. */
        count: 0,

        postCreate: function () {
            this.inherited("postCreate", arguments);
            this.types = {};
        },

        /**
         * Adds an attachment. The HTML passed in should implement
         * the display of the attachment. The HTML may not be immediately visible
         * in the DOM. Normally the widget controlling rdw/Attachments will
         * call the display() method to finally render the attachments.
         * @param {String} html a string of HTML.
         * @param {String} type the type of attachment, "link" or "file".
         */
        add: function (html, type) {
            var list = this.types[type];
            if (!list) {
                list = this.types[type] = [];
            }

            list.push(html);
            this.count += 1;

            if (this._displayed) {
                this.display();
            }
        },

        /**
         * Displays the attachments. Normally attachments are added, then
         * the controlling widget will call display to render all the
         * attachments at once. If attachments are added after the first display
         * call, then the display() will be called again, wiping out the previous
         * display and regenerating.
         */
        display: function () {
            //First clear out any existing display.
            if (this._displayed) {
                this.displayNode.innerHTML = "";
            }
            this._displayed = true;

            var files = this.files, links = this.links, tabHtml = "", html = "",
                i, type, list, width, node;

            for (i = 0; (type = this.tabTypes[i]); i++) {
                list = this.types[type];
                if (!list || !list.length) {
                    continue;
                }

                //Generate the tabs for types of attachments
                tabHtml += '<div class="attachTab" data-type="' + type + '" data-count="' + list.length + '">' +
                           this.i18n["attachTab_" + type] +
                           '</div>';

                html += list.join('');
            }

            this.tabsNode.innerHTML = tabHtml;
            this.scrollNode.innerHTML = html;
        },

        onAction: function (evt) {
            
        },

        onNext: function (evt) {
            
        }
    });
});
