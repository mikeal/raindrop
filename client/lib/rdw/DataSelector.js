dojo.provide("rdw.DataSelector");

dojo.require("dojo.DeferredList");
dojo.require("rdw._Base");
dojo.require("rd.MegaviewStore");

rd.addStyle("rdw.css.DataSelector");

dojo.declare("rdw.DataSelector", [rdw._Base], {
  templateString: '<div class="rdwDataSelector dijitReset dijitInlineTable dijitLeft"><div dojoAttachPoint="selectorNode"></div></div>',

  comboWidget: "dijit.form.ComboBox",

  //type can have values of "identityContact", "contact", or "locationTag"
  //by default. Extensions can add other types by creating a typeLoaded function
  //on this widget.
  type: "identityContact",

  //If type is set to "all", this is the list of data stores
  //to aggregate together. Extensions can add other types by pushing
  //new values to this array. Note that this is an array on the prototype for
  //this widget. Just reassign this property to a new array on an instance
  //just to affect that instance's list.
  allType: ["contact", "locationTag"],

  //Restrict the type of records further. Useful in the default case only
  //for type: "identityContact".
  //values are like "twitter", "email", in other words, the first array
  //value of the identity ID.
  subType: "",

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
    this.sources = this.allType;
    if (this.type != "all") {
      this.sources = [this.type];
    }

    this.createWidget();
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
      //Create the selector widget.
      this.selectorInstance = new (dojo.getObject(this.comboWidget))({
        store: new rd.MegaviewStore({
          schemaQueryTypes: this.sources,
          subType: this.subType
        }),
        onChange: dojo.hitch(this, "onSelectorChange")      
      }, this.selectorNode);

      //Pass initial value to selector if it was set.
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
    rd.setFragId("rd:contact:" + contactId);  
  },

  identitySelected: function(/*String*/identityId) {
    //summary: dispatch function when an identity is selected.
    rd.setFragId("rd:identity:" + identityId);
  },

  locationTagSelected: function(/*String*/location) {
    //summary: dispatch function when a locationTag is selected.
    rd.setFragId("rd:locationTag:" + location);
  }
});
