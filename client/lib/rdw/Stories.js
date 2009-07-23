dojo.provide("rdw.Stories");

dojo.require("rdw._Base");
dojo.require("rdw.Story");

dojo.declare("rdw.Stories", [rdw._Base], {
  //Array of conversations to show.
  //Warning: this is a prototype property,
  //be sure to always set it on the instance.
  conversations: [],

  //List of topics to listen to and modify contents based
  //on those topics being published. Note that this is an object
  //on the rdw.Stories prototype, so modifying it will affect
  //all instances. Reassign the property to a new object to affect
  //only one instance.
  topics: {
    "rd-engine-sync-done": "engineSyncDone",
    "rd-protocol-contact": "contact",
    "rd-protocol-direct": "direct",
    "rd-protocol-broadcast": "broadcast",
    "rd-protocol-mailingList": "mailingList",
    "rd-protocol-locationTag": "locationTag"
  },

  templateString: '<ol class="Stories"></ol>',

  postMixInProperties: function() {
    //summary: dijit lifecycle method before template is created.
    this.inherited("postMixInProperties", arguments);

    //Use _supportingWidgets to track child widgets
    //so that they get cleaned up automatically by dijit destroy.
    this._supportingWidgets = [];
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
    this.destroyStoryWidgets();

    //Create new widgets.
    //Use a document fragment for best performance
    //and load up each story widget in there.
    var frag = dojo.doc.createDocumentFragment();
    for (var i = 0, conv; conv = this.conversations[i]; i++) {
      this._supportingWidgets.push(new rdw.Story({
         msgs: conv
       }, dojo.create("div", null, frag)));        
    }

    //Inject nodes all at once for best performance.
    this.domNode.appendChild(frag);
  },

  destroyStoryWidgets: function() {
    //summary: removes the story widgets
    if (this._supportingWidgets.length) {
      var story;
      while((story = this._supportingWidgets.shift())) {
        story.destroy();
      }
    }
  },

  destroy: function() {
    //summary: dijit lifecycle method.

    //Clean up subscriptions.
    for (var i = 0, sub; sub = this._subs[i]; i++) {
      rd.unsub(sub);
    }
    this.inherited("destroy", arguments);
  },

  engineSyncDone: function() {
    //summary: responds to rd-engine-sync-done topic.
    var info = this._updateInfo;
    if (info) {
      this[info.funcName].apply(this, info.args);
    }
  },

  contact: function(/*String*/contactId) {
    //summary: responds to rd-protocol-contact topic.
    this.destroyStoryWidgets();
    rd.conversation.contact(contactId, dojo.hitch(this, "updateConversations"));
  },

  direct: function() {
    //summary: responds to rd-protocol-direct topic.
    this.destroyStoryWidgets();
    rd.conversation.direct(30, dojo.hitch(this, "updateConversations"));
  },

  broadcast: function() {
    //summary: responds to rd-protocol-broadcast topic.
    this.destroyStoryWidgets();
    rd.conversation.broadcast(30, dojo.hitch(this, "updateConversations"));
  },

  mailingList: function(/*String*/listId) {
    //summary: responds to rd-protocol-mailingList topic.
    this.destroyStoryWidgets();
    rd.conversation.mailingList(listId, 30, dojo.hitch(this, "updateConversations"));
  },

  locationTag: function(/*String*/locationId) {
    //summary: responds to rd-protocol-locationTag topic.

    //Convert string to array.
    if (typeof locationId == "string") {
      locationId = locationId.split(",");
    }
    this.destroyStoryWidgets();
    rd.conversation.location(locationId, 30, dojo.hitch(this, "updateConversations"));
  },

});

