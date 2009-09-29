dojo.provide("inflow.story.TwitterTimeLine");

dojo.require("rdw.story.TwitterTimeLine");

/**
 * Groups twitter broadcast messages into one "story"
 */
dojo.declare("inflow.story.TwitterTimeLine", [rdw.story.TwitterTimeLine], {

  //The name of the constructor function (module) that should be used
  //to show individual messages.
  messageCtorName: "inflow.Message",

  templateString: '<div class="inflowStoryTwitterTimeLine"> \
                    <div class="tweetList" dojoAttachPoint="containerNode"><div class="tweetTitle">Fresh tweets!</div></div> \
                   </div>'
});
