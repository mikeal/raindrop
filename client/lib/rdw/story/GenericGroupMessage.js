dojo.provide("rdw.story.GenericGroupMessage");

dojo.require("rdw.Message");

dojo.declare("rdw.story.GenericGroupMessage", [rdw.Message], {
  normalTemplate: dojo.cache("rdw.story.templates", "GenericGroupMessage.html"),
  unknownUserTemplate: dojo.cache("rdw.story.templates", "GenericGroupMessage.html")
});
