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

run("rdw/Widgets",
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
            rd.sub("rd/onHashChange", this, "onHashChange");
            this.home();
        },

        /**
         * Transitions the display to the appropriate
         * viewType. Basically, allow switching from a summary
         * of conversations to one conversation and back.
         * @param {String} viewType
         */
        transition: function (viewType) {
            //If showing another summary type, then clear out the saved summary
            if (!this.viewType || viewType === this.viewType && viewType === "summary") {
                this.summaryScrollHeight = 0;
            }
    
            //If transitioning away from summary, hold on to old activeNode
            if (viewType === "summary") {
                if (this.summaryActiveNode) {
                    this._setActiveNode(this.summaryActiveNode, "summary", true);
                }
            } else {
                this.summaryActiveNode = this.activeNode;
            }
    
            //Skip the animation on the first display of this widget.
            if (!this._postRender) {
                //Set the view type so next calls know the type.
                this.viewType = viewType;
                this._postRender = true;
                this.checkTransitionEnd();
                return;
            }
    
            if (this.viewType === viewType) {
                this.checkTransitionEnd();
            } else {
                if (!this.switchNode) {
                    this.switchNode = dojo.create("div", {
                        "class": "rdwConversationsSwipe"
                    }, dojo.body());
                }
                this.switchNode.className = "rdwConversationsSwipe " + viewType;
    
                //Do the transition in a timeout, to give the DOM a chance to render,
                //so DOM rendering work is not happening while the transition is going.
                setTimeout(dojo.hitch(this, function () {
                    //For summary view going to conversation view, remember the vertical scroll
                    //to restore it when switching back.
                    if (this.viewType !== "conversation") {
                        this.summaryScrollHeight = dojo.global.scrollY;
                    }

                    //Create a div used for scrolling.
                    if (!this._scrollNode) {
                        this._scrollNode = dojo.create("div", { "class": "scrollArea"});
                    }
        
                    //Fix the widths of divs for the scroll effect to work.
                    var newDomNodeWidth, newListNodeWidth, newConvoNodeWidth,
                        oldDomNodeWidth = this.domNode.style.width,
                        oldListNodeWidth, oldConvoNodeWidth, x, scrollHorizAnim,
                        scrollHeight, position, scrollVertAnim, chain;
                    this.domNode.style.width = (newDomNodeWidth = dojo.marginBox(this.domNode).w) + "px";
                    oldListNodeWidth = this.listNode.style.width;
                    this.listNode.style.width = newDomNodeWidth + "px";
                    oldConvoNodeWidth = this.convoNode.style.width;
                    this.convoNode.style.width = newDomNodeWidth + "px";
     
                    //Use the scrollNode as the parent, to make things easy to scroll.
                    this._scrollNode.appendChild(this.listNode);
                    this._scrollNode.appendChild(this.convoNode);
                    this.domNode.appendChild(this._scrollNode);
         
                    //Make sure both lists are visible.
                    this.listNode.style.display = "";
                    this.convoNode.style.display = "";
        
                    if (viewType === "conversation") {
                        this.domNode.scrollLeft = 0;
                        x = newDomNodeWidth;
                    } else {
                        this.domNode.scrollLeft = newDomNodeWidth;
                        x = 0;
                    }
    
                    //Create the args for the scroll over effect.
                    scrollHorizAnim = fxScroll({
                        win: this.domNode,
                        target: { x: x, y: 0},
                        easing: this.animEasing,
                        duration: 600
                    });
    
                    if (viewType === "conversation") {
                        //Pick a vertical position that is at the top of the Conversations widget,
                        //if current scroll position is less.
                        scrollHeight = dojo.global.scrollY;
                        position = dojo.position(this.domNode, true).y;
                        if (position < scrollHeight) {
                            scrollHeight = position;
                        }

                        //Set up vertical animation.
                        scrollVertAnim = fxScroll({
                            win: dojo.global,
                            target: { x: 0, y: scrollHeight},
                            easing: this.animEasing,
                            duration: 600
                        });

                        //Going to conversation. scroll vertical then horizontal.
                        chain = fx.chain([
                            scrollHorizAnim,
                            scrollVertAnim
                        ]);
                    } else {
                        //Set up vertical animation.
                        scrollVertAnim = fxScroll({
                            win: dojo.global,
                            target: { x: 0, y: this.summaryScrollHeight},
                            easing: this.animEasing,
                            duration: 600
                        });
                        //Going back to summary view. Scroll horizontal, then vertical
                        chain = fx.chain([
                            scrollHorizAnim,
                            scrollVertAnim
                        ]);
                    }

                    //Bind to the end of the fx chain, then play the chain.
                    dojo.connect(chain, "onEnd", dojo.hitch(this, function () {
                        //Reset the DOM nodes after the animation is done.
                        //Only show the correct node.
                        if (viewType === "conversation") {
                            this.listNode.style.display = "none";
                            this.convoNode.style.display = "";
                        } else {
                            this.listNode.style.display = "";
                            this.convoNode.style.display = "none";
                        }
    
                        //Pull the nodes out scrollNode
                        this.domNode.removeChild(this._scrollNode);
                        this.domNode.appendChild(this.listNode);
                        this.domNode.appendChild(this.convoNode);
    
                        //Remove fixed widths on the nodes.
                        this.domNode.style.width = oldDomNodeWidth;
                        this.listNode.style.width = oldListNodeWidth;
                        this.convoNode.style.width = oldConvoNodeWidth;
                        
                        //Reset scroll.
                        this.domNode.scrollLeft = 0;

                        this.onTransitionEnd();
                    }));
                    chain.play();

                    //Set current state of the viewType. Do it here and not in
                    //onTransitionEnd in case user causes an action before the
                    //animation is done.
                    this.viewType = viewType;
                }), 100);
            }
        },

        /**
         * Easing function for animations. This is a copy of
         * dojo/fx/easing.expoOut
         * @param {Decimal} [n]
         */
        animEasing: function (n) {
            return (n === 1) ? 1 : (-1 * Math.pow(2, -10 * n) + 1);
        },
  

        /**
         * Easing function for animations. This is a copy of
         * the default easing function for dojo.Animation(s)
         * @param {Decimal} [n]
         */
        removeAnimEasing: function (n) {
            return 0.5 + ((Math.sin((n + 1.5) * Math.PI)) / 2);
        },

        /**
         * Called at the end of a summary transition.
         */
        onTransitionEnd: function () {
            //Hide the swipe indicator
            this.switchNode.className = "rdwConversationsSwipe";
    
            if (this.viewType === "summary") {
                if (this.summaryActiveNode) {
                    this._setActiveNode(this.summaryActiveNode, null, true);
                }
            } else {
                //Select the first focusable node in the conversation.
                var tabbys = dojo.query('[tabindex="0"]', this.convoWidget.domNode);
                if (tabbys.length) {
                    this._setActiveNode(tabbys[0], null, true);
                }
    
                //Set the read state
                api().seen({
                    ids: this.oneConversation
                });
            }
            this.checkTransitionEnd();
        },

        /** Checks for an action to run after the end of the transition. */
        checkTransitionEnd: function () {
            if (this.onTransitionEndCallback) {
                setTimeout(dojo.hitch(this, function () {
                    this.onTransitionEndCallback();
                    delete this.onTransitionEndCallback;
                }), 15);
            }
        },

        /**
         * Sets the transition callback to select the first
         * item in the updated list. Only do this for actions that
         * refresh the displayed list of items.
         */
        configureFirstActiveItem: function () {
            this.onTransitionEndCallback = dojo.hitch(this, function () {
                //Select the first element in the list.
                setTimeout(dojo.hitch(this, function () {
                    this.onKeyPress({
                        keyCode: this.navKeys.down,
                        forceFirstActiveItem: true,
                        skipAnimation: true,
                        _fake: true
                    });
                    rd.pub("rdw/Conversations/firstItemSelected");
                }), 500);
            });
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
    
            this.inherited("destroy", arguments);
        },

        /**
         * Removes a conversation from this widget.
         * @param {Object} convoWidget
         * @param {Function} [onEndCallback]
         */
        removeConversation: function (convoWidget, onEndCallback) {
            var node = convoWidget.domNode,
                //Find next conversation to highlight.
                nextNode = dojo.query(node).next()[0],
                nodes;
            if (nextNode) {
                nodes = dojo.query('[tabindex="0"]', nextNode);
                nextNode = nodes.length ? nodes[0] : null;
            }
    
            //First, animate it out.
            node.style.overflow = "hidden";
            dojo.anim(node, { height: 0}, 800, this.removeAnimEasing, dojo.hitch(this, function () {
                //Then destroy it.
                this.removeSupporting(convoWidget);
                convoWidget.destroy();
    
                //select next node. Use a timeout for smoothness.
                setTimeout(dojo.hitch(this, function () {
                    if (nextNode) {
                        this._setActiveNode(nextNode);
                    }
                }), 10);
            }));
        },

        //**************************************************
        //start topic subscription endpoints
        //**************************************************
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
                //The home view groups messages by type. So, for each message in each conversation,
                //figure out where to put it.
                if (conversations && conversations.length) {
                    this.conversations.push.apply(this.conversations, conversations);

                    var leftOver = [], i, convo, Handler, widget,
                         frag, zIndex, SummaryWidgetCtor, summaryWidget, group;
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
                                leftOver.push(convo);
                            }
                        }
                    }
    
                    //If any messsages not handled by a group in a conversation
                    //are left over, create a regular conversation for them.
                    if (leftOver.length) {
                        for (i = 0; (convo = leftOver[i]); i++) {
                            widget = this.createHomeConversation(convo);
                            this._groups.push(widget);
                            this.addSupporting(widget);
                        }
                    }
                }
    
                this._groups.sort(function (a, b) {
                    var aSort = "groupSort" in a ? a.groupSort : 100,
                            bSort = "groupSort" in b ? b.groupSort : 100;
                    return aSort > bSort;
                });
    
                frag = dojo.doc.createDocumentFragment();
                zIndex = this._groups.length;
    
                //Create summary group widget and add it first to the fragment.
                SummaryWidgetCtor = run.get(this.summaryGroupCtorName);
                summaryWidget = new SummaryWidgetCtor();
                //Want summary widget to be the highest, add + 1 since group work
                //below uses i starting at 0.
                summaryWidget.domNode.style.zIndex = zIndex + 1;
                this.addSupporting(summaryWidget);
                summaryWidget.placeAt(frag);
    
                //Add all the widgets to the DOM and ask them to display.
                for (i = 0; (group = this._groups[i]); i++) {
                    group.domNode.style.zIndex = zIndex - i;
                    group.placeAt(frag);
                    group.display();
                }

                //Inject nodes all at once for best performance.
                this.domNode.appendChild(frag);

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
        //**************************************************
        //end topic subscription endpoints
        //**************************************************
    });
});
