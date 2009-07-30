dojo.provide("rdw.DataSelector");

dojo.require("dojo.DeferredList");
dojo.require("rdw._Base");
dojo.require("rd.MegaviewStore");

dojo.declare("rdw.DataSelector", [rdw._Base], {
  templateString: '<div class="rdwDataSelector dijitReset dijitInlineTable dijitLeft"><div dojoAttachPoint="selectorNode"></div></div>',

  comboWidget: "dijit.form.ComboBox",

  //type can have values of "identity", "contact", "mailingList" or "locationTag"
  //by default. Extensions can add other types by creating a typeLoaded function
  //on this widget.
  type: "identity",

  //If type is set to "all", this is the list of data stores
  //to aggregate together. Extensions can add other types by pushing
  //new values to this array. Note that this is an array on the prototype for
  //this widget. Just reassign this property to a new array on an instance
  //just to affect that instance's list.
  allType: ["contact", "mailingList", "locationTag"],

  //Restrict the type of records. For type: "identity", then restriction
  //could have values like "twitter", "email", in other words, the first array
  //value of the identity ID. restriction can also be an array of values.
  //It is required when using type: identity.
  restriction: "",

  //An initial value that will be used after
  //the person docs from the couch have loaded.
  initialValue: "",

  postMixInProperties: function() {
    //summary: dijit lifecycle method run before template evaluated
    this.inherited("postMixInProperties", arguments);
  },

  postCreate: function() {
    //summary: dijit lifecycle method run after template HTML is in DOM

    //Declare array to use for items found from data sources.
    this.items = [];

    //Figure out what data sources to use.
    var sources = this.allType;
    if (this.type != "all") {
      sources = [this.type];
    }

    //ask each type for a Deferred object.
    var dfds = [];
    for (var i = 0, src; src = sources[i]; i++) {
      dfds.push(this[src + "Deferred"]());
    }

    //Use a DeferredList to wait for all the deferred actions
    //to finish firing, then create the widget.
    var dfdList = new dojo.DeferredList(dfds);
    dfdList.addCallback(dojo.hitch(this, function(response) {
      this.createWidget();
      return response;
    }));
  },

  createWidget: function() {
    //summary: creates the widget that will use the data in this.items. Each object
    //entry in items should have an "id" and a "name" property.

    //sort by name
    this.items.sort(function(a, b) {
      a.name > b.name ? 1 : -1;
    });

    //Load the code for the widget then create and initialize it.
    dojo["require"](this.comboWidget);
    dojo.addOnLoad(dojo.hitch(this, function(){
      this.selectorInstance = new (dojo.getObject(this.comboWidget))({
        store: new rd.MegaviewStore(), //rd.toIfrs(this.items, "id", "name"),
        onChange: dojo.hitch(this, "onSelectorChange")      
      }, this.selectorNode);
  
      if (this.initialValue) {
        this.selectorInstance.attr("value", this.initialValue);
      }
  
      //Add to supporting widgets so widget destroys do the right thing.
      this.addSupporting(this.selectorInstance);
    }));
  },

  onSelectorChange: function(/*String*/value) {
    //summary: triggered when the selector's value changes. value should be
    //type:id.
    var item = this.selectorInstance.item;
    if (!item) {
      return;
    }

    //Dispatch to idSelected method on this instance.
    this[item.type + "Selected"](item.id);

    this.onDataSelected({
      type: item.type,
      id: item.id,
      value: item.name
    });
  },

  onDataSelected: function(/*Object*/data) {
    //summary: connection point for other code. data will have the following properties,
    //type: the type of data selected (from what data source)
    //id: the id of the data for that type of data source.
    //value: the visible value for the data selected.
  },

  _getValueAttr: function(){
    //summary: allows instance.attr("value") to work.
    return this.selectorInstance ? this.selectorInstance.attr("value") : this.initialValue;
  },

  _setValueAttr: function(/*String*/ value, /*Boolean?*/ priorityChange){
    //summary: allows instance.attr("value", value) to work.
    return this.selectorInstance ?
        this.selectorInstance.attr("value", value, priorityChange)
      :
        this.initialValue = value;
  },

  contactSelected: function(/*String*/contactId) {
    //summary: dispatch function when a contact is selected.
    rd.onDocClick("#rd:contact:" + contactId);  
  },

  contactDeferred: function() {
    //summary: Pulls in contacts data, returns a dojo.Deferred.
    var dfd = new dojo.Deferred();

    dojo["require"]("rd.contact");
    dojo.addOnLoad(dojo.hitch(this, function() {
      rd.contact.list(dojo.hitch(this, function(contacts) {
        if (!contacts) {
          dfd.callback(true);
          return;
        }

        //Need to create new array so data store operations do
        //not touch the rd.contact internal data store,
        //and to make the ID simpler for the widget data store.
        var contactList = []
        for(var i = 0, contact; contact = contacts[i]; i++) {
          if (contact.name) {
            this.items.push({
              id: "contact:" + contact.rd_key[1],
              name: contact.name
            });
          }
        }
        dfd.callback(true);
      }),
      function(error) {
        //error case
        dfd.errback(error);
      });
    }));

    return dfd; //dojo.Deferred
  },

  identitySelected: function(/*String*/identityId) {
    //summary: dispatch function when an identity is selected.
    rd.onDocClick("#rd:identity:" + list);
  },

  identityDeferred: function() {
    //summary: shows identities data, optionally restricted by
    //the restriction value, and returns a Deferred.
    var dfd = new dojo.Deferred();

    dojo["require"]("rd.identity");
    dojo.addOnLoad(dojo.hitch(this, function() {
      rd.identity.list(dojo.hitch(this, function(idtys) {
        var idtyList = [];
        //Figure out what type restrictions are needed.
        var types = this.restriction;
        if (typeof types == "string") {
          types = [types];
        }
    
        //Pull out the identities into an array.
        for (var i = 0, type; type = types[i]; i++) {
          var obj = idtys[type], empty = {};
          for (var prop in obj) {
            if (!(prop in empty)) {        
              var src = obj[prop];
              idtyList.push({
                id: "identity:" + src._id,
                name: src.nickname
              });
            }
          }
        }
        dfd.callback(true);
      }),
      function(error) {
        //error case
        dfd.errback(error);
      });
    }));

    return dfd; //dojo.Deferred
  },

  mailingListSelected: function(/*String*/list) {
    //summary: dispatch function when a mailingList is selected.
    rd.onDocClick("#rd:mailingList:" + list);  
  },

  mailingListDeferred: function() {
    //summary: Pulls in mailing list data, returns a dojo.Deferred.
    var dfd = new dojo.Deferred();

    dojo["require"]("rd.tag");
    dojo.addOnLoad(dojo.hitch(this, function() {
      rd.tag.lists(dojo.hitch(this, function(lists) {
        if (!lists) {
          dfd.callback(true);
          return;
        }

        for(var i = 0, name; name = lists[i]; i++) {
          this.items.push({
            id: "mailingList:" + name,
            name: name
          });
        }
        dfd.callback(true);
      }),
      function(error) {
        //error case
        dfd.errback(error);
      });
    }));

    return dfd; //dojo.Deferred
  },

  locationTagSelected: function(/*String*/location) {
    //summary: dispatch function when a locationTag is selected.
    rd.onDocClick("#rd:locationTag:" + location);
  },

  locationTagDeferred: function() {
    //summary: Pulls in location tag (imap folder) data, returns a dojo.Deferred.
    var dfd = new dojo.Deferred();

    dojo["require"]("rd.tag");
    dojo.addOnLoad(dojo.hitch(this, function() {
      rd.tag.locations(dojo.hitch(this, function(locs) {
        if (!locs) {
          dfd.callback(true);
          return;
        }

        for(var i = 0, loc; loc = locs[i]; i++) {
          this.items.push({
            id: "locationTag:" + loc.toString(),
            name: loc.join("/")
          });
        }
        dfd.callback(true);
      }),
      function(error) {
        //error case
        dfd.errback(error);
      });
    }));

    return dfd; //dojo.Deferred    
  }
});
