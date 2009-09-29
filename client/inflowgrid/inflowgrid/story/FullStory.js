dojo.provide("inflowgrid.story.FullStory");

dojo.require("inflowgrid.Story");
dojo.require("rdw.story.FullStory");
dojo.require("inflowgrid.story.FullMessage");

dojo.declare("inflowgrid.story.FullStory", [rdw.story.FullStory], {
  //The name of the constructor function (module) that should be used
  //to show individual messages.
  messageCtorName: "inflowgrid.story.FullMessage",

  titleTemplate: '<div class="fullMessageTitle">${title}</div><div class="toolBox"><a class="archive" href="#archive">Archive</a><a class="spam" href="#spam">Spam</a><a class="delete" href="#delete">Delete</a></div>',
  
  templateString: inflowgrid.Story.prototype.templateString
});
