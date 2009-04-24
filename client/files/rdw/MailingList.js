dojo.provide("rdw.MailingList");
dojo.require("rdw._Base");

dojo.declare("rdw.MailingList", [rdw._Base], {
  //Holds the couch document for this story.
  doc: null,

  // The name of the mailing list.
  name: "",

  templatePath: dojo.moduleUrl("rdw.templates", "MailingList.html"),

  postMixInProperties: function() {
    //summary: dijit lifecycle method
    this.inherited("postMixInProperties", arguments);

    this.name = this.doc.value.name || this.doc.value.id;
  },

  postCreate: function() {
    //summary: dijit lifecycle method
    this.inherited("postCreate", arguments);
  },

  onClick: function() {
    alert("click!");
  }
});
