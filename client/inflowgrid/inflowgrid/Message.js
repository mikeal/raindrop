dojo.provide("inflowgrid.Message");

dojo.require("rdw.Message");
dojo.require("inflowgrid.Message");

dojo.declare("inflowgrid.Message", [rdw.Message], {
  normalTemplate: dojo.cache("inflowgrid.templates", "Message.html"),
  unknownUserTemplate: dojo.cache("inflowgrid.templates", "MessageUnknown.html")
});
