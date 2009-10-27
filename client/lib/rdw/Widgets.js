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

dojo.provide("rdw.Widgets");

dojo.require("rdw._Base");
dojo.require("rd.api");

dojo.declare("rdw.Widgets", [rdw._Base], {
  //Array of conversations to show.
  //Warning: this is a prototype property,
  //be sure to always set it on the instance.
  conversations: [],

  //The max number of messages to fetch from conversation APIs.
  //Note this is number of messages that match a criteria --
  //more messages might show up if they are part of the conversations
  //for the messages that match the criteria.
  messageLimit: 30,

  //List of modules that may want to group messages in the home view.
  //It is assumed that moduleName.prototype.canHandle(messageBag) is defined
  //for each entry in this array.
  homeGroups: [
    "rdw.story.TwitterTimeLine"
  ],

  templateString: '<div class="rdwWidgets"></div>',

  postCreate: function() {
    //summary: dijit lifecycle method after template insertion in the DOM.

    this.home();
  },

  transition: function(/*String*/viewType) {
    //summary: transitions the display to the appropriate
    //viewType. Basically, allow switching from a summary
    //of conversations to one conversation and back.

    console.log("transition: start");

    //If showing another summary type, then clear out the saved summary
    if (!this.viewType || viewType == this.viewType && viewType == "summary") {
      this.summaryScrollHeight = 0;
    }

    //If transitioning away from summary, hold on to old activeNode
    if (viewType == "summary") {
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
      console.log("transition: end, no animation.");
      this.checkTransitionEnd();
      return;
    }

    if (this.viewType == viewType) {
      this.checkTransitionEnd();
    } else {
      if (!this.switchNode) {
        this.switchNode = dojo.create("div", {
          "class": "rdwStoriesSwipe"
        }, dojo.body());
      }
      this.switchNode.className = "rdwStoriesSwipe " + viewType;

      //Do the transition in a timeout, to give the DOM a chance to render,
      //so DOM rendering work is not happening while the transition is going.
      setTimeout(dojo.hitch(this, function() {
          //For summary view going to conversation view, remember the vertical scroll
          //to restore it when switching back.
          if (this.viewType != "conversation") {
            this.summaryScrollHeight = dojo.global.scrollY;
          }

          //Create a div used for scrolling.
          if (!this._scrollNode) {
            this._scrollNode = dojo.create("div", { "class": "scrollArea"});
          }
    
          //Fix the widths of divs for the scroll effect to work.
          var newDomNodeWidth, newListNodeWidth, newConvoNodeWidth;
          var oldDomNodeWidth = this.domNode.style.width;
          this.domNode.style.width = (newDomNodeWidth = dojo.marginBox(this.domNode).w) + "px";
          var oldListNodeWidth = this.listNode.style.width;
          this.listNode.style.width = newDomNodeWidth + "px";
          var oldConvoNodeWidth = this.convoNode.style.width;
          this.convoNode.style.width = newDomNodeWidth + "px";
   
          //Use the scrollNode as the parent, to make things easy to scroll.
          this._scrollNode.appendChild(this.listNode);
          this._scrollNode.appendChild(this.convoNode);
          this.domNode.appendChild(this._scrollNode);
     
          //Make sure both lists are visible.
          this.listNode.style.display = "";
          this.convoNode.style.display = "";
    
          if (viewType == "conversation") {
            this.domNode.scrollLeft = 0;
            var x = newDomNodeWidth;
          } else {
            this.domNode.scrollLeft = newDomNodeWidth;
            x = 0;
          }
  
          //Create the args for the scroll over effect.
          var scrollHorizAnim = dojox.fx.smoothScroll({
            win: this.domNode,
            target: { x: x, y: 0},
            easing: this.animEasing,
            duration: 600
          });
  
          if (viewType == "conversation") {
            //Pick a vertical position that is at the top of the Stories widget,
            //if current scroll position is less.
            var scrollHeight = dojo.global.scrollY;
            var position = dojo.position(this.domNode, true).y;
            if (position < scrollHeight) {
              scrollHeight = position;
            }

            //Set up vertical animation.
            var scrollVertAnim = dojox.fx.smoothScroll({
              win: dojo.global,
              target: { x: 0, y: scrollHeight},
              easing: this.animEasing,
              duration: 600
            });

            //Going to conversation. scroll vertical then horizontal.
            var chain = dojo.fx.chain([
              scrollHorizAnim,
              scrollVertAnim
            ]);
          } else {
            //Set up vertical animation.
            var scrollVertAnim = dojox.fx.smoothScroll({
              win: dojo.global,
              target: { x: 0, y: this.summaryScrollHeight},
              easing: this.animEasing,
              duration: 600
            });
            //Going back to summary view. Scroll horizontal, then vertical
            var chain = dojo.fx.chain([
              scrollHorizAnim,
              scrollVertAnim
            ]);
          }

          //Bind to the end of the fx chain, then play the chain.
          dojo.connect(chain, "onEnd", dojo.hitch(this, function() {
            //Reset the DOM nodes after the animation is done.
            //Only show the correct node.
            if (viewType == "conversation") {
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

  animEasing: function(/* Decimal? */n){
    //summary: easing function for animations. This is a copy of
    //dojo.fx.easing.expoOut
    return (n == 1) ? 1 : (-1 * Math.pow(2, -10 * n) + 1);
  },

  removeAnimEasing: function(/* Decimal? */n){
    //summary: easing function for animations. This is a copy of
    //the default easing function for dojo.Animation(s)
    return 0.5 + ((Math.sin((n + 1.5) * Math.PI)) / 2);
  },

  onTransitionEnd: function() {
    //summary: called at the end of a summary transition.

    console.log("onTransitionEnd");

    //Hide the swipe indicator
    this.switchNode.className = "rdwStoriesSwipe";

    if (this.viewType == "summary") {
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
      rd.api().seen({
        ids: this.oneConversation
      });
    }
    this.checkTransitionEnd();
  },

  checkTransitionEnd: function() {
    //summary: checks for an action to run after the end of the transition.
    if (this.onTransitionEndCallback) {
      setTimeout(dojo.hitch(this, function() {
        this.onTransitionEndCallback();
        delete this.onTransitionEndCallback;
      }), 15);
    }
  },

  configureFirstActiveItem: function() {
    //summary: sets the transition callback to select the first
    //item in the updated list. Only do this for actions that
    //refresh the displayed list of items.

    this.onTransitionEndCallback = dojo.hitch(this, function() {
      //Select the first element in the list.
      setTimeout(dojo.hitch(this, function() {
        this.onKeyPress({
          keyCode: this.navKeys.down,
          forceFirstActiveItem: true,
          skipAnimation: true,
          _fake: true
        });
        rd.pub("rdw.Stories.firstItemSelected");
      }), 500);
    });
  },

  destroy: function() {
    //summary: dijit lifecycle method. Be sure to get rid
    //of anything we do not want if this widget is re-instantiated,
    //like for on-the-fly extension purposes.
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

  removeStory: function(/*Object*/storyWidget, /*Function?*/onEndCallback) {
    //summary: removes a story from this widget.
    var node = storyWidget.domNode;

    //Find next story to highlight.  
    var nextNode = dojo.query(node).next()[0];
    if (nextNode) {
      var nodes = dojo.query('[tabindex="0"]', nextNode);
      nextNode = nodes.length ? nodes[0] : null;
    }

    //First, animate it out.
    node.style.overflow = "hidden";
    dojo.anim(node, { height: 0}, 800, this.removeAnimEasing, dojo.hitch(this, function() {
      //Then destroy it.
      this.removeSupporting(storyWidget);
      storyWidget.destroy();

      //select next node. Use a timeout for smoothness.
      setTimeout(dojo.hitch(this, function() {
        if (nextNode) {
          this._setActiveNode(nextNode);
        }
      }), 10);
    }));
  },

  //**************************************************
  //start topic subscription endpoints
  //**************************************************
  home: function() {
    //summary: responds to rd-protocol-home topic.

    //reset stored state.
    this.conversations = [];
    //Indicate this is a collection of home conversations.
    this.conversations._rdwStoriesType = "home";
    this._groups = [];

    if (!this.homeGroupModules) {
      for (var i = 0, module; module = this.homeGroups[i]; i++) {
        dojo["require"](module);
      }

      dojo.addOnLoad(dojo.hitch(this, function(){
        console.log("finished loading group modules.");
        this.homeGroupModules = [];
        for (var i = 0, module; module = this.homeGroups[i]; i++) {
          var mod = dojo.getObject(module);
          this.homeGroupModules.push(mod);
        }
        this.destroyAllSupporting();
        this._renderHome();
      }));
    } else {
      this.destroyAllSupporting();
      this._renderHome();
    }
  },

  _renderHome: function() {
    //summary: does the actual display of the home view.
    console.log("_renderHome start");
    rd.conversation.broadcast(this.messageLimit, dojo.hitch(this, function(conversations) {
      console.log("_renderHome conversations received");
      //The home view groups messages by type. So, for each message in each conversation,
      //figure out where to put it.
      if (conversations && conversations.length) {
        this.conversations.push.apply(this.conversations, conversations);

        for (var i = 0, convo; convo = conversations[i]; i++) {
          var leftOver = [];
          for (var j = 0, msgBag; msgBag = convo[j]; j++) {
            //Feed the message to existing created groups.
            if (!this._groupHandled(msgBag)) {
              //Existing group could not handle it, see if there is a new group
              //handler that can handle it.
              var handler = this._getHomeGroup(msgBag);
              if (handler) {
                var widget = new handler({
                  msgs: [msgBag],
                  displayOnCreate: false
                }, dojo.create("div"));
                widget._isGroup = true;
                this._groups.push(widget);
                this.addSupporting(widget);
              } else {
                leftOver.push(msgBag);
              }
            }
          }

          //If any messsages not handled by a group in a conversation
          //are left over, create a regular story for them.
          if (leftOver.length) {
            var widget = this.createHomeStory(leftOver);
            this._groups.push(widget);
            this.addSupporting(widget);
          }
        }
      }

      this._sortGroups();

      //Add all the widgets to the DOM and ask them to display.
      var frag = dojo.doc.createDocumentFragment();
      for (var i = 0, group; group = this._groups[i]; i++) {
        group.placeAt(frag);
        group.display();
      }

      //Inject nodes all at once for best performance.
      this.domNode.appendChild(frag);
    }));
  },

  createHomeStory: function(/*Array*/msgs) {
    //summary: creates a Story widget for the Home view. The Story widget
    //should not display itself immediately since prioritization of the home
    //widgets still needs to be done. Similarly, it should not try to attach
    //to the document's DOM yet. Override for more custom behavior/subclasses.
    return new (dojo.getObject(this.storyCtorName))({
      msgs: msgs,
      unreadReplyLimit: 2,
      displayOnCreate: false,
      allowReplyMessageFocus: false
    }, dojo.create("div")); //rdw.Story
  },

  _sortGroups: function() {
    //summary: handles sorting the groups. Default behavior
    //is to have true groups at the bottom, below regular
    //message groups.
    var regular = [];
    var groupie = [];
    for (var i = 0, group; group = this._groups[i]; i++) {
      group._isGroup ? groupie.push(group) : regular.push(group);
    }
    this._groups = regular.concat(groupie);
  },

  _groupHandled: function(/*Object*/msgBag) {
    //summary: if a group in the groups array can handle the msgBag, give
    //it to that group and return true.
    for (var i = 0, group; group = this._groups[i]; i++) {
      if (group.canHandle && group.canHandle(msgBag)) {
        group.addMessage(msgBag);
        return true;
      }
    }
    return false;
  },

  _getHomeGroup: function(/*Object*/msgBag) {
    //summary: determines if there is a home group that can handle the message.
    for (var i = 0, module; module = this.homeGroupModules[i]; i++) {
      if (module.prototype.canHandle(msgBag)) {
        return module;
      }
    }
    return null;
  }
  //**************************************************
  //end topic subscription endpoints
  //**************************************************
});

