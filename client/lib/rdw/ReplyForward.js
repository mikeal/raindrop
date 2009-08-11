dojo.provide("rdw.ReplyForward");

dojo.require("rdw.QuickCompose");

rd.addStyle("rdw.css.ReplyForward");

dojo.declare("rdw.ReplyForward", [rdw.QuickCompose], {
  //Valid replyTypes: "reply" and "forward"
  replyType: "reply",

  //Owner widget that is showing this instance.
  //Used to tell owner if we destory ourselves.
  owner: null,

  postMixInProperties: function() {
    //summary: dijit lifecycle method.
    this.inherited("postMixInProperties", arguments);
    this.sendButtonText = this.i18n[this.replyType];
  },

  postCreate: function() {
    //summary: dijit lifecycle method.
    this.inherited("postCreate", arguments);

    //Add an extra class for specific styling
    dojo.addClass(this.domNode, this.replyType);

    //Add in a close button
    var closeNode = dojo.create("a", {
      href: "#",
      "class": "close",
      innerHTML: this.i18n.closeIcon
    }, this.actionsNode, "first");
    
    dojo.connect(closeNode, "onclick", this, "onCloseClick");
  },

  updateFields: function(/*String*/sender) {
    //summary: override of QuickCompose method. Set the to, subject and
    //body appropriately here.
    this.inherited("updateFields", arguments);

    var body = this.messageBag["rd.msg.body"];

    //Set To field
    this.defaultFromAddr = body.from[1];

    //Set Subject
    var subject = body.subject;
    if (subject) {
      subject = this.i18n[this.replyType + "SubjectPrefix"] + subject;
    } else {
      dojo.style(this.subjectInputNode, "display", "none");
    }
    rd.escapeHtml(subject || "", this.subjectInputNode);
  
    //Set body.
    //TODO: this is really hacky. Need a nice, localized time with
    //the person's name, better quoting, etc... the \n\n is bad too.
    this.textAreaNode.value = rd.escapeHtml(body.body).replace(/^/g, "> ") + "\n\n";
    setTimeout(dojo.hitch(this, function() {
      this.textAreaNode.focus();
    }));

    //TODO: do we need to store mail headers in the outgoing document to get
    //replies to thread correctly in other email clients?
  },

  initToSelector: function() {
    //summary: override of QuickCompose, so the to can be preset.
    this.inherited("initToSelector", arguments);
    this.toSelectorWidget.attr("value", this.defaultFromAddr);
  },

  onCloseClick: function(evt) {
    //summary: handles clicks to close icon, destroying this widget.

    //Tell cooperating widget so this widget is displayed properly.
    if (this.owner) {
      this.owner.responseClosed();
    }

    this.destroy();

    dojo.stopEvent(evt);
  }
});

