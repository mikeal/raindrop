dojo.provide("rdw.Summary");

dojo.require("rdw._Base");
dojo.require("rdw.MailingListSummary");

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

  // The widget to display in the summary when the user selects a mailing list.
  // We declare it here to enable extensions to override it with a custom widget
  // by changing the value of this property.
  mailingListSummaryWidget: "rdw.MailingListSummary",

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
    rd.contact.get(contactId, dojo.hitch(this, function(contact) {
      //Use megaview to select all messages based on the identity
      //IDs.
      var keys = rd.map(contact.identities, dojo.hitch(this, function(identity) {
            rd.escapeHtml("Person: " + contact.name + identity.rd_key[1], this.domNode);
      }));
    }), function() { });
  },

  direct: function() {
    //summary: responds to rd-protocol-direct topic.
  },

  broadcast: function() {
    //summary: responds to rd-protocol-broadcast topic.
  },

  mailingList: function(/*String*/listId) {
    //summary: responds to rd-protocol-mailingList topic.

    // It should be possible to load the MailingListSummary widget here rather
    // than up top, but that doesn't work for some reason, so we load it up top
    // for now and then instantiate the widget using the code below.

    // Code that should work but doesn't:
    //dojo["require"](this.mailingListSummaryWidget);
    //dojo.addOnLoad(dojo.hitch(this, function(){
    //  this.addSupporting(
    //    new (dojo.getObject(this.mailingListSummaryWidget))(
    //      { id: listId },
    //      dojo.create("div", null, this.domNode)
    //    )
    //  );
    //}));

    // Code that works around the problem:
    this.addSupporting(
      new (dojo.getObject(this.mailingListSummaryWidget))(
        { id: listId },
        dojo.create("div", null, this.domNode)
      )
    );
  },

  locationTag: function(/*String*/locationId) {
    //summary: responds to rd-protocol-locationTag topic.
    rd.escapeHtml("Folder location: " + locationId, this.domNode);
  }
  //**************************************************
  //end topic subscription endpoints
  //**************************************************
});
