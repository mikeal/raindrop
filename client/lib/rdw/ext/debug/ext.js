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
/*global run: false, document: false */
"use strict";

run.def("rdw/ext/debug/ext",
["run", "rd", "dojo", "dijit", "text!rdw/ext/debug/template!html"], function (
  run,   rd,   dojo, dijit, template) {

    rd.addStyle("rdw/ext/debug/ext");

    var debug = {
        /** Holds on to instance of WidgetSelector to notify of a selection. */
        displayWidget: null,

        /** Remembers if debug widget is showing */
        debugShowing: false,

        /**
         * Handles keypress for invoking debug window.
         * @param {Event} evt
         */
        onKeyPress: function (evt) {
            if (evt && evt.charCode === 47 && evt.ctrlKey && evt.shiftKey) {
                if (this.debugShowing) {
                    this.hide();
                } else {
                    this.show();
                }
            }
        },

        /**
         * Shows the debug show
         */
        show: function () {
            if (!this.debugNode) {
                this.debugNode = dojo.create('div', {
                    "class": "rdwExtDebug",
                    innerHTML: template
                }, dojo.body());
                dojo.connect(this.debugNode, "onclick", this, "onDebugClick");
            }
            if (!this.debugShowing) {
                this.debugNode.style.display = "block";
                this.debugShowing = true;
            }
        },

        /**
         * Shows the debug show
         */
        hide: function () {
            if (this.debugShowing) {
                this.debugNode.style.display = "none";
                this.debugShowing = false;
            }
        },

        /**
         * Handles clicks in the debug UI. Dispatches via href fragment IDs
         * to methods on this object.
         * @param {Event} evt
         */
        onDebugClick: function (evt) {
            var href = evt.target.href;
            if (href) {
                this[href.split("#")[1]](evt.target);
                dojo.stopEvent(evt);
            }
        },

        /**
         * Click handler for the "show widget data" link
         * @param {DOMNode} node
         */
        onShowWidget: function(node) {
            if (this.selectingWidget) {
                this.stop();
                this.showOptionNode.innerHTML = "Show widget data in console";
                this.selectingWidget = false;
            } else {
                this.start();
                if (!this.showOptionNode) {
                    this.showOptionNode = node;
                }
                this.showOptionNode.innerHTML = "Cancel widget selection";
                this.selectingWidget = true;
            }
        },

        /**
         * Starts the tracking of the mouse for widget selection and
         * binds to a displayWidget to tell it what widget gets selected.
         * @param {Object} displayWidget
         */
        start: function (displayWidget) {
            this.displayWidget = displayWidget;
    
            this.moveHandle = dojo.connect(document.documentElement, "onmousemove", this, "onMouseMove");
            this.clickHandle = dojo.connect(document.documentElement, "onclick", this, "onClick");
        },

        /**
         * Stops the tracking of the mouse for widget selection, and
         * general cleanup.
         */
        stop: function () {
            this.displayWidget = null;
            this._forgetWidget();
            dojo.disconnect(this.moveHandle);
            dojo.disconnect(this.clickHandle);
        },

        /** As the user moves the mouse, highlight appropriate widget. */
        onMouseMove: function (evt) {
            //Find parent widget.
            var widget = dijit.getEnclosingWidget(evt.target);

            if (widget !== this.widget) {
                this._forgetWidget();
                this.widget = widget;
                if (this.widget) {
                    dojo.addClass(this.widget.domNode, "rdwExtDebugSelector");
                    this._updateLabel();
                }
            }
        },

        /** As user clicks on an element, tell the displayWidget about it. */
        onClick: function (evt) {
            try {
                console.log(this.widget);
            } catch (e) {
                //In some cases we might not get notified if the displayWidget's window
                //is destroyed, so assume if an error here, then stop.
                this.stop();
            }
            this._forgetWidget();
            this.onShowWidget();
        },

        /**
         * Gets rid of a reference to the widget to help avoid leaks,
         * bad refreshes of data.
         */
        _forgetWidget: function (widget) {
            if (this.widget) {
                dojo.removeClass(this.widget.domNode, "rdwExtDebugSelector");
                this.widget = null;
                if (this.labelNode) {
                    this.labelNode.style.display = "none";
                }
            }
        },

        /**
         * Positions label about the widget in upper left corner.
         */
        _updateLabel: function () {
            if (!this.labelNode) {
                this.labelNode = dojo.create("div", {
                    "class": "rdwExtDebugSelectorLabel"
                }, dojo.body());
            }
    
            var coords = dojo.coords(this.widget.domNode, true),
                style = this.labelNode.style;
            style.top = coords.y + "px";
            style.left = coords.x + "px";
            this.labelNode.innerHTML = this.widget.declaredClass;
            style.display = "block";
        }
    };

    run.ready(function () {
        //Set up keyboard shortcut to enable the debug display.
        var keypressId = dojo.connect(dojo.doc, "onkeypress", debug, "onKeyPress");
        
    });
});

