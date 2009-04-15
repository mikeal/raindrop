dojo.provide("rdw.QuickCompose");
dojo.require("rdw._Base");

dojo.declare("rdw.QuickCompose", [rdw._Base], {
  templatePath: dojo.moduleUrl("rdw.templates", "QuickCompose.html"),

  blankImgUrl: dojo.moduleUrl("rdw.resources", "blank.png"),

  postMixInProperties: function() {
    //summary: dijit lifecycle method.
    this.inherited("postMixInProperties", arguments);

    this.userPicUrl = this.blankImgUrl;
  }
});
