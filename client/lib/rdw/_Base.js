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

require.def("rdw/_Base",
["rd", "dojo", "dijit/_Widget", "dijit/_Templated", "i18n!rdw/nls/i18n"],
function (rd, dojo, Widget, Templated, i18n) {
    /**
     * Base "class" for all rdw widgets.
     */
    return dojo.declare("rdw._Base", [Widget, Templated], {
        /** dijit lifecycle method, before template is in the DOM */
        postMixInProperties: function () {
            this.inherited("postMixInProperties", arguments);
    
            //Set default i18n bundle
            this.i18n = i18n;
        },

        /**
         * Pulls off the fragment ID of a link on the target element,
         * if there is one.
         * @param {Event} evt
         * @returns {String}
         */
        getFragmentId: function (evt) {
            //summary: 
            var frag = evt.target.href;
            if (frag) {
                frag = frag.split("#")[1];
            }
            return frag;
        },

        /**
         * Adds a supporting widget to the supportingWidgets array,
         * to assist with proper widget cleanup. Returns the same widget
         * as passed in to this function.
         * 
         * @param {dijit/_Widget} widget
         * @param {dijit/_Widget}
         */
        addSupporting: function (widget) {
            if (!this._supportingWidgets) {
                this._supportingWidgets = [];
            }
    
            this._supportingWidgets.push(widget);
            return widget;
        },
    
        /**
         * Removes a supporting widget from the supporting widgets
         * array. Useful if the supporting widget is destroyed before this
         * widget is destroyed.
         * @param {dijit/_Widget} widget
         */
        removeSupporting: function (widget) {
            if (!this._supportingWidgets) {
                var index = dojo.indexOf(this._supportingWidgets, widget);
                if (index > -1) {
                    this._supportingWidgets.splice(index, 1);
                }
            }
        },
    
        /**
         * destroys all supporting widgets, and removes them
         * from the _supportingWidgets array.
         * @param {Object} [skipTypes] property list of widget names to not remove.
         */
        destroyAllSupporting: function (skipTypes) {
            var supporting = this._supportingWidgets, widget, i;
            skipTypes = skipTypes || {};
            if (supporting && supporting.length) {
                for (i = supporting.length - 1; (widget = supporting[i]); i--) {
                    if (!skipTypes[widget.declaredClass]) {
                        widget.destroy();
                        supporting.splice(i, 1);
                    } 
                }
            }
        }
    });
});
