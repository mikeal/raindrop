dojo.provide("rdw.Message");
dojo.require("rdw._Base");

dojo.declare("rdw.Message", [rdw._Base], {
  //Suggested values for type are "topic" and "reply"
  type: "topic",

  //Holds the couch document for this story.
  //Warning: this is a prototype property: be sure to
  //set it per instance.
  doc: {},

  templatePath: dojo.moduleUrl("rdw.templates", "Message.html"),
  
  postMixInProperties: function() {
    //summary: dijit lifecycle method
    this.inherited("postMixInProperties", arguments);
    
    //Set the properties for this widget based on doc
    //properties.
    //TODO: some of these need more info from backend.
    this.userPhotoUrl = rd.escapeHtml("");
    this.fromName = rd.escapeHtml("");
    this.fromId = rd.escapeHtml(this.doc.from[1]);
    this.subject = rd.escapeHtml(this.doc.subject);
    this.message = rd.escapeHtml(this.doc.body_preview);
    this.time = 0;
    this.timeDisplay = rd.escapeHtml("some time ago");
  },

  postCreate: function() {
    //summary: dijit lifecycle method
    this.inherited("postCreate", arguments);
    
    
  }
});
