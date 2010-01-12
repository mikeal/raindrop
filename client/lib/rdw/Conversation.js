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
/*global run: false, location: true */
"use strict";

run("rdw/Conversation",
["run", "rd", "dojo", "dojo/string", "rd/api", "rd/api/identity", "rd/friendly", "rd/hyperlink", "rdw/_Base", "rdw/Message",
 "text!rdw/templates/Conversation!html", "text!rdw/templates/impersonal!html"],
function (run, rd, dojo, string, api, identity, friendly, hyperlink, Base, Message, template, impersonalTemplate) {

    return dojo.declare("rdw.Conversation", [Base], {
        //Holds the conversatino object fetched from the API.
        conversation: null,
    
        //Flag for displaying the messages as soon as the
        //instance is created. If false, then the display()
        //method will need to be called at the appropriate time.
        displayOnCreate: true,
    
        //The name of the constructor function (module) that should be used
        //to show individual messages.
        messageCtorName: "rdw/Message",
    
        //Limit to number of unread replies to show. If value is -1, then it means
        //show all replies, read and unread.
        unreadReplyLimit: -1,
    
        //A style to add to any messages that are replies.
        replyStyle: "reply",
    
        //Indicates if reply messages should be allowed to have focus.
        allowReplyMessageFocus: true,
    
        //The names of the helper widgets that
        //handle reply and forward. By extending
        //rdw/Message, you can modify the widgets used
        //for these actions.
        replyWidget: "rdw/ReplyForward",
        forwardWidget: "rdw/ReplyForward",
    
        templateString: template,
    
        moreMessagesTemplate: '<a class="moreMessages" href="#${url}">&#9654; ${message}</a>',
    
        impersonalTemplate: impersonalTemplate,

        /**
         * default message sorting is by timestamp, most
         * recent message is last.
         */
        msgSort: function (a, b) {
            //This method should not use
            //the "this" variable.
            return a.schemas["rd.msg.body"].timestamp > b.schemas["rd.msg.body"].timestamp;
        },

        /** dijit lifecycle method, before template in DOM */
        postMixInProperties: function () {
            this.inherited("postMixInProperties", arguments);
            this.msgs = this.conversation.messages;
        },

        /** dijit lifecycle method, after template in DOM */
        postCreate: function () {
            this.inherited("postCreate", arguments);
            if (this.displayOnCreate) {
                this.display();
            }
        },

        /**
         * Handles clicks for tool actions. Uses event
         * delegation to publish the right action.
         * @param {Event} evt
         */
        onClick: function (evt) {
            var href = evt.target.href,
                    isButton = evt.target.nodeName.toLowerCase() === "button",
                    module, bodySchema;
            if (!href && isButton) {
                href = "#" + evt.target.name;
            }
    
            if (href && (href = href.split("#")[1])) {
                if (href === "reply" || href === "forward") {
                    //Dynamically load the module that will handle
                    //the Reply/Forward action.
                    module = this[href + "Widget"];
                    run([module], dojo.hitch(this, function (Ctor) {
                        //If we have an existing response widget, despose of it properly.
                        if (this.responseWidget) {
                            this.removeSupporting(this.responseWidget);
                            this.responseWidget.destroy();
                        }

                        //Create the new response widget.
                        this.responseWidget = new Ctor({
                            owner: this,
                            replyType: href,
                            msg: this.lastDisplayedMsg
                        });

                        this.addSupporting(this.responseWidget);

                        //Put the response widget in the toolDisplay
                        this.responseWidget.placeAt(this.toolDisplayNode);
                    }));
                    evt.preventDefault();
                } else if (href === "archive" || href === "delete" || href === "spam") {
                    rd.pub("rdw/Conversation/" + href, this, this.conversation);
                    dojo.stopEvent(evt);
                } else if (href === "impersonal") {
                    if (this.headerNode) {
                        //Make sure there is not an existing impersonal UI
                        dojo.query(".newImpersonal", this.domNode).remove();
    
                        //Now add the UI
                        dojo.query(this.headerNode).after(this.impersonalTemplate);
                    }
                    dojo.stopEvent(evt);
                } else if (href === "createImpersonal") {
                    //Create
                    bodySchema = this.msgs[0].schemas["rd.msg.body"];
                    api().identityRecipTarget({
                        id: bodySchema.from,
                        sourceSchema: bodySchema,
                        target: "broadcast"
                    })
                    .ok(this, function () {
                        //Notify UI listeners that there is a new impersonal
                        //schema.
                        rd.pub("rd-impersonal-remove-from", bodySchema.from);
                    });

                    //Do not let this action escape.
                    dojo.stopEvent(evt);
                } else if (href === "cancelImpersonal") {
                    //Get rid of the impersonal UI
                    dojo.query(".newImpersonal", this.domNode).remove();
                    //Do not let this action escape.
                    dojo.stopEvent(evt);
                } else if (isButton) {
                    location = "#" + href;
                }
            }
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
            var messages = conversation.messages;
            if (messages && messages.length) {
                this.msgs.push.apply(this.msgs, conversation.messages);
            }
    
            if (this._displayed) {
                this.display();
            }
        },

        /** Displays the messages in the conversation. */
        display: function () {
            var schemas = this.msgs[0].schemas, target, targetName, convoId,
                //Set the limit to fetch. Always show the first message, that is why there is
                //a -1 for the this.conversation.messages.length branch.
                limit = this.msgs.length,
                showUnreadReplies = this.unreadReplyLimit > -1,
                msgLimit = showUnreadReplies ? this.unreadReplyLimit + 1 : limit,
                toShow = [0], i, msg, seen, len, refIndex, index,
                notShownCount, lastWidget, html,
                Ctor = run.get(this.messageCtorName);

            //Set the state as displayed, in case widgets are refreshed for extensions.
            this.displayOnCreate = true;
            this._displayed = true;
    
            //Clean up any existing widgets.
            this.destroyAllSupporting();
    
            // Sort by date
            this.msgs.sort(this.msgSort);
    
            //Set classes based on first message state.
            if (schemas["rd.msg.archived"] && schemas["rd.msg.archived"].archived) {
                dojo.addClass(this.domNode, "archived");
            } else {
                dojo.removeClass(this.domNode, "archived");
            }
            if (schemas["rd.msg.deleted"] && schemas["rd.msg.deleted"].deleted) {
                dojo.addClass(this.domNode, "deleted");
            } else {
                dojo.removeClass(this.domNode, "deleted");
            }
    
            //Set the header info.
            //Get the conversation type from the last message received
            //If a person replies to a message you sent we don't want it to look like a
            //"from you" message as much as it is a direct reply/conversation
            //XXX this should probably know what the last message showing is
            target = (this.msgs[this.msgs.length - 1].schemas['rd.msg.recip-target'] && this.msgs[this.msgs.length - 1].schemas['rd.msg.recip-target'].target) || "";
            targetName = target && this.i18n["targetLabel-" + target];
            if (targetName && this.typeNode) {
                rd.escapeHtml(targetName, this.typeNode, "only");
                dojo.addClass(this.typeNode, target);
                dojo.addClass(this.domNode, target);
            }
    
            //Set up the link for the full conversation view action, and set the subject.
            if (this.conversation.id) {
                convoId = "rd:conversation:" + JSON.stringify(this.conversation.id);
                if (this.subjectNode) {
                    dojo.attr(this.subjectNode, "href", "#" + convoId);
                }
                if (this.expandNode) {
                    dojo.attr(this.expandNode, "name", convoId);
                }
            }
            if (this.subjectNode) {
                rd.escapeHtml(hyperlink.add(rd.escapeHtml(this.conversation.subject || "")), this.subjectNode, "only");
            }
    
            dojo.addClass(this.domNode, (this.conversation.unread ? "unread" : "read"));

            //Now figure out how many replies to show. Always show the first message.
            for (i = 1; (i < limit) && (msg = this.msgs[i]); i++) {
                seen = msg.schemas["rd.msg.seen"];
                if (!showUnreadReplies || (showUnreadReplies && toShow.length < msgLimit && (!seen || !seen.seen))) {
                    toShow.push(i);
                }
            }

            //If the unread messages are not enough, choose some read messages.
            if (showUnreadReplies && toShow.length < msgLimit) {
                if (toShow.length === 1) {
                    //All replies are read. Choose the last set of replies.
                    len = this.msgs.length;
                    for (i = len - 1; i > 0 && i > len - msgLimit; i--) {
                        toShow.splice(1, 0, i);
                    }
                } else {
                    //Got at least one Reply. Grab the rest by finding the first unread
                    //reply, then working back from there.
                    refIndex = toShow[1];
                    for (i = refIndex - 1; i > 0 && toShow.length < msgLimit; i--) {
                        toShow.splice(1, 0, i);
                    }
                }
            }

            //Now render widgets for all the messages that want to be shown.
            for (i = 0; ((index = toShow[i]) > -1) && (msg = this.msgs[index]); i++) {
                this.lastDisplayedMsg = msg;
                this.addSupporting(new Ctor({
                    msg: msg,
                    type: index === 0 ? "" : this.replyStyle,
                    tabIndex: index === 0 || this.allowReplyMessageFocus ? 0 : -1
                }, dojo.create("div", null, this.containerNode)));
            }

            //If any left over messages, then show that info.
            notShownCount = this.msgs.length - toShow.length;
            if (notShownCount) {
                //Find last widget.
                lastWidget = this._supportingWidgets[this._supportingWidgets.length - 1];
                //Set up the link for the more action. Need the conversation ID.
                convoId = lastWidget.msg &&
                          lastWidget.conversation &&
                          lastWidget.conversation.id;

                if (lastWidget && lastWidget.actionsNode) {
                    html = string.substitute(this.moreMessagesTemplate, {
                        url: convoId ? "rd:conversation:" + dojo.toJson(convoId) : "",
                        message: string.substitute(this.i18n.moreMessages, {
                            count: notShownCount,
                            messagePlural: (notShownCount === 1 ? this.i18n.messageSingular : this.i18n.messagePlural)
                        })
                    });
                    dojo.place(html, lastWidget.actionsNode, 2);
                }
            }
        },

        /**
         * Called by this.responseWidget's instance, if it knows
         * that it has been destroyed.
         */
        responseClosed: function () {
            this.removeSupporting(this.responseWidget);
        }
    });
});
