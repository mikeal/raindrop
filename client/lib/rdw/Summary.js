dojo.provide("rdw.Summary");

dojo.require("rdw._Base");
dojo.require("rd.api");

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
    "rd-protocol-group": "group",
    "rd-protocol-locationTag": "locationTag",
    "rd-protocol-starred": "starred",
    "rd-protocol-sent": "sent"
  },

  postMixInProperties: function() {
    //summary: dijit lifecycle method before template is created.
    this.inherited("postMixInProperties", arguments);

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

  destroySupportingWidgets: function() {
    //summary: removes the supporting widgets
    if (this._supportingWidgets.length) {
      var supporting;
      while((supporting = this._supportingWidgets.shift())) {
        supporting.destroy();
      }
    }
  },

  _sub: function(/*String*/topicName, /*String*/funcName) {
    //summary: subscribes to the topicName and dispatches to funcName,
    //saving off the info in case a refresh is needed.
    this._subs.push(rd.sub(topicName, dojo.hitch(this, function() {
      this.destroySupportingWidgets();
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
    rd.api().contact({
      ids: [contactId]
    }).ok(this, function(contacts) {
      //Use megaview to select all messages based on the identity
      //IDs.
      var contact = contacts[0];
      var keys = rd.map(contact.identities, dojo.hitch(this, function(identity) {
            rd.escapeHtml("Person: " + contact.name + identity.rd_key[1], this.domNode);
      }));
    });
  },

  direct: function() {
    //summary: responds to rd-protocol-direct topic.
  },

  group: function() {
    //summary: responds to rd-protocol-group topic.
    rd.escapeHtml("Recent group conversations", this.domNode);
  },

  locationTag: function(/*String*/locationId) {
    //summary: responds to rd-protocol-locationTag topic.
    rd.escapeHtml("Folder location: " + locationId, this.domNode);
  },

  starred: function(/*String*/locationId) {
    //summary: responds to rd-protocol-starred topic.
    rd.escapeHtml("Starred Messages (unimplemented)", this.domNode);
  },

  sent: function(/*String*/locationId) {
    //summary: responds to rd-protocol-sent topic.
    rd.escapeHtml("Sent Messages", this.domNode);
  }
  //**************************************************
  //end topic subscription endpoints
  //**************************************************
});
