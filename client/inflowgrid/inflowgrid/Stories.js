dojo.provide("inflowgrid.Stories");

dojo.require("rdw.Stories");
dojo.require("inflowgrid.Story");
dojo.require("inflowgrid.story.FullStory");

dojo.declare("inflowgrid.Stories", [rdw.Stories], {
  //Widget used for story objects.
  storyCtorName: "inflowgrid.Story",

  //The widget to use to show a full story.
  fullStoryCtorName: "inflowgrid.story.FullStory",

  //List of modules that may want to group messages in the home view.
  //It is assumed that moduleName.prototype.canHandle(messageBag) is defined
  //for each entry in this array.
  homeGroups: [
    "inflowgrid.story.TwitterTimeLine"
  ],

  templateString: '<div class="rdwStories" dojoAttachEvent="onclick: onClick, onkeypress: onKeyPress">'
                + '  <div dojoAttachPoint="listNode"></div>'
                + '  <div dojoAttachPoint="convoNode"></div>'
                + '</div>'
});
