dojo.provide("rdw.story.TwitterTimeLine");

dojo.require("rdw.Story");

rd.addStyle("rdw.story.css.TwitterTimeLine");

/**
 * Groups twitter broadcast messages into one "story"
 */
dojo.declare("rdw.story.TwitterTimeLine", [rdw.Story], {
  templateString: '<li class="rdwStoryTwitterTimeLine"> \
                    <div class="tweetList" dojoAttachPoint="containerNode"><div class="tweetTitle">Fresh tweets!</div></div> \
                   </li>',

  /**
   * The limit of tweets to use.
   */
  unreadReplyLimit: 2,

  /**
   * Do not format messages greater than the first one as replies
   */
  replyStyle: "",

  /**
   * sorting to use for messages. Unlike rdw.Story, the twitter timeline
   * should show most recent tweet first. This method should not use
   * the "this" variable.
   */
  msgSort: function (a,b) {
    return a["rd.msg.body"].timestamp < b["rd.msg.body"].timestamp
  },

  /**
   * Determines if TwitterTimeLine can support this message.
   *
   * @param messageBag {object} the collection of message schemas for a message.
   */
  canHandle: function(messageBag) {
    var recip = messageBag["rd.msg.recip-target"];
    var tweetRaw = messageBag["rd.msg.tweet.raw"];
    return messageBag["rd.msg.tweet.raw"] && recip && recip.target == "broadcast";
  },

  /**
   * Extends base class implementation of display to do subclass-specific rendering.
   */
  display: function() {
    this.inherited("display", arguments);

    //Update total count.
    rd.escapeHtml(dojo.string.substitute(this.i18n.poundCount, {
      count: this.msgs.length
    }), this.countNode, "only");
  }
});
