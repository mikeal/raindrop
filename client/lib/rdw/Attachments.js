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

require.def("rdw/Attachments",
["rd", "dojo", "dojox", "rdw/_Base", "text!rdw/templates/Attachments!html", "dojox/fx/scroll"], function (
  rd,   dojo,   dojox,   Base,        template,                              fxScroll) {

    //Reassign fxScroll to be the real function, that module does something non-standard.
    fxScroll = dojox.fx.smoothScroll;

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

        /** The index of attachments to start on */
        attachIndex: 0,

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
            this.updateButtons();
        },

        /**
         * Easing function for animations. This is a copy of
         * dojo.fx.easing.expoOut
         * @param {Decimal} [n]
         */
        animEasing: function (n) {
            return (n === 1) ? 1 : (-1 * Math.pow(2, -10 * n) + 1);
        },

        /**
         * Handles actions in the action area, like next/previous.
         * @param {Event} evt
         */
        onAction: function (evt) {
            var target = evt.target, name = target.name, scrollTarget, marginBox;

            if (name === "rdwAttachmentsPrev" || name === "rdwAttachmentsNext") {
                if (name === "rdwAttachmentsPrev") {
                    this.attachIndex -= 1;
                    if (this.attachIndex < 0) {
                        this.attachIndex = 0;
                    }
                } else {
                    this.attachIndex += 1;
                    if (this.attachIndex > this.count - 1) {
                        this.attachIndex = this.count - 1;
                    }
                }

                marginBox = dojo.marginBox(this.displayNode);
                scrollTarget = this.attachIndex * marginBox.w;

                //Also stop any in-process animation for active node.
                if (this.anim) {
                    this.anim.stop();
                    this.anim = null;
                }

                this.anim = fxScroll({
                    win: this.displayNode,
                    target: { x: scrollTarget, y: 0},
                    easing: this.animEasing,
                    duration: 500,
                    onEnd: dojo.hitch(this, function () {
                        this.anim = null;
                    })
                });
                this.anim.play();

                this.updateButtons();
                dojo.stopEvent(evt);
            }
        },

        /**
         * Change the action buttons to reflect the right state.
         */
        updateButtons: function () {
            dojo.removeAttr(this.prevNode, "disabled");
            dojo.removeAttr(this.nextNode, "disabled");
            if (this.attachIndex === 0) {
                dojo.attr(this.prevNode, "disabled", "disabled");
            }
            if (this.attachIndex === this.count - 1) {
                dojo.attr(this.nextNode, "disabled", "disabled");
            }
        }
    });
});
