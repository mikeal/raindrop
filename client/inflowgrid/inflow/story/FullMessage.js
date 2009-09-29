dojo.provide("inflow.story.FullMessage");

dojo.require("rdw.story.FullMessage");

dojo.declare("inflow.story.FullMessage", [rdw.story.FullMessage], {
  normalTemplate: dojo.cache("inflow.story.templates", "FullMessage.html"),
  unknownUserTemplate: dojo.cache("inflow.story.templates", "FullMessage.html")
});
