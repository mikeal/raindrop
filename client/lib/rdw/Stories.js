dojo.provide("rdw.Stories");

dojo.require("rdw._Base");
dojo.require("rdw.Story");

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

  //The number of "pages" (skips) to do for the conversations calls
  //for the home view.
  homeSkipLimit: 5,

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
    "rd-protocol-broadcast": "broadcast",
    "rd-protocol-locationTag": "locationTag",
    "rd-protocol-conversation": "conversation"
  },

  //List of modules that may want to group messages in the home view.
  //It is assumed that moduleName.prototype.canHandle(messageBag) is defined
  //for each entry in this array.
  homeGroups: [
    "rdw.story.TwitterTimeLine"
  ],

  //The keycode to use for actions that should expand to a full conversation
  //view for a message.
  convoKeyCode: dojo.keys.RIGHT_ARROW,
  
  //The keycode to use for actions that should return to the summary
  //view for a message.
  summaryKeyCode: dojo.keys.LEFT_ARROW,

  templateString: '<div class="rdwStories" dojoAttachEvent="onkeypress: onKeyPress">'
                + '  <ol dojoAttachPoint="listNode"></ol>'
                + '  <ol dojoAttachPoint="convoNode"></ol>'
                + '</div>',

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

  onKeyPress: function(/*Event*/evt) {
    //summary: handles key presses for navigation. If the key press is
    //for something that should show a full conversation view then trigger
    //it.
    if (evt.keyCode == this.convoKeyCode) {
      //Get the active, focused element and see if it is widget with a message
      var id = dojo.doc.activeElement.id;
      var widget = id && dijit.byId(id);
      var messageBag = widget && widget.messageBag;
      var convoId = messageBag
                    && messageBag["rd.msg.conversation"]
                    && messageBag["rd.msg.conversation"].conversation_id;
      if (convoId) {
        rd.setFragId("rd:conversation:" + convoId);
      }
    } else if (evt.keyCode == this.summaryKeyCode && this.viewType == "conversation") {
      //Just go back in the browser history.
      dojo.global.back();
    }
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
      this[funcName].apply(this, arguments);
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
      this.oneConversation = conversations;
      
      //Clean up old convoWidget
      if (this.convoWidget) {
        this.removeSupporting(this.convoWidget);
        this.convoWidget.destroy();
      }

      //Make new convoWidget.
      this.convoWidget = new rdw.Story({
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

    //Skip the animation on the first display of this widget.
    if (!this._postRender) {
      this._postRender = true;
      return;
    }

    if (this.viewType != viewType) {
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

      dojox.fx.smoothScroll({
        win: this.domNode,
        target: { x: x, y: 0},
        duration: 500,
        onEnd: dojo.hitch(this, function() {
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
        })
      }).play();

      this.viewType = viewType;
    }
  },

  destroy: function() {
    //summary: dijit lifecycle method.
    if (this.convoWidget) {
      this.convoWidget.destroy();
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
    this._skip = 0;
    this._displayCount = 0;

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
        this._renderHome();
      }));
    } else {
      this._renderHome();
    }
  },

  _renderHome: function() {
    //summary: does the actual display of the home view.
    rd.conversation.latest(this.messageLimit, (this._skip * this.messageLimit), dojo.hitch(this, function(conversations) {
      //The home view groups messages by type. So, for each message in each conversation,
      //figure out where to put it.
      this.destroyAllSupporting();

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
                }, dojo.create("div", null, this._frag));
                widget._isGroup = true;
                this._groups.push(widget);
                this.addSupporting(widget);
                this._displayCount += 1;
              } else {
                leftOver.push(msgBag);
                this._displayCount += 1;
              }
            }
          }

          //If any messsages not handled by a group in a conversation
          //are left over, create a regular story for them.
          if (leftOver.length) {
            var widget = new rdw.Story({
              msgs: leftOver,
              displayOnCreate: false
            }, dojo.create("div"));
            this._groups.push(widget);
            this.addSupporting(widget);
          }
        }
      }

      if (conversations && conversations.length && this._displayCount <= this.messageLimit && this._skip < this.homeSkipLimit) {
        //Keep fetching more messages until we get a good list of things to
        //show since grouping can eat up a lot of messages. Limit it by number
        //of "pages" (skips) we do in the result so we don't get infinite recursion.
        //Also stop if the last call did not get any more conversations.
        this._skip += 1;
        this._renderHome();
      } else {
        this._sortGroups();

        //Add all the widgets to the DOM and ask them to display.
        var frag = dojo.doc.createDocumentFragment();
        for (var i = 0, group; group = this._groups[i]; i++) {
          group.placeAt(frag);
          group.display();
        }
  
        //Inject nodes all at once for best performance.
        this.domNode.appendChild(frag);
      }
    }));   
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

  broadcast: function() {
    //summary: responds to rd-protocol-broadcast topic.
    rd.conversation.broadcast(this.messageLimit, dojo.hitch(this, "updateConversations", "summary"));
  },

  locationTag: function(/*String*/locationId) {
    //summary: responds to rd-protocol-locationTag topic.

    //Convert string to array.
    if (typeof locationId == "string") {
      locationId = locationId.split(",");
    }

    rd.conversation.location(locationId, this.messageLimit, dojo.hitch(this, "updateConversations", "summary"));
  },

  conversation: function(/*String*/convoId) {
    //summary: responds to requests to view a conversation.
    rd.conversation(convoId, dojo.hitch(this, "updateConversations", "conversation"));
  }
  //**************************************************
  //end topic subscription endpoints
  //**************************************************
});

