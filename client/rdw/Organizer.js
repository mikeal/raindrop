dojo.provide("rdw.Organizer");
dojo.require("rdw._Base");

dojo.declare("rdw.Organizer", [rdw._Base], {
  templatePath: dojo.moduleUrl("rdw.templates", "Organizer.html"),
  
  postMixInProperties: function() {
    //summary: dijit lifecycle method
    this.inherited("postMixInProperties", arguments);
  },

  postCreate: function() {
    //summary: dijit lifecycle method
    this.inherited("postCreate", arguments);
  }
});
