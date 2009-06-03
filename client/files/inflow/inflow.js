dojo.provide("inflow");

rd.require("rdw.QuickCompose");
rd.require("rdw.Search");
rd.require("rdw.ContactList");
rd.require("rdw.Stories");
rd.require("rdw.Organizer");
rd.require("rdw.FaceWall");

rd.require("rd.conversation");

//Main controller for the inflow app. Handles message routing
//and converting it to UI display.

(function(){
  var storiesWidget, contactsWidget;

  function clear() {
    //Makes sure to destroy any current widgets in the mainList
      if (storiesWidget) {
        storiesWidget.destroy();
        storiesWidget = null;
      }
      if (contactsWidget) {
        contactsWidget.destroy();
        contactsWidget = null;
      }
  }

  //Handle any request to display conversations.
  rd.sub("rd-display-conversations", function(conversations) {
    clear();

    storiesWidget = new rdw.Stories({
      conversations: conversations
    }, dojo.create("div", null, dojo.byId("mainList"), "only"));
  });

  //Register to listen for protocol link for Home.
  rd.sub("rd-protocol-home", function() {
    rd.conversation.byTimeStamp(30, function(conversations) {
      rd.pub("rd-display-conversations", conversations);
    });
  });

  //Register to listen for protocol link for Contacts.
  rd.sub("rd-protocol-contacts", function() {
    rd.contact.list(function(contacts) {
      clear();

      contactsWidget = new rdw.ContactList({
        contacts: contacts
      }, dojo.create("div", null, dojo.byId("mainList"), "only"));
    });
  });

  var extender = null;
  //Open the extender in a new sized window so it does not open
  //as a tab.
  dojo.query(".extendLink").onclick(function(evt){
    if(!extender || extender.closed) {
      //open a new window but specify the URL as same as current page
      //so we can hopefully allow cross-window JS calling.
      //But I am not sure document.write loading is the most robust, in particular
      //across browsers. Use a timeout to deal with occasional issue with
      //DOM not being ready right away.
      var win = extender = window.open(evt.target.href, "extender", "width=430,height=700,scrollbars=yes,resizable=yes,status=yes,toolbar=yes,location=yes");
    }

    extender.focus();

    dojo.stopEvent(evt);
  });
})();