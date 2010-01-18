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
/*global run: false, setTimeout: false */
"use strict";

run.def("rdw/Notify",
["rd", "dojo", "rdw/_Base", "dojo/string"],
function (rd, dojo, Base, string) {

    //A widget that shows a loading indicator whenever there is an outstanding
    //IO request.
    return dojo.declare("rdw.Notify", [Base], {
        templateString: '<div class="rdwNotify" dojoAttachEvent="onclick: onClick">' +
                        '    <div class="anim" dojoAttachPoint="animNode">' +
                        '        <div class="arrow" ></div>' +
                        '        <div class="messageWrap">' +
                        '        <span class="message" dojoAttachPoint="messageNode"></span>' +
                        '        <a class="undo" dojoAttachPoint="undoNode" href="#undo">undo</a>' +
                        '        </div>' +
                        '    </div>' +
                        '</div>',
    
        //The list of topics to accept.
        topics: {
            "rd-notify-delete": "del"        
        },
    
        //How many milliseconds to show the notification
        displayMillis: 5000,

        /**
         * Easing function for animations. This is a copy of
         * dojo.fx.easing.expoOut
         * @param {Decimal} [n]
         */
        animEasing: function (n) {
            return (n === 1) ? 1 : (-1 * Math.pow(2, -10 * n) + 1);
        },

        /**
         * Resets the animation properties.
         * @param {DOMNode} node
         */
        resetAnim: function (node) {
            dojo.style(node, {
                top: -30,
                opacity: 0
            });
        },

        /**
         * Starts the animation and returns the animation
         * object.
         * @param {DOMNode} node
         */ 
        startAnim: function (node) {
            var anim = dojo.anim(
                node,
                {
                    top: 0,
                    opacity: 1
                },
                2000,
                this.animEasing,
                
                dojo.hitch(this, function () {
                    //Remove the animation styles to let
                    //stylesheet have the final say.
                    dojo.style(node, {
                        top: "",
                        opacity: ""
                    });
    
                    //Show the message for a bit, then start the
                    //animation back.
                    setTimeout(dojo.hitch(this, function () {
                        dojo.anim(
                            node,
                            {
                                top: -30,
                                opacity: 0
                            },
                            2000,
                            this.animEasing,
                            dojo.hitch(this, function () {
                                this.animEnd();
                            })
                        ).play();
                    }), this.displayMillis);
                })
            );
    
            anim.play();
            this.anim = anim;
        },

        /** Dijit lifecycle method, after template is in the DOM. */
        postCreate: function () {
            this.domNode.style.display = "none";
    
            //Listen for notify events.
            var empty = {}, prop;
            for (prop in this.topics) {
                if (!(prop in empty)) {
                    this._sub(prop, this.topics[prop]);
                }
            }
        },

        /**
         * Subscribes to the topicName and dispatches to funcName,
         * saving off the info for undo actions.
         * @param {String} topicName
         * @param {String} funcName
         */
        _sub: function (topicName, funcName) {
            this.subscribe(topicName, dojo.hitch(this, function () {
                //Remember the topic name for triggering the undo action.
                this.currentTopic = topicName;
                this.currentTopicArgs = arguments;
    
                return this[funcName].apply(this, arguments);
            }));
        },

        /**
         * Figure out if undo action was triggered.
         * @param {Event} evt
         */
        onClick: function (evt) {
            var href = evt.target.href;
            if (href && (href = href.split("#")[1])) {
                if (href === "undo") {
                    //Trigger undo.
                    dojo.publish(this.currentTopic + "-undo", this.currentTopicArgs);
                    dojo.stopEvent(evt);
                }
            }
        },
    
        animEnd: function () {
            this.domNode.display = "none";
            delete this.anim;
        },

        /**
         * Shows the notify message for a bit.
         * @param {String} message
         * @param {Boolean} hideUndo
         */
        showNotify: function (message, hideUndo) {
            //Stop any in-process animation.
            if (this.anim) {
                this.anim.stop();
            }

            this.resetAnim(this.animNode);

            //Insert content into the notification.
            rd.escapeHtml(message, this.messageNode, "only");
            this.undoNode.style.display = hideUndo ? "none" : "";

            //Show the master node.
            this.domNode.style.display = "";

            //Start the animation.
            this.startAnim(this.animNode);
        },

        /**
         * A conversation was deleted
         * @param {Array} msgs
         */
        del: function (msgs) {
            var title = msgs[0]["rd.msg.body"];
            if (title) {
                title = title.subject || "";
            }
    
            this.showNotify(string.substitute(this.i18n.conversationDeleted, {
                title: title
            }));
        }
    });
});
