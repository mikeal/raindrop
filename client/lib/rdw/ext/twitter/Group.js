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
/*global run: false */
"use strict";

run("rdw/ext/twitter/Group",
["rd", "dojo", "rdw/Conversation", "rdw/fx/wiper"],
function (rd, dojo, Conversation, wiper) {

    /**
     * Groups twitter broadcast messages into one "conversation"
     */
    return dojo.declare("rdw.ext.twitter.Group", [Conversation, wiper], {
        templateString: '<div class="WidgetBox rdwExtTwitterGroup rdwExtAccountGroup" dojoAttachPoint="headNode">' +
                        '    <div class="WidgetHeader hbox">' +
                        '       <a href="#rd:twitter" dojoAttachPoint="nameNode" class="title start boxFlex">Twitter</a>' +
                        '       <span class="actions">' +
                        '            <span class="action broadcastCount" dojoAttachPoint="broadcastCountNode"></span>' +
                        '            <span class="action noteCount" dojoAttachPoint="noteCountNode"></span>' +
                        '            <button class="wipeToggle" dojoAttachPoint="headNode" dojoAttachEvent="onclick: toggleWiper"></button>' +
                        '       </span>' +
                        '    </div>' +
                        '    <div class="WidgetBody" dojoAttachPoint="bodyNode">' +
                        '        <div class="tweetList" dojoAttachPoint="containerNode"></div>' +
                        '    </div>' +
                        '</div>',
    
        /**
         * The relative importance of this group widget. 0 is most important.
         */
        groupSort: 1,
    
        /**
         * The limit of tweets to use.
         */
        unreadReplyLimit: 2,
    
        /**
         * Do not format messages greater than the first one as replies
         */
        replyStyle: "",
    
        /**
         * sorting to use for messages. Unlike rdw.Conversation, the twitter timeline
         * should show most recent tweet first. This method should not use
         * the "this" variable.
         */
        msgSort: function (a, b) {
            return a.schemas["rd.msg.body"].timestamp < b.schemas["rd.msg.body"].timestamp;
        },
    
        /**
         * storage for notification messages. An array.
         */
        noteMsgs: null,
    
        /**
         * Widget lifecycle method, called before template is generated.
         */
        postMixInProperties: function () {
            this.inherited("postMixInProperties", arguments);
            this.noteMsgs = [];
        },
    
        /**
         * Widget lifecycle method, called after template is in the DOM.
         */
        postCreate: function () {
            this.inherited("postCreate", arguments);
            this.wiperInit("open");
        },
    
        /**
         * Determines if the widget can support this conversation.
         *
         * @param conversation {object} the conversation API object.
         */
        canHandle: function (conversation) {
            var msg = conversation.messages[0],
                keyType = msg.schemas["rd.msg.body"] && msg.schemas["rd.msg.body"].rd_key[0],
                notification = msg.schemas["rd.msg.notification"],
                notifyType = notification && notification.type;

            return keyType === "tweet" || notifyType === "twitter";
        },
    
    
        /**
         * Adds a message to this group.
         *
         * @param conversation {object} the conversation for this widget.
         */
        addConversation: function (conversation) {
            if (conversation) {
                this.conversation = conversation;
            }
    
            var msg = this.conversation.messages[0], messages;
            if (msg.schemas["rd.msg.notification"]) {
                this.noteMsgs.push(msg);
            } else {
                //A regular broadcast message. Pull the messages out of the conversation.
                messages = conversation.messages;
                if (messages && messages.length) {
                    this.msgs.push.apply(this.msgs, conversation.messages);
                }
            }
    
            if (this._displayed) {
                this.display();
            }
        },
    
        /**
         * Extends base class implementation of display to do subclass-specific rendering.
         */
        display: function () {
            this.inherited("display", arguments);
    
            //Update the notification and broadcast counts.
            this._updateCount(this.noteCountNode, this.noteMsgs.length);
            this._updateCount(this.broadcastCountNode, this.msgs.length);
        },
    
        _updateCount: function (node, count) {
            if (count) {
                node.innerHTML = count;
                node.style.display = "";
            } else {
                node.style.display = "none";
            }
        }
    });
});
