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

run.def("rdw/Widgets",
["rd", "dojo", "dojox", "rdw/_Base", "rd/onHashChange", "rd/api", "rd/api/message",
 "rdw/conversation/Broadcast", "rdw/SummaryGroup", "dojo/fx", "dojox/fx/scroll"],
function (rd, dojo, dojox, Base, onHashChange, api, message, Broadcast, SummaryGroup, fx, fxScroll) {

    //Reassign fxScroll to be the real function, that module does something non-standard.
    fxScroll = dojox.fx.smoothScroll;

    return dojo.declare("rdw.Widgets", [Base], {
        //Array of conversations to show.
        //Warning: this is a prototype property,
        //be sure to always set it on the instance.
        conversations: [],
    
        //The max number of conversations to fetch from the API. Each conversation
        // will have a maxiumum of messageLimit messages returned.
        conversationLimit: 60,
    
        //The max number of messages to fetch from each conversation using the
        // conversation APIs.
        messageLimit: 3,
    
        //List of modules that can handle display of a conversation.
        //It is assumed that moduleName.prototype.canHandle(conversation) is defined
        //for each entry in this array.
        convoModules: [],
    
        //Widget used for default conversation objects, when no home group is applicable.
        conversationCtorName: "rdw/conversation/Broadcast",
    
        //Widget used for the summary group widget, the first one in the widget list.
        summaryGroupCtorName: "rdw/SummaryGroup",
    
        templateString: '<div class="rdwWidgets"></div>',
  
        /** Dijit lifecycle method after template insertion in the DOM. */
        postCreate: function () {
            this.subscribe("rd/onHashChange", "onHashChange");
            this.subscribe("rd-impersonal-add", "impersonalAdd");
            this.home();
        },

        /**
         * Dijit lifecycle method. Be sure to get rid
         * of anything we do not want if this widget is re-instantiated,
         * like for on-the-fly extension purposes.
         */
        destroy: function () {
            if (this.convoWidget) {
                this.convoWidget.destroy();
            }
            if (this.activeNode) {
                delete this.activeNode;
            }
            if (this.activeParentNode) {
                delete this.activeParentNode;
            }
            if (this.summaryActiveNode) {
                delete this.summaryActiveNode;
            }
            if (this.summaryWidget) {
                //This is also a supporting widget,
                //so no need to destroy it, just remove
                //the ref.
                delete this.summaryWidget;
            }

            this.inherited("destroy", arguments);
        },

        /**
         * Adds more conversations to the display. Called as a result of the
         * rd-impersonal-add topic, and the home rendering on first instantiation.
         * @param {Array} conversations
         */
        impersonalAdd: function (conversations) {
            //The home view groups messages by type. So, for each message in each conversation,
            //figure out where to put it.
            if (conversations && conversations.length) {
                this.conversations.push.apply(this.conversations, conversations);

                var i, convo, Handler, widget,
                     frag, zIndex, SummaryWidgetCtor, group;
                for (i = 0; (convo = conversations[i]); i++) {
                    //Feed the message to existing created groups.
                    if (!this._groupHandled(convo)) {
                        //Existing group could not handle it, see if there is a new group
                        //handler that can handle it.
                        Handler = this._getHomeGroup(convo);
                        if (Handler) {
                            widget = new Handler({
                                conversation: convo,
                                displayOnCreate: false
                            }, dojo.create("div"));
                            widget._isGroup = true;
                            this._groups.push(widget);
                            this.addSupporting(widget);
                        } else {
                            widget = this.createHomeConversation(convo);
                            this._groups.push(widget);
                            this.addSupporting(widget);
                        }
                    }
                }
            }

            this._groups.sort(function (a, b) {
                var aSort = "groupSort" in a ? a.groupSort : 100,
                        bSort = "groupSort" in b ? b.groupSort : 100;
                return aSort > bSort ? 1 : -1;
            });

            frag = dojo.doc.createDocumentFragment();
            zIndex = this._groups.length;

            //Create summary group widget and add it first to the fragment.
            if (!this.summaryWidget) {
              SummaryWidgetCtor = run.get(this.summaryGroupCtorName);
              this.summaryWidget = new SummaryWidgetCtor();
              //Want summary widget to be the highest, add + 1 since group work
              //below uses i starting at 0.
              this.addSupporting(this.summaryWidget);
              this.summaryWidget.placeAt(frag);
            }

            //Add all the widgets to the DOM and ask them to display.
            this.summaryWidget.domNode.style.zIndex = zIndex + 1;
            for (i = 0; (group = this._groups[i]); i++) {
                group.domNode.style.zIndex = zIndex - i;
                group.placeAt(frag);
                group.display();
            }

            //Inject nodes all at once for best performance.
            this.domNode.appendChild(frag);
        },

        /** Responds to rd-protocol-home topic. */
        home: function () {
            //reset stored state.
            this.conversations = [];
            //Indicate this is a collection of home conversations.
            this.conversations._rdwConversationsType = "home";
            this._groups = [];
    
            if (!this.convoWidgets) {
                run(this.convoModules, (dojo.hitch(this, function () {
                    this.convoWidgets = [];
                    var i, module, mod;
                    for (i = 0; (module = this.convoModules[i]); i++) {
                        mod = run.get(module);
                        this.convoWidgets.push(mod);
                    }
                    this.destroyAllSupporting();
                    this._renderHome();
                })));
            } else {
                this.destroyAllSupporting();
                this._renderHome();
            }
        },

        /** Does the actual display of the home view. */
        _renderHome: function () {
            api({
                url: 'inflow/conversations/impersonal',
                limit: this.conversationLimit,
                message_limit: this.messageLimit 
            }).ok(this, function (conversations) {
                this.impersonalAdd(conversations);
                //Update the state of widgets based on hashchange. Important for
                //first load of this widget, to account for current page state.
                this.onHashChange(onHashChange.value);
            });
        },

        /**
         * Just a placeholder function to allow extensions to grab on to it.
         * @param {String} hash
         */
        onHashChange: function (hash) {
        },

        /**
         * Creates a Conversation widget for the Home view. The Conversation widget
         * should not display itself immediately since prioritization of the home
         * widgets still needs to be done. Similarly, it should not try to attach
         * to the document's DOM yet. Override for more custom behavior/subclasses.
         * @param {Object} conversation
         * @returns {rdw/Conversation} an rdw/Conversation or a subclass of it.
         */ 
        createHomeConversation: function (conversation) {
            return new (run.get(this.conversationCtorName))({
                conversation: conversation,
                unreadReplyLimit: 1,
                displayOnCreate: false,
                allowReplyMessageFocus: false
            }, dojo.create("div"));
        },

        /**
         * If a group in the groups array can handle the conversation, give
         * it to that group and return true.
         * @param {Object} conversation
         * @returns {Boolean}
         */
        _groupHandled: function (conversation) {
            for (var i = 0, group; (group = this._groups[i]); i++) {
                if (group.canHandle && group.canHandle(conversation)) {
                    group.addConversation(conversation);
                    return true;
                }
            }
            return false;
        },

        /**
         * Determines if there is a home group that can handle the conversation.
         * @param {Object} conversation
         * @returns {rdw/Conversation} can return null
         */
        _getHomeGroup: function (/*Object*/conversation) {
            for (var i = 0, module; (module = this.convoWidgets[i]); i++) {
                if (module.prototype.canHandle(conversation)) {
                    return module;
                }
            }
            return null;
        }
    });
});
