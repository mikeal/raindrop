dojo.provide("rdw.ext.facebookNotification.Group");

dojo.require("rdw.story.GenericGroup");

dojo.declare("rdw.ext.facebookNotification.Group", [rdw.story.GenericGroup], {
  matchRegExp: /notification[^@]*@facebookmail.com/,

  /**
   * Determines if message is supported.
   *
   * @param messageBag {object} the collection of message schemas for a message.
   */
  canHandle: function(messageBag) {
    var targetDoc = messageBag["rd.msg.recip-target"];
    var bodyDoc = messageBag["rd.msg.body"];
    var target = targetDoc && targetDoc.target;

    return target == "notification" && bodyDoc && bodyDoc.from && this.matchRegExp.test(bodyDoc.from[1] || "");
  },
  
  postMixInProperties: function() {
    this.inherited("postMixInProperties", arguments);
    this.groupTitle = "Facebook Notifications";
  }
});
