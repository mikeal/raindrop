dojo.provide("inflow.Message");

dojo.require("rdw.Message");
dojo.require("inflow.Message");

dojo.declare("inflow.Message", [rdw.Message], {
  normalTemplate: dojo.cache("inflow.templates", "Message.html"),
  unknownUserTemplate: dojo.cache("inflow.templates", "MessageUnknown.html")
});
