dojo.provide("rdw.PersonSelector");

dojo.require("rdw._Base");

dojo.declare("rdw.PersonSelector", [rdw._Base], {
  templateString: '<div class="rdwPersonSelector dijitReset dijitInlineTable dijitLeft"><div dojoAttachPoint="selectorNode"></div></div>',

  comboWidget: "dijit.form.ComboBox",

  //type can have values of "identity" or "contact".
  type: "identity",

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

    if (!this.supportingWidgets) {
      this.supportingWidgets = [];
    }
  },

  postCreate: function() {
    //summary: dijit lifecycle method run after template HTML is in DOM

    //Pull the appropriate persons by type.
    this[this.type + "Show"]();
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

  identityShow: function() {
    //summary: shows identities in the selector, optionally restricted by
    //the restriction value.
    dojo["require"]("rd.identity");
    dojo["require"](this.comboWidget);
    dojo.addOnLoad(dojo.hitch(this, function() {
      var func = rd.identity.list(dojo.hitch(this, "_identityListed"));
    }));
  },

  _identityListed: function(/*Object*/idtys) {
    //summary: callback from the rd.identity call in identityShow

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
            _id: src._id,
            name: src.nickname
          });
        }
      }
    }

    //Sort by name.
    idtyList.sort(function(a, b) {
      a.name > b.name ? 1 : -1;
    })

    //Load up the display widget.
    this.selectorInstance = new (dojo.getObject(this.comboWidget))({
      store: rd.toIfrs(idtyList, "_id", "name"),
      onChange: dojo.hitch(this, "onIdentitySelectorChange")
    }, this.selectorNode);

    if (this.initialValue) {
      this.selectorInstance.attr("value", this.initialValue);
    }

    //Add to supporting widgets so widget destroys do the right thing.
    this.addSupporting(this.selectorInstance);
  },

  onIdentitySelectorChange: function(/*String*/value) {
    //summary: triggered when the identity-based selector changes.
    console.log("onIdentitySelectorChange: " + value);
  }
});
