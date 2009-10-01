dojo.provide("inflowgrid.story.FullMessage");

dojo.require("rdw.story.FullMessage");

dojo.declare("inflowgrid.story.FullMessage", [rdw.story.FullMessage], {
  normalTemplate: dojo.cache("inflowgrid.story.templates", "FullMessage.html"),
  unknownUserTemplate: dojo.cache("inflowgrid.story.templates", "FullMessage.html")
});
