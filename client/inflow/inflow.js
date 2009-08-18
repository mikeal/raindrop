dojo.provide("inflow");

dojo.require("rd.onHashChange");
dojo.require("rdw.Loading");
dojo.require("rdw.QuickCompose");
dojo.require("rdw.Search");
dojo.require("rdw.Summary");
dojo.require("rdw.ContactList");
dojo.require("rdw.Stories");
dojo.require("rdw.Organizer");
dojo.require("rdw.FaceWall");

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
    "rd-protocol-broadcast",
    "rd-protocol-locationTag"
  ],

  showStories: function() {
    //summary: shows the Stories widget and hides the ContactList widget.
    dijit.byId("stories").domNode.style.display = "";
    dijit.byId("contactList").domNode.style.display = "none";
    window.scrollTo(0, 0);
  },

  showContacts: function() {
    //summary: shows the ContactList widget and hides the Stories widget.
    dijit.byId("stories").domNode.style.display = "none";
    dijit.byId("contactList").domNode.style.display = "";
    window.scrollTo(0, 0);
  }
};

(function(){
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