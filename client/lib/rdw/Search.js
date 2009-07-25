dojo.provide("rdw.Search");

dojo.require("rdw._Base");
dojo.require("rdw.DataSelector");

dojo.declare("rdw.Search", [rdw._Base], {
  templatePath: dojo.moduleUrl("rdw.templates", "Search.html"),
  widgetsInTemplate: true,

  postMixInProperties: function() {
    //summary: dijit lifecycle method
    this.inherited("postMixInProperties", arguments);
  },

  postCreate: function() {
    //summary: dijit lifecycle method
    this.inherited("postCreate", arguments);
    
    this.connect(this.dataSelector, "onDataSelected", "onDataSelected");
  },

  onDataSelected: function(/*Object*/data) {
    //summary: connection to dataSelector's onDataSelected call.
    dojo.place('<li><a href="#rd:' + data.type + ':' + data.id + '">' + data.value + '</a></li>', this.recentListNode, "first");
  }
});
