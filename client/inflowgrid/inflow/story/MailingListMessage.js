dojo.provide("inflow.story.MailingListMessage");

dojo.require("rdw.story.MailingListMessage");

dojo.declare("inflow.story.MailingListMessage", [rdw.story.MailingListMessage], {
  normalTemplate: dojo.cache("inflow.story.templates", "MailingListMessage.html"),
  unknownUserTemplate: dojo.cache("inflow.story.templates", "MailingListMessage.html")
});
