dojo.provide("inflow.story.FullStory");

dojo.require("inflow.Story");
dojo.require("rdw.story.FullStory");
dojo.require("inflow.story.FullMessage");

dojo.declare("inflow.story.FullStory", [rdw.story.FullStory], {
  //The name of the constructor function (module) that should be used
  //to show individual messages.
  messageCtorName: "inflow.story.FullMessage",

  titleTemplate: '<div class="fullMessageTitle">${title}</div><div class="toolBox"><a class="archive" href="#archive">Archive</a><a class="spam" href="#spam">Spam</a><a class="delete" href="#delete">Delete</a></div>',
  
  templateString: inflow.Story.prototype.templateString
});
