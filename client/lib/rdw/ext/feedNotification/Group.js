dojo.provide("rdw.ext.feedNotification.Group");

dojo.require("rdw.story.GenericGroup");

dojo.declare("rdw.ext.feedNotification.Group", [rdw.story.GenericGroup], {
  /**
   * Holds on to the ID for the feed.
   */
  feedId: "",
  
  /**
   * pulls the feed ID out of the messageBag's rss-entry schema.
   */
  getFeedId: function(messageBag) {
    var feedId = messageBag["rd.raw.rss-entry"];
    return feedId && feedId.channel && feedId.channel.headers && feedId.channel.headers["content-location"];
  },

  /**
   * Determines if message is supported.
   *
   * @param messageBag {object} the collection of message schemas for a message.
   */
  canHandle: function(messageBag) {
    var feedId = this.getFeedId(messageBag);
    return (feedId && !this.feedId) || (this.feedId == feedId);
  },

  addMessage: function(messageBag) {
    this.inherited("addMessage", arguments);

    //Save the feed ID so only accept entries from this feed.
    if (!this.feedId) {
      this.feedId = this.getFeedId(messageBag);
    }

    //Set the title of the feed.
    if (messageBag) {
      var title = messageBag["rd.raw.rss-entry"];
      title = title && title.channel && title.channel.feed && title.channel.feed.title;
      if (title) {
        this.groupTitle = title;
      }
    }
  }
});
