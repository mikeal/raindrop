dojo.provide("inflow");

rd.require("rdw.QuickCompose");
rd.require("rdw.Search");
rd.require("rdw.ContactList");
rd.require("rdw.Stories");
rd.require("rdw.Organizer");
rd.require("rdw.FaceWall");

rd.require("rd.engine");
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

  var messageUpdater = null;

  //Handle any request to display conversations.
  rd.sub("rd-display-conversations", function(conversations, updater, isRefresh) {
    //any conversation updater is assumed to have an refreshConversations()
    //function in case the rd.engine.autoSync returns done and we need to refresh
    //the display.
    messageUpdater = updater;

    //TODO: if isRefresh is true, just refresh the data, do not wipe out a conversation if
    //it already exists.
    clear();

    storiesWidget = new rdw.Stories({
      conversations: conversations
    }, dojo.create("div", null, dojo.byId("mainList"), "only"));
  });

  //Register for rd.engine's auto update complete topic, so we can
  //refresh the conversations as appropriate.
  rd.sub("rd-engine-sync-done", function() {
    if (messageUpdater && messageUpdater.refreshConversations) {
      messageUpdater.refreshConversations();
    }
  });

  //Register to listen for protocol link for Home.
  rd.sub("rd-protocol-home", function() {
    rd.conversation.byTimeStamp(30, function(conversations) {
      rd.pub("rd-display-conversations", conversations, {
        refreshConversations: function() {
          //TODO: this does not pass that the operation
          //is a refresh, so a bit destructive.
          rd.pub("rd-protocol-home");
        }
      });
    });
  });

  //Register to listen for protocol link for Contacts.
  rd.sub("rd-protocol-contacts", function() {
    //Set messageUpdater to null so that any sync messages
    //while viewing contacts does not mess up the contacts.
    //Although, maybe contacts should also allow for updating?
    messageUpdater = null;
    
    rd.contact.list(function(contacts) {
      clear();

      contactsWidget = new rdw.ContactList({
        contacts: contacts
      }, dojo.create("div", null, dojo.byId("mainList"), "only"));
    });
  });

  //Register to listen for protocol link for when a contact is
  //clicked on, probably from the face wall.
  rd.sub("rd-protocol-contact", function(/*String*/contactId) {
    rd.conversation.byContact(contactId, function(conversations) {
      rd.pub("rd-display-conversations", conversations, {
        refreshConversations: function() {
          //TODO: this does not pass that the operation
          //is a refresh, so a bit destructive.
          rd.pub("rd-protocol-contact", contactId);
        }
      });      
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
      var win = extender = window.open(evt.target.href, "extender", "width=830,height=700,scrollbars=yes,resizable=yes,status=yes,toolbar=yes,location=yes");
    }

    extender.focus();

    dojo.stopEvent(evt);
  });

  //Do onload work that shows the initial display.
  dojo.addOnLoad(function() {
    //Trigger the "home" action.
    rd.pub("rd-protocol-home");

    //Start up the autosyncing if desired, time is in seconds.
    var autoSync = 0;
    var args = location.href.split("#")[0].split("?")[1];
    if (args) {
      args = dojo.queryToObject(args);
      if (args.autosync) {
        if (args.autosync == "off") {
          autoSync = 0;
        } else {
          autoSync = parseInt(args.autosync, 10);
        }
      }
    }

    if (autoSync) {
      rd.engine.autoSync(autoSync);
    }
  });
})();