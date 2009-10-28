/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Raindrop.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Messaging, Inc..
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * */

dojo.provide("rdw.story.TwitterTimeLine");

dojo.require("rdw.Story");

/**
 * Groups twitter broadcast messages into one "story"
 */
dojo.declare("rdw.story.TwitterTimeLine", [rdw.Story], {
  templateString: '<div class="rdwStoryTwitterTimeLine"> \
                    <div class="timestamp" dojoAttachPoint="timestampNode"> \
                    <span class="friendly" dojoAttachPoint="friendlyNode"></span> \
                    </div> \
                    <div class="tweetList" dojoAttachPoint="containerNode"><div class="tweetTitle">Fresh tweets!</div></div> \
                   </div>',

  /**
   * The limit of tweets to use.
   */
  unreadReplyLimit: 1,

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
