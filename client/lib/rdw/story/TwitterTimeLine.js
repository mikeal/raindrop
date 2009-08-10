dojo.provide("rdw.story.TwitterTimeLine");

dojo.require("rdw.Story");

rd.addStyle("rdw.story.css.TwitterTimeLine");

/**
 * Groups twitter broadcast messages into one "story"
 */
dojo.declare("rdw.story.TwitterTimeLine", [rdw.Story], {
  templateString: '<li class="rdwStoryTwitterTimeLine"> \
                    <span dojoAttachPoint="countNode"></span> Twitter Timeline \
                    <div class="tweetList" dojoAttachPoint="containerNode"></div> \
                    <a class="moreLess" dojoAttachPoint="moreLessNode" dojoAttachEvent="onclick: onMoreLessClick">${i18n.more}</a> \
                  </li>',

  /**
   * Indicates what state the widget is in, more or less.
   */
  moreLessState: "less",

  /**
   * The limit to use for the "less" state
   */
  lessLimit: 3,

  /**
   * The limit to use for the "more" state
   */
  moreLimit: 50,

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
    //Set the message limit before calling display.
    this.messageLimit = this.moreLessState == "less" ? this.lessLimit : this.moreLimit;

    this.inherited("display", arguments);

    //Update total count.
    rd.escapeHtml(dojo.string.substitute(this.i18n.poundCount, {
      count: this.msgs.length
    }), this.countNode, "only");

    //Update more/less link
    var text = this.moreLessState == "less" ? this.i18n.more : this.i18n.less;
    rd.escapeHtml(text, this.moreLessNode, "only");
  },

  /**
   * Handles clicks to show either more or less of the tweets.
   *
   * @param evt {Event} click event.
   */
  onMoreLessClick: function(evt) {
    this.moreLessState = this.moreLessState == "less" ? "more" : "less";
    this.display();
    dojo.stopEvent(evt);
  }
});
