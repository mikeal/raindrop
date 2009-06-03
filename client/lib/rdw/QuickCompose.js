dojo.provide("rdw.QuickCompose");

dojo.require("rdw._Base");
dojo.require("rd.identity");
dojo.require("rd.account");

dojo.declare("rdw.QuickCompose", [rdw._Base], {
  templatePath: dojo.moduleUrl("rdw.templates", "QuickCompose.html"),

  blankImgUrl: dojo.moduleUrl("rdw.resources", "blank.png"),

  postMixInProperties: function() {
    //summary: dijit lifecycle method.
    this.inherited("postMixInProperties", arguments);

    this.userPicUrl = this.blankImgUrl;
    
    this.yourName = "Your Name";
    this.yourAddress = "you@example.com";
    
    this.sendButtonText = this.i18n.send;
  },

  postCreate: function() {
    //summary: dijit lifecycle method.
    this.inherited("postCreate", arguments);

    //See if a twitter icon can be pulled in for the user.
    rd.account.all(dojo.hitch(this, function(accounts) {
      if (accounts.twitter) {
        rd.identity.get(["twitter", accounts.twitter.id], dojo.hitch(this, function(user) {
            if (user.image) {
              this.picture.src = user.image;
            }
            if (user.name) {
              rd.escapeHtml(user.name, this.name);
            }
            //Don't worry about errors, just will not show pic.
        }));
        rd.escapeHtml("twitter.com/" + accounts.twitter.id, this.address);
      }
    }));
  },

  onFocusTextArea: function(evt) {
    //summary: expand the text area from it's simple entry space
    dojo.style(this.textarea, "height", "12ex");
  },

  onSubmit: function(evt) {
    //summary: focus the text area if send is pressed w/ nothing to send
    if ( this.textarea.value == "") {
      this.textarea.focus();
    }
    dojo.stopEvent(evt);
  }
});
