dojo.provide("rdw.Stories");

dojo.require("rdw._Base");
dojo.require("rdw.Story");

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
    "rd-protocol-mailingList": "mailingList",
    "rd-protocol-locationTag": "locationTag"
  },

  //List of modules that may want to group messages in the home view.
  //It is assumed that moduleName.prototype.canHandle(messageBag) is defined
  //for each entry in this array.
  homeGroups: [
    "rdw.story.TwitterTimeLine",
    "rdw.story.MailingList"
  ],

  templateString: '<ol class="Stories"></ol>',

  postMixInProperties: function() {
    //summary: dijit lifecycle method before template is created.
    this.inherited("postMixInProperties", arguments);

    //Manually dealing with _supporting widgets instead of using
    //addSupporting/removeSupporting since Story widgets can be
    //removed fairly frequently.
    if (!this._supportingWidgets) {
      this._supportingWidgets = [];  
    }

    this._subs = [];
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

  _sub: function(/*String*/topicName, /*String*/funcName) {
    //summary: subscribes to the topicName and dispatches to funcName,
    //saving off the info in case a refresh is needed.
    this._subs.push(rd.sub(topicName, dojo.hitch(this, function() {
      this.destroyAllSupporting();

      if (topicName != "rd-engine-sync-done") {
        this._updateInfo = {
          funcName: funcName,
          args: arguments
        };
      }
      this[funcName].apply(this, arguments);
    })));
  },

  updateConversations: function(/*Array*/conversations) {
    //summary: updates the display of conversations by updating the
    //rdw.Story objects.
    //TODO: try to reuse a Story object instead of destroy/create
    //cycle. Could cause too much memory churn in the browser.

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
    this.domNode.appendChild(frag);
  },

  destroy: function() {
    //summary: dijit lifecycle method.

    //Clean up subscriptions.
    for (var i = 0, sub; sub = this._subs[i]; i++) {
      rd.unsub(sub);
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
    rd.conversation.contact(contactId, dojo.hitch(this, "updateConversations"));
  },

  direct: function() {
    //summary: responds to rd-protocol-direct topic.
    rd.conversation.direct(this.messageLimit, dojo.hitch(this, "updateConversations"));
  },

  broadcast: function() {
    //summary: responds to rd-protocol-broadcast topic.
    rd.conversation.broadcast(this.messageLimit, dojo.hitch(this, "updateConversations"));
  },

  mailingList: function(/*String*/listId) {
    //summary: responds to rd-protocol-mailingList topic.
    rd.conversation.mailingList(listId, this.messageLimit, dojo.hitch(this, "updateConversations"));
  },

  locationTag: function(/*String*/locationId) {
    //summary: responds to rd-protocol-locationTag topic.

    //Convert string to array.
    if (typeof locationId == "string") {
      locationId = locationId.split(",");
    }

    rd.conversation.location(locationId, this.messageLimit, dojo.hitch(this, "updateConversations"));
  }
  //**************************************************
  //end topic subscription endpoints
  //**************************************************
});

