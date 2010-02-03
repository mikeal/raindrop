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
/*global require: false, window: false, console: false, setTimeout: false
alert: false, decodeURIComponent: false */
"use strict";

require.def("rdw/Conversations",
["require", "rd", "dojo", "dijit", "dojox", "rdw/_Base", "rdw/Conversation", "rdw/conversation/FullConversation",
 "rdw/Summary", "rd/api", "rd/api/message", "rd/conversation", "dojo/fx", "dojox/fx/scroll"],
function (require, rd, dojo, dijit, dojox, Base, Conversation, FullConversation, Summary, api, message,
          conversation, fx, fxScroll) {

    //Reassign fxScroll to be the real function, that module does something non-standard.
    fxScroll = dojox.fx.smoothScroll;

    return dojo.declare("rdw.Conversations", [Base], {
        //Array of conversations to show.
        //Warning: this is a prototype property,
        //be sure to always set it on the instance.
        conversations: [],
    
        //The max number of conversations to fetch from the API.    Each conversation
        // will have a maxiumum of messageLimit messages returned.
        conversationLimit: 30,
    
        //The max number of messages to fetch from each conversation using the
        // conversation APIs.
        messageLimit: 3,
    
        //The widget to use to show a full conversation.
        fullConversationCtorName: "rdw/conversation/FullConversation",
    
        //Widget used for Conversation objects.
        conversationCtorName: "rdw/Conversation",
  
        //List of topics to listen to and modify contents based
        //on those topics being published. Note that this is an object
        //on the rdw/Conversations prototype, so modifying it will affect
        //all instances. Reassign the property to a new object to affect
        //only one instance.
        topics: {
            "rd-engine-sync-done": "checkUpdateInfo",
            "rd-protocol-home": "home",
            "rd-protocol-contact": "contact",
            "rd-protocol-direct": "direct",
            "rd-protocol-group": "group",
            "rd-protocol-locationTag": "locationTag",
            "rd-protocol-starred": "starred",
            "rd-protocol-sent": "sent",
            "rd-protocol-conversation": "conversation",
            "rdw/Conversation/archive": "archive",
            "rdw/Conversation/delete": "del",
            "rd-notify-delete-undo": "delUndo",
            "rd-impersonal-remove-from": "impersonalRemoveFrom"
        },

        //List of modules that can handle display of a conversation.
        //It is assumed that moduleName.prototype.canHandle(conversation) is defined
        //for each entry in this array.
        convoModules: [],

        //List of modules that can handle display of a *full* conversation.
        //It is assumed that moduleName.prototype.canHandle(conversation) is defined
        //for each entry in this array.
        fullConvoModules: [],

        //List of topic names and the corresponding ctor name to use for
        //conversation widgets. If there is no matching ctor name for a topic,
        //then the conversationCtorName property will be used. These values
        //are only consulted if there is not a matching widget via convoModules
        //or fullConvoModules.
        topicConversationCtorNames: {},

        //Which topic actions should be considered only transition actions
        //instead of actions that fetch new data.
        transitionOnlyActions: {
            "archive": 1,
            "del": 1
        },

        //The key for navigation.
        navKeys: {
            conversation: dojo.keys.RIGHT_ARROW,
            summary: dojo.keys.LEFT_ARROW,
            up: dojo.keys.UP_ARROW,
            down: dojo.keys.DOWN_ARROW,
            tab: dojo.keys.TAB
        },

        templateString: '<div class="rdwConversations" dojoAttachEvent="onclick: onClick, onkeypress: onKeyPress">' +
                        '    <div dojoType="rdw.Summary" dojoAttachPoint="summaryWidget"></div>' +
                        '    <div dojoAttachPoint="listNode"></div>' +
                        '    <div dojoAttachPoint="convoNode"></div>' +
                        '</div>',
        widgetsInTemplate: true,

        /** Dijit lifecycle method before template is generated. */
        postMixInProperties: function () {
            this.inherited("postMixInProperties", arguments);
    
            //Create a reverse up lookup for the nav keys.
            this.navCodes = {};
            for (var prop in this.navKeys) {
                if (!(prop in this.navCodes)) {
                    this.navCodes[this.navKeys[prop] + ""] = prop;
                }
            }
        },
  
        /** Dijit lifecycle method after template insertion in the DOM. */
        postCreate: function () {
            //Register for the interesting topics
            var empty = {}, prop;
            for (prop in this.topics) {
                if (!(prop in empty)) {
                    this._sub(prop, this.topics[prop]);
                }
            }
    
            //See if there was a last known state of displayed messages and
            //show them.
            this.checkUpdateInfo();
        },

        destroyIgnore: {
            "rdw/Summary": 1,
            //TODO: can we get rid of this?
            "rdw.Summary": 1
        },

        //elements to ignore for click selection.
        clickIgnore: {
            "input": 1,
            "textarea": 1,
            "select": 1,
            "option": 1
        },

        /**
         * handles click events, tries to select the first selectable item
         * relative to the click.
         * @param {Event} evt
         */
        onClick: function (evt) {
            var target = evt.target, nodes;
            do {
                if (target === this.domNode || this.clickIgnore[target.nodeName.toLowerCase()]) {
                    break;
                }
                if (target.tabIndex > -1) {
                    this._setActiveNode(target);
                    break;
                } else if (dojo.hasClass(target, "rdwConversation")) {
                    //Went up to Conversation, so find first focusable node
                    nodes = dojo.query('[tabindex="0"]', target);
                    if (nodes.length) {
                        this._setActiveNode(nodes[0], null, true);
                    }
                }
            } while ((target = target.parentNode));
        },

        /**
         * Handles key presses for navigation. If the key press is
         * for something that should show a full conversation view then trigger
         * it.
         * @param {Event} evt
         */
        onKeyPress: function (evt) {
            var key = this.navCodes[evt.keyCode + ""], id, widget, found,
                widgetNodes, method;
            if (key) {
                if (key === "summary" && this.viewType !== "summary") {
                    this.onNavSummary();
                } else {
                    if (key === "conversation" && this.viewType !== "conversation") {
                        this.onNavConversation();
                    } else {
                        //Get the active, focused element and see if it is widget with a message
                        id = dojo.doc.activeElement.id;
                        widget = id && dijit.byId(id);
                        found = widget.domNode;
                        //It is an up/down action. Show selection of the right element.
                        if (key === "up" || key === "down") {
                            found = null;
    
                            if (key === "down" && evt.forceFirstActiveItem) {
                                //If the focused node is the body, then select first elligible node
                                //inside the widget.
                                widgetNodes = dojo.query("[widgetid]", this.domNode);
                                if (widgetNodes.length) {
                                    found = dojo.query("[tabindex]", widgetNodes[0])[0];
                                }
                            } else {
                                //Need to select the next message widget. If it was a tab, it is
                                //already selected.
                                method = key === "up" ? "previousSibling" : "nextSibling";
                                found = this._nextFocusNode(widget.domNode, method);
                            }
    
                            //If did not find a match then break out.
                            if (!found) {
                                return;
                            }
                        }
    
                        this._setActiveNode(found, null, evt.skipAnimation);
                        if (!evt._fake) {
                            dojo.stopEvent(evt);
                        }
                    }
                }
            }
        },
  
        /** Handles navigating back to the summary view. */
        onNavSummary: function () {
            //Store that the state is going back, so do do not
            //fetch new data for the old state.
            this._isBack = true;
    
            //Save the current scroll position, so we can set it once
            //we go back before we do the transition. Otherwise, the browser
            //remembers your last scroll position for last place in history.
            var conversationScrollTop = dojo.global.dojo.global.scrollY;
    
            //Just go back in the browser history.
            dojo.global.history.back();
    
            //Set the scroll back to the right place so the animation looks smooth.
            window.scrollTo(0, conversationScrollTop);
        },
        
        /** Handles navigating to the conversation view. */
        onNavConversation: function () {
            //Get the active, focused element and see if it is widget with a message
            var id = dojo.doc.activeElement.id,
                widget = id && dijit.byId(id),
                convo = widget && widget.convo,
                convoId = convo && convo.id;
            if (convoId) {
                rd.setFragId("rd:conversation:" + dojo.toJson(convoId));
            }
        },
  
        /**
         * Sets the active node in the conversations area.
         * @param {DOMNode} domNode
         * @param {String} [viewType]
         * @param {Boolean} [skipAnimation]
         */
        _setActiveNode: function (domNode, viewType, skipAnimation) {
            //Make sure current node has focus, otherwise, if the transition
            //animation is in mid-progress, the next focusable node will not be
            //found correctly.
            if (this.activeNode) {
                this.activeNode.focus();
            }
            //Also stop any in-process animation for active node.
            if (this.activeNodeAnim) {
                this.activeNodeAnim.stop();
                this.activeNodeAnim = null;
            }
    
            if (this.activeNode) {
                dojo.removeClass(this.activeNode, "active");
            }
            if (this.activeParentNode) {
                dojo.removeClass(this.activeParentNode, "active");
            }
    
            //See if click is on the interesting widget node.
            if (dijit.getEnclosingWidget(domNode).domNode !== domNode) {
                //Find the more appropriate interesting widget node.
                domNode = dijit.getEnclosingWidget(domNode.parentNode).domNode;
            }
    
            this.activeNode = domNode;
    
            //Allow caller to set the viewType this active node call is for.
            viewType = viewType || this.viewType;
    
            if (viewType === "summary") {
                this.activeParentNode = dijit.getEnclosingWidget(domNode.parentNode).domNode;
                dojo.addClass(this.activeParentNode, "active");
            } else {
                this.activeParentNode = null;
                dojo.addClass(this.activeNode, "active");
            }
        },

        _nextFocusNode: function (/*DOMNode*/domNode, /*String*/method) {
            //Finds the next focusable widget in the conversations hierarchy of nodes.
            var test, convoWidget, tabbys;
            //Try node's siblings first, if in a full conversation.
            if (this.viewType === "conversation") {
                test = domNode;
                while (test && (test = test[method])) {
                    if (test && test.tabIndex > -1) {
                        return test;
                    }
                }
            }
    
            //No luck with siblings, try up a level at the next Conversation widget.
            if (domNode) {
                //Go up to hopefully find the Conversation object.
                convoWidget = dijit.getEnclosingWidget(domNode.parentNode);
                if (convoWidget) {
                    domNode = convoWidget.domNode[method];
                    tabbys = domNode && dojo.query('[tabindex="0"]', domNode);
                    if (tabbys && tabbys.length) {
                        domNode = tabbys[method === "nextSibling" ? 0 : tabbys.length - 1];
                        if (domNode && domNode.tabIndex > -1) {
                            return domNode;
                        }
                    }
                }
            }
            return null;
        },
  
        /**
         * Subscribes to the topicName and dispatches to funcName,
         * saving off the info in case a refresh is needed.
         */
        _sub: function (/*String*/topicName, /*String*/funcName) {
            this.subscribe(topicName, dojo.hitch(this, function () {
                if (topicName !== "rd-engine-sync-done") {
                    this._updateInfo = {
                        funcName: funcName,
                        args: arguments
                    };
                }
    
                //Store the topic name for future reference
                this.currentTopic = topicName;
    
                //Clear out the summary widget
                this.summaryWidget.clear();
    
                //If this is a back request or an action that is just a transition
                //action (no new data to fetch), and there are conversations to show,
                //just do the transition back.
                if ((this._isBack) && this.conversations && this.conversations.length) {
                    //Just transition back to summary view, do not fetch new data.
                    this.transition("summary");
                } else if (this.transitionOnlyActions[funcName]) {
                    this[funcName].apply(this, arguments);
                } else {
                    //Clear out info we were saving for back.
                    this.summaryActiveNode = null;
                    this.summaryScrollHeight = 0;
                    this[funcName].apply(this, arguments);
                }
                this._isBack = false;
            }));
        },
    
        /** Sees if last request should be updated. */
        checkUpdateInfo: function () {
            var info = this._updateInfo;
            if (info) {
                this[info.funcName].apply(this, info.args);
            }
        },
  
        /**
         * Updates the display of conversations by updating the
         * rdw/Conversation objects.
         * @param {String} viewType
         * @param {Array} conversations
         */
        updateConversations: function (viewType, conversations) {
            //TODO: try to reuse a Conversation object instead of destroy/create
            //cycle. Could cause too much memory churn in the browser.
            var i, module, mod, Ctor, frag, conv;
            //Hold on to conversations in case we need to refresh based on extension
            //action.
            if (viewType === "conversation") {
                this.oneConversation = conversations[0];
    
                //Make sure we translate all fullConvoWidgets from string names into ctors.
                if (!this.fullConvoWidgets) {
                    this.fullConvoWidgets = [];
                    for (i = 0; (module = this.fullConvoModules[i]); i++) {
                        mod = require(module);
                        this.fullConvoWidgets.push(mod);
                    }
                }
    
                //Clean up old convoWidget
                if (this.convoWidget) {
                    this.removeSupporting(this.convoWidget);
                    this.convoWidget.destroy();
                }
    
                //Make new convoWidget.
                Ctor = this._getConvoWidget(this.oneConversation, this.fullConvoWidgets) ||
                                     require(this.fullConversationCtorName);
                this.convoWidget = new Ctor({
                    conversation: this.oneConversation
                }, dojo.create("div", null, this.convoNode));
            } else {
                //Make sure we translate all convoWidgets from string names into ctors.
                if (!this.convoWidgets) {
                    this.convoWidgets = [];
                    for (i = 0; (module = this.convoModules[i]); i++) {
                        mod = require(module);
                        this.convoWidgets.push(mod);
                    }
                }
    
                this.destroyAllSupporting(this.destroyIgnore);
    
                //Showing summaries of a few conversations.
                this.conversations = conversations;
    
                //Create new widgets.
                //Use a document fragment for best performance
                //and load up each conversation widget in there.
                frag = dojo.doc.createDocumentFragment();
                for (i = 0; (conv = this.conversations[i]); i++) {
                    Ctor = this._getConvoWidget(conv, this.convoWidgets) ||
                                         require(this.topicConversationCtorNames[this.currentTopic] ||
                                         this.conversationCtorName);
                    this.addSupporting(new Ctor({
                        conversation: conv
                    }, dojo.create("div", null, frag)));                
                }

                //Inject nodes all at once for best performance.
                this.listNode.appendChild(frag);

                this.configureFirstActiveItem();
            }

            this.transition(viewType);
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
                        oldListNodeWidth, oldConvoNodeWidth, x, scrollHeight,
                        position, scrollVertAnim, chain, scrollHorizAnim;
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
         * dojo.fx.easing.expoOut
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
            //summary: e
            return 0.5 + ((Math.sin((n + 1.5) * Math.PI)) / 2);
        },
  
        /** Called at the end of a summary transition. */
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
  
        /** Checks for an action to execute after the end of the transition. */
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
            delete this.fullConvoWidgets;
            delete this.convoWidgets;
    
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
         * @param {dijit/_Widget} convoWidget
         * @param {Function} [onEndCallback]
         */
        removeConversation: function (convoWidget, onEndCallback) {
            var node = convoWidget.domNode, nodes,
                nextNode = dojo.query(node).next()[0];
    
            //Find next conversation to highlight.    
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
            api({
                url: 'inflow/conversations/personal',
                limit: this.conversationLimit,
                message_limit: this.messageLimit
            })
            .ok(this, function (conversations) {
                //Indicate this is a collection of home conversations.
                this.conversations._rdwConversationsType = "home";
    
                //Show the conversation.
                this.updateConversations("summary", conversations);
    
                //Update the summary.
                this.summaryWidget.home();
            });
        },
  
        /** Determines if there is a home group that can handle the conversation. */
        _getConvoWidget: function (conversation, widgets) {
            for (var i = 0, module; (module = widgets[i]); i++) {
                if (module.prototype.canHandle(conversation)) {
                    return module;
                }
            }
            return null;
        },
  
        /**
         * Responds to rd-protocol-contact topic.
         * @param {String} contactId
         */
        contact: function (contactId) {
            api({
                url: 'inflow/conversations/contact',
                id: '"' + contactId + '"',
                message_limit: this.messageLimit
            })
            .ok(dojo.hitch(this, "updateConversations", "summary"));
        },
  
        /** Responds to rd-protocol-direct topic. */
        direct: function () {
            api({
                url: 'inflow/conversations/direct',
                limit: this.conversationLimit,
                message_limit: this.messageLimit
            })
            .ok(dojo.hitch(this, "updateConversations", "summary"));
        },
  
        /** Responds to rd-protocol-group topic. */
        group: function () {
            api({
                url: 'inflow/conversations/group',
                limit: this.conversationLimit,
                message_limit: this.conversationLimit
            }).ok(dojo.hitch(this, "updateConversations", "summary"));
        },
  
        /** Responds to rd-protocol-locationTag topic. */
        locationTag: function (/*String*/locationId) {
            //Convert string to array.
            if (typeof locationId === "string") {
                locationId = locationId.split(",");
            }
    
            conversation.location(locationId, this.conversationLimit, dojo.hitch(this, "updateConversations", "summary"));
        },
  
        /** Responds to rd-protocol-starred topic. */
        starred: function () {
            conversation.starred(this.conversationLimit, dojo.hitch(this, "updateConversations", "summary"));
        },
  
        /** Responds to rd-protocol-sent topic. */
        sent: function () {
            api({
                url: "inflow/conversations/identities",
                limit: this.conversationLimit,
                message_limit: this.messageLimit
            })
            .ok(dojo.hitch(this, "updateConversations", "summary"));
        },


        /**
         * Responds to rd-impersonal-remove-from topic.
         * @param {Array} identityId
         */
        impersonalRemoveFrom: function (identityId) {
            //Remove any widget that has their first message from this
            //identity ID.
            var i, widget, msg, body, recipTarget, conversations = [];
            for (i = this._supportingWidgets.length - 1; (widget = this._supportingWidgets[i]); i--) {
                msg = widget.msgs && widget.msgs[0];
                //If no message in this widget, skip it.
                if (!msg) {
                  continue;
                }

                body = msg.schemas["rd.msg.body"];
                if (body.from[0] === identityId[0] && body.from[1] === identityId[1]) {
                    //Convert conversation to a broadcast.
                    //A bit of a hack, assumes a lot of knowledge of
                    //the data model here.
                    recipTarget = msg.schemas["rd.msg.recip-target"];
                    if (recipTarget) {
                        recipTarget.target = "broadcast";
                        recipTarget["target-timestamp"][0] = "broadcast";
                    }
                    //Store the convo for the topic, and remove the widget.
                    conversations.push(widget.conversation);                  
                    this.removeSupporting(widget);
                    widget.destroy();
                }
            }

            if (conversations.length) {
                rd.pub("rd-impersonal-add", conversations);
            }
        },

        /**
         * Responds to requests to view a conversation.
         * @param {String} convoId
         */
        conversation: function (convoId) {
            api({
                url: 'inflow/conversations/by_id',
                key: dojo.fromJson(decodeURIComponent(convoId))
            })
            .ok(this, function (conversation) {
                //Show the conversation.         
                this.updateConversations("conversation", [conversation]);
    
                //Update the summary.
                if (this.summaryWidget.conversation) {
                    this.summaryWidget.conversation(conversation);
                }
            });
        },
  
        /**
         * Handles archiving a conversation and cleaning up visual state as
         * a result of the change.
         * @param {Object} convoWidget
         * @param {Array} msgs
         */
        archive: function (convoWidget, msgs) {
            api().archive({
                ids: msgs
            })
            .ok(this, function () {
                if (this.viewType === "summary") {
                    this.removeConversation(convoWidget);
                } else {
                    this.onTransitionEndCallback = dojo.hitch(this, function () {
                        //Assume the selected node is the Conversation node.
                        var summaryConvoWidget = dijit.getEnclosingWidget(this.activeParentNode);
    
                        //If going back to home view, need to remove the item,
                        //otherwise, just update the other conversation in place.
                        if (this.conversations._rdwConversationsType === "home") {
                            this.removeConversation(summaryConvoWidget);
                        } else {
                            rd._updateInstance(summaryConvoWidget, require(summaryConvoWidget.declaredClass.replace(/\./g, "/")));
                        }
                    });
                    this.onNavSummary();
                }
            });
        },
  
        /**
         * Handles deleting a conversation and cleaning up visual state as
         * a result of the change.
         * @param {Object} convoWidget
         * @param {Array} msgs
         */
        del: function (convoWidget, msgs) {
            api().del({
                ids: msgs
            })
            .ok(this, function () {
                var msgs, summaryConvoWidget;
                if (this.viewType === "summary") {
                    msgs = convoWidget.msgs;
    
                    this.removeConversation(convoWidget);
    
                    //Notify the user of the delete.
                    rd.pub("rd-notify-delete", msgs);
                } else {
                    this.onTransitionEndCallback = dojo.hitch(this, function () {
                        //Assume the selected node is the Conversation node.
                        summaryConvoWidget = dijit.getEnclosingWidget(this.activeParentNode);
                        msgs = summaryConvoWidget.msgs;
    
                        //Remove the conversation
                        this.removeConversation(summaryConvoWidget);
    
                        //Notify the user of the delete.
                        rd.pub("rd-notify-delete", msgs);
                    });
                    this.onNavSummary();
                }
            });
        },
  
        /**
         * Undos a deletion of a set of messages.
         * @param {Array} msgs
         */
        delUndo: function (msgs) {
            alert("not working yet.");
        }
        //**************************************************
        //end topic subscription endpoints
        //**************************************************
    });
});
