dojo.provide("rdw.ext.messageByContact");

dojo.require("rd.conversation");

rdw.ext.messageByContact = function(/*String*/contactId) {
  //An extension that handles topics for when a contact is clicked.
  rd.conversation.byContact(contactId, function(conversations) {
    rd.pub("rd-display-conversations", conversations);
  });
};

//Register to listen for protocol links for contacts.
rd.sub("rd-protocol-contact", rdw.ext, "messageByContact");
