dojo.provide("rdw.ext.messageByContact");

dojo.require("rd.conversation");

rdw.ext.messageByContact = function(/*String*/contactId) {
  //An extension that handles topics for when a contact is clicked.
  //Assumes a Stories widget exists in the page.
  rd.conversation.byContact(contactId, function(conversations) {
    dijit.byId("Stories").conversations(conversations);
  });
};

//Register to listen for protocol links for contacts.
rd.sub("rd-protocol-contact", rdw.ext, "messageByContact");
