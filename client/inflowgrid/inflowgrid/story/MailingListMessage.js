dojo.provide("inflowgrid.story.MailingListMessage");

dojo.require("rdw.story.MailingListMessage");

dojo.declare("inflowgrid.story.MailingListMessage", [rdw.story.MailingListMessage], {
  normalTemplate: dojo.cache("inflowgrid.story.templates", "MailingListMessage.html"),
  unknownUserTemplate: dojo.cache("inflowgrid.story.templates", "MailingListMessage.html")
});
