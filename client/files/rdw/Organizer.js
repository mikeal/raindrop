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
  },
  
  onClick: function(evt) {
    //summary: handles click delegation when clicking on list of links.
    var target = evt.target;
    if (target.href) {
      target = target.href.split("#")[1];
      if (target) {
        dojo.publish("rd-nav-" + target);
        dojo.stopEvent(evt);
      }
    }
  }
});
