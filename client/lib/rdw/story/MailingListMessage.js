dojo.provide("rdw.story.MailingListMessage");

dojo.require("rdw.Message");

dojo.declare("rdw.story.MailingListMessage", [rdw.Message], {
  normalTemplate: dojo.cache("rdw.story.templates", "MailingListMessage.html"),
  unknownUserTemplate: dojo.cache("rdw.story.templates", "MailingListMessage.html")
});
