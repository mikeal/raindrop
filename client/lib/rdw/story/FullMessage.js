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
    this.message = msgDoc.body.replace(/\n/g, "<br>");
  }
});
