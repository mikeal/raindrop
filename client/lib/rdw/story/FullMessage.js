dojo.provide("rdw.story.FullMessage");

dojo.require("rdw.Message");

dojo.declare("rdw.story.FullMessage", [rdw.Message], {
  normalTemplate: dojo.cache("rdw.story.templates", "FullMessage.html"),
  unknownUserTemplate: dojo.cache("rdw.story.templates", "FullMessage.html"),

  postMixInProperties: function() {
    //summary: dijit lifecycle method
    this.inherited("postMixInProperties", arguments);

    //Make sure to show the whole body.
    var msgBag = this.messageBag;
    var msgDoc = this.messageBag['rd.msg.body'];

    //Collapse quote regions in the text and hyperlink things.
    //TODO: make message transforms extensionized.
    this.message = this.formatQuotedBody();
  }
});
