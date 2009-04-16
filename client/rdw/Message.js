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

  blankImgUrl: dojo.moduleUrl("rdw.resources", "blank.png"),
  
  postMixInProperties: function() {
    //summary: dijit lifecycle method
    this.inherited("postMixInProperties", arguments);
    
    //Set the properties for this widget based on doc
    //properties.
    //TODO: some of these need more info from backend.
    this.userPicUrl = this.blankImgUrl;
    // XXX: theese are a couple hacks to get the UI looking more like we want
    this.fromName = this.doc.from[1];
    try {
      var pieces = this.doc.from[1].split("<");
      if(pieces && pieces[0]) {
        this.fromName = pieces[0];
      }
    } catch(ignore) { }
    
    this.fromId = this.doc.from[1];
    try {
      var matches = this.doc.from[1].match(/<(.+)>/);
      if(matches && matches[1]) {
        this.fromId = matches[1].toLowerCase();
      }
    } catch(ignore) { }

    this.subject = null;
    try {
      this.subject = rd.escapeHtml(this.doc.subject.replace(/^Re:/,''));
    } catch(ignore_empty_subjects) { }

    this.message = rd.escapeHtml(this.doc.body_preview);
    this.time = 0;
    this.timeDisplay = rd.escapeHtml("some time ago");
  },

  postCreate: function() {
    //summary: dijit lifecycle method
    this.inherited("postCreate", arguments);
    
    
  }
});
