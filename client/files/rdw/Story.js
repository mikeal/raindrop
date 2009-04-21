dojo.provide("rdw.Story");
dojo.require("rdw._Base");
dojo.require("rdw.Message");

dojo.declare("rdw.Story", [rdw._Base], {
  //Holds the couch document for this story.
  //Warning: this is a prototype property: be sure to
  //set it per instance.
  doc: {},

  templateString: '<li class="Story"></li>',

  postCreate: function() {
    //summary: dijit lifecycle method
    this.inherited("postCreate", arguments);
    
    //TODO: need to handle replies and such.
    //Right now it is just the one message per story.
    new rdw.Message({
      doc: this.doc
    }, dojo.create("div", null, this.domNode));
  }
});
