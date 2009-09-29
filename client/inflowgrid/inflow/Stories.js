dojo.provide("inflow.Stories");

dojo.require("rdw.Stories");
dojo.require("inflow.Story");
dojo.require("inflow.story.FullStory");

dojo.declare("inflow.Stories", [rdw.Stories], {
  //Widget used for story objects.
  storyCtorName: "inflow.Story",

  //The widget to use to show a full story.
  fullStoryCtorName: "inflow.story.FullStory",

  //List of modules that may want to group messages in the home view.
  //It is assumed that moduleName.prototype.canHandle(messageBag) is defined
  //for each entry in this array.
  homeGroups: [
    "inflow.story.TwitterTimeLine"
  ],

  templateString: '<div class="rdwStories" dojoAttachEvent="onclick: onClick, onkeypress: onKeyPress">'
                + '  <div dojoAttachPoint="listNode"></div>'
                + '  <div dojoAttachPoint="convoNode"></div>'
                + '</div>'
});
