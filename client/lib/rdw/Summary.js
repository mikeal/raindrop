dojo.provide("rdw.Summary");

dojo.require("rdw._Base");

dojo.declare("rdw.Summary", [rdw._Base], {
  widgetsInTemplate: true,

  templateString: '<div class="rdwSummary"></div>',

  //List of topics to listen to and modify contents based
  //on those topics being published. Note that this is an object
  //on the rdw.Summary prototype, so modifying it will affect
  //all instances. Reassign the property to a new object to affect
  //only one instance.
  topics: {
    "rd-protocol-home": "home",
    "rd-protocol-contacts": "contacts",
    "rd-protocol-contact": "contact",
    "rd-protocol-direct": "direct",
    "rd-protocol-broadcast": "broadcast",
    "rd-protocol-mailingList": "mailingList",
    "rd-protocol-locationTag": "locationTag"
  },

  postMixInProperties: function() {
    //summary: dijit lifecycle method before template is created.
    this.inherited("postMixInProperties", arguments);

    //Use _supportingWidgets to track child widgets
    //so that they get cleaned up automatically by dijit destroy.
    this._supportingWidgets = [];
    this._subs = [];
  },

  postCreate: function() {
    //summary: dijit lifecycle method triggered after template is in the DOM
    this.inherited("postCreate", arguments);

    //Register for the interesting topics
    var empty = {};
    for (var prop in this.topics) {
      if(!(prop in empty)) {
        this._sub(prop, this.topics[prop]);
      }
    }
  },

  clear: function() {
    //summary: clears the summary display.
    this.domNode.innerHTML = "";
  },

  destroy: function() {
    //summary: dijit lifecycle method.

    //Clean up subscriptions.
    for (var i = 0, sub; sub = this._subs[i]; i++) {
      rd.unsub(sub);
    }
    this.inherited("destroy", arguments);
  },

  _sub: function(/*String*/topicName, /*String*/funcName) {
    //summary: subscribes to the topicName and dispatches to funcName,
    //saving off the info in case a refresh is needed.
    this._subs.push(rd.sub(topicName, dojo.hitch(this, function() {
      this.clear();
      this[funcName].apply(this, arguments);
    })));
  },

  //**************************************************
  //start topic subscription endpoints
  //**************************************************
  home: function() {
    //summary: responds to rd-protocol-home topic.
    
  },

  contacts: function() {
    //summary: responds to rd-protocol-contacts topic.
    
  },

  contact: function(/*String*/contactId) {
    //summary: responds to rd-protocol-contact topic.
    
  },

  direct: function() {
    //summary: responds to rd-protocol-direct topic.
  },

  broadcast: function() {
    //summary: responds to rd-protocol-broadcast topic.
  },

  mailingList: function(/*String*/listId) {
    //summary: responds to rd-protocol-mailingList topic.
    rd.escapeHtml("Mailing List shown: " + listId, this.domNode);
  },

  locationTag: function(/*String*/locationId) {
    //summary: responds to rd-protocol-locationTag topic.
    rd.escapeHtml("Folder location: " + locationId, this.domNode);
  }
  //**************************************************
  //end topic subscription endpoints
  //**************************************************
});