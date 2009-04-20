dojo.provide("rdw.ReplyForward");

dojo.require("rdw.ReplyForward");

dojo.declare("rdw.QuickCompose", [rdw.QuickCompose], {
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
    dojo.addClass(this.domNode, this.replyType);
    
  }
});

;(function(){
  //This widget listens for topic messages, so register them now.
  var makeWidget = function(/*String*/type, /*Object*/topicData) {
      //Right now, not doing anything with topicData.doc, but
      //it should be used to pull out context for the message.
      new rdw.QuickCompose({
        replyType: type
      }, topicData.node);
  };

  rd.sub("rdw.Message-reply", dojo.partial(makeWidget, "reply"));
  rd.sub("rdw.Message-forward", dojo.partial(makeWidget, "forward"));

  rd.loadStyle("rdw.css.ReplyForward");
})();
