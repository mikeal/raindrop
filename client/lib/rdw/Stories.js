dojo.provide("rdw.Stories");

dojo.require("rdw._Base");
dojo.require("rdw.Story");
dojo.require("rdw.story.FullStory");
dojo.require("rd.api");

dojo.require("dojo.fx");
dojo.require("dojox.fx.scroll");

dojo.declare("rdw.Stories", [rdw._Base], {
  //Array of conversations to show.
  //Warning: this is a prototype property,
  //be sure to always set it on the instance.
  conversations: [],

  //The max number of messages to fetch from conversation APIs.
  //Note this is number of messages that match a criteria --
  //more messages might show up if they are part of the conversations
  //for the messages that match the criteria.
  messageLimit: 30,

  //The widget to use to show a full story.
  fullStoryCtorName: "rdw.story.FullStory",

  //List of topics to listen to and modify contents based
  //on those topics being published. Note that this is an object
  //on the rdw.Stories prototype, so modifying it will affect
  //all instances. Reassign the property to a new object to affect
  //only one instance.
  topics: {
    "rd-engine-sync-done": "engineSyncDone",
    "rd-protocol-home": "home",
    "rd-protocol-contact": "contact",
    "rd-protocol-direct": "direct",
    "rd-protocol-group": "group",
    "rd-protocol-locationTag": "locationTag",
    "rd-protocol-starred": "starred",
    "rd-protocol-sent": "sent",
    "rd-protocol-conversation": "conversation"
  },

  //List of modules that may want to group messages in the home view.
  //It is assumed that moduleName.prototype.canHandle(messageBag) is defined
  //for each entry in this array.
  homeGroups: [
    "rdw.story.TwitterTimeLine"
  ],

  //The key for navigation.
  navKeys: {
    conversation: dojo.keys.RIGHT_ARROW,
    summary: dojo.keys.LEFT_ARROW,
    up: dojo.keys.UP_ARROW,
    down: dojo.keys.DOWN_ARROW,
    tab: dojo.keys.TAB
  },

  //The keycode to use for actions that should expand to a full conversation
  //view for a message.
  convoKeyCode: dojo.keys.RIGHT_ARROW,
  
  //The keycode to use for actions that should return to the summary
  //view for a message.
  summaryKeyCode: dojo.keys.LEFT_ARROW,

  templateString: '<div class="rdwStories" dojoAttachEvent="onclick: onClick, onkeypress: onKeyPress">'
                + '  <ol dojoAttachPoint="listNode"></ol>'
                + '  <ol dojoAttachPoint="convoNode"></ol>'
                + '</div>',

  postMixInProperties: function() {
    //summary: dijit lifecycle method before template is generated.
    this.inherited("postMixInProperties", arguments);

    //Create a reverse up lookup for the nav keys.
    this.navCodes = {};
    for (var prop in this.navKeys) {
      if (!(prop in this.navCodes)) {
        this.navCodes[this.navKeys[prop] + ""] = prop;
      }
    }
  },

  postCreate: function() {
    //summary: dijit lifecycle method after template insertion in the DOM.

    //Register for the interesting topics
    var empty = {};
    for (var prop in this.topics) {
      if(!(prop in empty)) {
        this._sub(prop, this.topics[prop]);
      }
    }
  },

  //elements to ignore for click selection.
  clickIgnore: {
    "input": 1,
    "textarea": 1,
    "select": 1,
    "option": 1
  },

  onClick: function(/*Event*/evt) {
    //summary: handles click events, tries to select the first selectable item
    //relative to the click.
    var target = evt.target;
    do {
      if (target == this.domNode || this.clickIgnore[target.nodeName.toLowerCase()]) {
        break;
      }
      if (target.tabIndex > -1) {
        this._setActiveNode(target);
        break;
      }
    } while ((target = target.parentNode));
  },

  onKeyPress: function(/*Event*/evt) {
    //summary: handles key presses for navigation. If the key press is
    //for something that should show a full conversation view then trigger
    //it.
    var key = this.navCodes[evt.keyCode + ""];
    if (key) {
      if (key == "summary" && this.viewType != "summary") {
        //Store that the state is going back, so do do not
        //fetch new data for the old state.
        this._isBack = true;

        //Just go back in the browser history.
        dojo.global.history.back();
      } else {
        //Get the active, focused element and see if it is widget with a message
        var id = dojo.doc.activeElement.id;
        var widget = id && dijit.byId(id);
        var messageBag = widget && widget.messageBag;

        if (key == "conversation" && this.viewType != "conversation") {
          var convoId = messageBag
                        && messageBag["rd.msg.conversation"]
                        && messageBag["rd.msg.conversation"].conversation_id;
          if (convoId) {
            rd.setFragId("rd:conversation:" + convoId);
          }
        } else {
          var found = widget.domNode;
          //It is an up/down action. Show selection of the right element.
          if (key == "up" || key == "down") {
            //Need to select the next message widget. If it was a tab, it is
            //already selected.
            found = null;
            var method = key == "up" ? "previousSibling" : "nextSibling";
            var found = this._nextFocusNode(widget.domNode, method);

            //If did not find a match then break out.
            if (!found) {
              return;
            }
          }

          this._setActiveNode(found);
        }
      }
    }
  },

  _setActiveNode: function(/*DOMNode*/domNode) {
    //summary: sets the active node in the stories area.
    if (this.activeNode) {
      dojo.removeClass(this.activeNode, "active");
    }
    if (this.activeParentNode) {
      dojo.removeClass(this.activeParentNode, "active");
    }

    domNode.focus();
    this.activeNode = domNode;

    if (this.viewType == "summary") {
      this.activeParentNode = dijit.getEnclosingWidget(domNode.parentNode).domNode;
      dojo.addClass(this.activeParentNode, "active");
    } else {
      dojo.addClass(this.activeNode, "active");
    }

    dijit.scrollIntoView(this.activeNode);
  },

  _nextFocusNode: function(/*DOMNode*/domNode, /*String*/method) {
    //Finds the next focusable widget in the stories hierarchy of nodes.

    //Try node's siblings first.
    var test = domNode;
    while (test && (test = test[method])) {
      if (test && test.tabIndex > -1) {
        return test;
      }
    }

    //No luck with siblings, try up a level at the next Story widget.
    if (domNode) {
      //Go up to hopefully find the story object.
      var storyWidget = dijit.getEnclosingWidget(domNode.parentNode);
      if (storyWidget) {
        domNode = storyWidget.domNode[method];
        var tabbys = domNode && dojo.query('[tabindex="0"]', domNode);
        if (tabbys && tabbys.length) {
          domNode = tabbys[method == "nextSibling" ? 0 : tabbys.length - 1];
          if (domNode && domNode.tabIndex > -1 ) {
            return domNode;
          }
        }
      }
    }
    return null;
  },

  _sub: function(/*String*/topicName, /*String*/funcName) {
    //summary: subscribes to the topicName and dispatches to funcName,
    //saving off the info in case a refresh is needed.
    this.subscribe(topicName, dojo.hitch(this, function() {
      if (topicName != "rd-engine-sync-done") {
        this._updateInfo = {
          funcName: funcName,
          args: arguments
        };
      }

      //If this is a back request and there are conversations to show,
      //just do the transition back.
      if (this._isBack && this.conversations && this.conversations.length) {
        //Just transition back to summary view, do not fetch new data.
        this.transition("summary");
      } else {
        //Clear out info we were saving for back.
        this.summaryActiveNode = null;
        this.summaryScrollHeight = 0;
        this[funcName].apply(this, arguments);
      }
      this._isBack = false;
    }));
  },

  updateConversations: function(/*String*/viewType, /*Array*/conversations) {
    //summary: updates the display of conversations by updating the
    //rdw.Story objects.
    //TODO: try to reuse a Story object instead of destroy/create
    //cycle. Could cause too much memory churn in the browser.

    //Hold on to conversations in case we need to refresh based on extension
    //action.
    if (viewType == "conversation") {
      this.oneConversation = conversations[0];

      //Clean up old convoWidget
      if (this.convoWidget) {
        this.removeSupporting(this.convoWidget);
        this.convoWidget.destroy();
      }

      //Make new convoWidget.
      var ctor = dojo.getObject(this.fullStoryCtorName);
      this.convoWidget = new ctor({
        msgs: this.oneConversation
      }, dojo.create("div", null, this.convoNode));
    } else {
      this.destroyAllSupporting();

      //Showing summaries of a few conversations.
      this.conversations = conversations;

      //Create new widgets.
      //Use a document fragment for best performance
      //and load up each story widget in there.
      var frag = dojo.doc.createDocumentFragment();
      for (var i = 0, conv; conv = this.conversations[i]; i++) {
        this.addSupporting(new rdw.Story({
           msgs: conv
         }, dojo.create("div", null, frag)));        
      }

      //Inject nodes all at once for best performance.
      this.listNode.appendChild(frag);
    }

    this.transition(viewType);
  },

  transition: function(/*String*/viewType) {
    //summary: transitions the display to the appropriate
    //viewType. Basically, allow switching from a summary
    //of conversations to one conversation and back.

    //If showing another summary type, then clear out the saved summary
    if (!this.viewType || viewType == this.viewType && viewType == "summary") {
      this.summaryScrollHeight = 0;
      window.scrollTo(0, 0);
    }

    //If transitioning away from summary, hold on to old activeNode
    if (viewType != "summary") {
      this.summaryActiveNode = this.activeNode;
    }

    //Skip the animation on the first display of this widget.
    if (!this._postRender) {
      //Set the view type so next calls know the type.
      this.viewType = viewType;
      this._postRender = true;
      return;
    }

    if (this.viewType != viewType) {
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
        
  onTransitionEnd: function() {
    //summary: called at the end of a summary transition.

    //Hide the swipe indicator
    this.switchNode.className = "rdwStoriesSwipe";

    if (this.viewType == "summary") {
      if (this.summaryActiveNode) {
        this._setActiveNode(this.summaryActiveNode);
      }
    } else {
      //Select the first focusable node in the conversation.
      var tabbys = dojo.query('[tabindex="0"]', this.convoWidget.domNode);
      if (tabbys.length) {
        this._setActiveNode(tabbys[0]);
      }

      //Set the read state
      rd.api().seen({
        ids: this.oneConversation
      });
    }
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

  //**************************************************
  //start topic subscription endpoints
  //**************************************************
  engineSyncDone: function() {
    //summary: responds to rd-engine-sync-done topic.
    var info = this._updateInfo;
    if (info) {
      this[info.funcName].apply(this, info.args);
    }
  },

  home: function() {
    //summary: responds to rd-protocol-home topic.

    //reset stored state.
    this.conversations = [];
    this._groups = [];

    //Be sure homeGroups are loaded.
    if (!this.homeGroupModules) {
      for (var i = 0, module; module = this.homeGroups[i]; i++) {
        dojo["require"](module);
      }

      dojo.addOnLoad(dojo.hitch(this, function(){
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
    rd.conversation.home(this.messageLimit, dojo.hitch(this, function(conversations) {
       //The home view groups messages by type. So, for each message in each conversation,
      //figure out where to put it.
      if (conversations && conversations.length) {
        this.conversations = this.conversations.concat(conversations);
  
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
      this.listNode.appendChild(frag);

      this.transition("summary");
    }));
  },

  createHomeStory: function(/*Array*/msgs) {
    //summary: creates a Story widget for the Home view. The Story widget
    //should not display itself immediately since prioritization of the home
    //widgets still needs to be done. Similarly, it should not try to attach
    //to the document's DOM yet. Override for more custom behavior/subclasses.
    return new rdw.Story({
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
  },

  contact: function(/*String*/contactId) {
    //summary: responds to rd-protocol-contact topic.
    rd.conversation.contact(contactId, dojo.hitch(this, "updateConversations", "summary"));
  },

  direct: function() {
    //summary: responds to rd-protocol-direct topic.
    rd.conversation.direct(this.messageLimit, dojo.hitch(this, "updateConversations", "summary"));
  },

  group: function() {
    //summary: responds to rd-protocol-group topic.
    rd.conversation.group(this.messageLimit, dojo.hitch(this, "updateConversations", "summary"));
  },

  locationTag: function(/*String*/locationId) {
    //summary: responds to rd-protocol-locationTag topic.

    //Convert string to array.
    if (typeof locationId == "string") {
      locationId = locationId.split(",");
    }

    rd.conversation.location(locationId, this.messageLimit, dojo.hitch(this, "updateConversations", "summary"));
  },

  starred: function() {
    //summary: responds to rd-protocol-starred topic.
    rd.conversation.starred(this.messageLimit, dojo.hitch(this, "updateConversations", "summary"));
  },

  sent: function() {
    //summary: responds to rd-protocol-sent topic.
    rd.conversation.sent(this.messageLimit, dojo.hitch(this, "updateConversations", "summary"));
  },

  conversation: function(/*String*/convoId) {
    //summary: responds to requests to view a conversation.
    rd.api().conversation({
      ids: [convoId]
    })
    .ok(dojo.hitch(this, "updateConversations", "conversation"));
  }
  //**************************************************
  //end topic subscription endpoints
  //**************************************************
});

