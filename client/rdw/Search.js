dojo.provide("rdw.Search");
dojo.require("rdw._Base");

dojo.declare("rdw.Search", [rdw._Base], {
  templatePath: dojo.moduleUrl("rdw.templates", "Search.html"),
  
  postMixInProperties: function() {
    //summary: dijit lifecycle method
    this.inherited("postMixInProperties", arguments);
  },

  postCreate: function() {
    //summary: dijit lifecycle method
    this.inherited("postCreate", arguments);
  }
});
