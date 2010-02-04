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

require.def("rdw/fx/wiper",
["dojo", "dojo/fx"],
function (dojo, fx) {
    /**
     * This is a mixin for widgets that what a TitlePane-like effect, something
     * where clicking on a "head" region toggles hiding/showing of the "body"
     * region.
     *
     * This mixin assumes that a widget will have a this.headNode and this.bodyNode
     * instance variables that represent the head and body of the wiped area.
     *
     * Widgets that use this mixin can all this.toggleWiper() to get the wipe in/
     * wipe out behavior. Call this.wiperInit() to set the initial state. Calling
     * this.wiperInit() is *mandatory*.
     */
    return dojo.declare("rdw.fx.wiper", null, {
        _wiperOpenClass: "rdwFxWiperOpen",
        _wiperClosedClass: "rdwFxWiperClosed",
        wipeTextShow: "+",
        wipeTextHide: "-",
    
        wiperDuration: 200,
    
        /**
         * Set the initial state.
         *
         * @param {String} state Initial state. Valid values are "open" or "closed".
         */
        wiperInit: function(state) {
            //Set up the animations.
            this._wipeIn = fx.wipeIn({
                            node: this.bodyNode,
                            duration: this.wiperDuration,
                            onBeforeStart: dojo.hitch(this, function() {
                                this.bodyNode.style.display = "";
                            }),
                            onEnd: dojo.hitch(this, function() {
                                this.headNode.innerHTML = this.wipeTextHide;
                            })
            });
            this._wipeOut = fx.wipeOut({
                            node: this.bodyNode,
                            duration: this.wiperDuration,
                            onEnd: dojo.hitch(this, function(){
                                            this.bodyNode.style.display="none";
                                            this.headNode.innerHTML = this.wipeTextShow;
                            })
            });
    
            state == "open" ? this.wipeIn(true) : this.wipeOut(true);
        },
    
        isWiperOpen: function() {
            return !dojo.hasClass(this.headNode, this._wiperClosedClass);
        },
    
        toggleWiper: function() {
            this.isWiperOpen() ? this.wipeOut() : this.wipeIn();
        },
    
        wipeIn: function(skipAnim) {
            //Set styles for head that say it is open.
            dojo.removeClass(this.headNode, this._wiperClosedClass);
            dojo.addClass(this.headNode, this._wiperOpenClass);
    
            if (skipAnim) {
                this.bodyNode.style.display = "";
                this.headNode.innerHTML = this.wipeTextHide;
            } else {
                this._wipeIn.play();
            }
        },
    
        wipeOut: function(skipAnim) {
            //Set styles for head that say it is open.
            dojo.addClass(this.headNode, this._wiperClosedClass);
            dojo.removeClass(this.headNode, this._wiperOpenClass);
    
            if (skipAnim) {
                this.bodyNode.style.display = "none";
                this.headNode.innerHTML = this.wipeTextShow;
            } else {
                this._wipeOut.play();
            }
        }
    });
});