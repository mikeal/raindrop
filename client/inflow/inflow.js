dojo.provide("inflow");

dojo.require("rd.onHashChange");
dojo.require("rdw.Loading");
dojo.require("rdw.Notify");
dojo.require("rdw.QuickCompose");
dojo.require("rdw.Search");
dojo.require("rdw.Account");
dojo.require("rdw.Summary");
dojo.require("rdw.ContactList");
dojo.require("rdw.Stories");
dojo.require("rdw.Organizer");

dojo.require("rd.engine");
dojo.require("rd.conversation");

//Main controller for the inflow app. Handles message routing
//and converting it to UI display.

inflow = {
  //Topics that change the view to the contact view.
  contactTopics: [
    "rd-protocol-contacts"
  ],

  //Topics that change the view to the story view.
  storyTopics: [
    "rd-protocol-home",
    "rd-protocol-direct",
    "rd-protocol-contact",
    "rd-protocol-group",
    "rd-protocol-sent",
    "rd-protocol-locationTag",
    "rd-protocol-conversation"
  ],

  showStories: function() {
    //summary: shows the Stories widget and hides the ContactList widget.
    if (this.showState != "stories") {
      dijit.byId("stories").domNode.style.display = "";
      dijit.byId("contactList").domNode.style.display = "none";
      this.showState = "stories";
    }
  },

  showContacts: function() {
    //summary: shows the ContactList widget and hides the Stories widget.
    if (this.showState != "contacts") {
      dijit.byId("stories").domNode.style.display = "none";
      dijit.byId("contactList").domNode.style.display = "";
      this.showState = "contacts";
    }
  },

  addAccountUrl: "/raindrop/settings/index.html",

  showAccounts: function() {
    //summary: shows the account setup in an iframe.
    dojo["require"]("dijit.Dialog");
    dojo.addOnLoad(this, function() {
      this.accountsDialog = new dijit.Dialog({
        "class": "inflowAddAccountFrame"  
      }, dojo.create("div", null, dojo.body()));

      this.accountsDialog.containerNode.innerHTML = '<iframe src="' + this.addAccountUrl + '"></iframe>';
      this.accountsDialog.show();
    });
  },

  onAccountFrameMessage: function(evt) {
    //summary: a postMessage endpoint for messages from the account frame.
    if (evt.data == "settings-done") {
      this.accountsDialog.hide();
      this.accountsDialog.destroy();
      this.accountsDialog = null;
    }
  },

  onKeyPress: function(evt) {
    //Show help on key of question mark.
    if (this.keyboardNavShowing) {
      dojo.byId("keyboardHelp").style.display = "none";
      this.keyboardNavShowing = false;
    } else if (evt && evt.charCode == 63) {
      dojo.byId("keyboardHelp").style.display = "block";
      this.keyboardNavShowing = true;
    } else if (!this.firstNav) {
      //Only focus on first story if this is the first
      //keypress.
      var widget = dijit.byId("stories");
      if (evt.keyCode == widget.navKeys.down) {
        widget.onKeyPress(evt);
      }
      this.firstNav == true;
    }
  }
};

(function(){
  //Set the window name, so extender can target it.
  //TODO: need to make this more generic, to work across raindrop apps.
  window.name = "raindrop";

  //Listen to no accounts/show account settings subscriptions
  rd.sub("rd.api.me.noAccounts", inflow, "showAccounts");
  rd.sub("rd-protocol-account-settings", inflow, "showAccounts");

  //Do onload work that shows the initial display.
  dojo.addOnLoad(function() {
    //Subscribe to topics from organizer that can change the display.
    for (var i = 0, topic; topic = inflow.contactTopics[i]; i++) {
      rd.sub(topic, inflow, "showContacts");
    }
    for (i = 0; topic = inflow.storyTopics[i]; i++) {
      rd.sub(topic, inflow, "showStories");
    }

    //Trigger the first list of items to show. Favor a fragment ID on the URL.
    var fragId = location.href.split("#")[1];
    if (fragId) {
      rd.dispatchFragId(fragId);
    } else {
      rd.pub("rd-protocol-home");
    }

    //Listen for hash changes but only if the hash value is empty,
    //which means do our default action (view home)
    rd.sub("rd.onHashChange", function(val) {
      if (!val) {
        rd.pub("rd-protocol-home");
      }
    });

    //Listen for completion for the addAccount frame.
    window.addEventListener("message", dojo.hitch(inflow, "onAccountFrameMessage"), false);


    //Listen for ? to show the help, also to start keyboard nav
    dojo.connect(dojo.doc, "onkeypress", inflow, "onKeyPress");

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

    //watch for auto sync
    if (autoSync) {
      rd.engine.autoSync(autoSync);
    }
  });
})();