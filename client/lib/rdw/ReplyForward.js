dojo.provide("rdw.ReplyForward");

dojo.require("rdw.QuickCompose");

dojo.declare("rdw.ReplyForward", [rdw.QuickCompose], {
  //Valid replyTypes: "reply" and "forward"
  replyType: "reply",

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
    }, this.domNode, "first");
    
    dojo.connect(closeNode, "onclick", this, "onCloseClick");

    //Tell cooperating widget so this widget is displayed properly.
    if (this.topic) {
      this.createdForTopic(this.topic, this.topicData);
    }
  },

  onCloseClick: function(evt) {
    //summary: handles clicks to close icon, destroying this widget.

    //Tell cooperating widget so this widget is displayed properly.
    if (this.topic) {
      this.destroyedForTopic(this.topic, this.topicData);
    }

    this.destroy();

    dojo.stopEvent(evt);
  }
});

;(function(){
  //This widget listens for topic messages, so register them now.
  var makeWidget = function(/*String*/type, /*String*/topic, /*Object*/topicData) {
      //Right now, not doing anything with topicData.messageBag, but
      //it should be used to pull out context for the message.
      new rdw.ReplyForward({
        replyType: type,
        topic: topic,
        topicData: topicData
      });
  };

  //Subscribe and indicate this is an extension by passing in the extension's
  //module name as the first argument.
  rd.sub("rdw.ReplyForward", "rdw.Message-reply", dojo.partial(makeWidget, "reply", "rdw.Message-reply"));
  rd.sub("rdw.ReplyForward", "rdw.Message-forward", dojo.partial(makeWidget, "forward", "rdw.Message-reply"));

  rd.addStyle("rdw.css.ReplyForward");
})();
