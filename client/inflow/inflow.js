dojo.provide("inflow");

rd.require("rdw.Loading");
rd.require("rdw.QuickCompose");
rd.require("rdw.Search");
rd.require("rdw.Summary");
rd.require("rdw.ContactList");
rd.require("rdw.Stories");
rd.require("rdw.Organizer");
rd.require("rdw.FaceWall");

rd.require("rd.engine");
rd.require("rd.conversation");

//Main controller for the inflow app. Handles message routing
//and converting it to UI display.

inflow = {
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
  
  //Subscribe to topics from organizer that can change the display.
  rd.sub("rd-protocol-contacts", inflow, "showContacts");
  var storyTopics = [
    "rd-protocol-home",
    "rd-protocol-direct",
    "rd-protocol-contact",
    "rd-protocol-broadcast",
    "rd-protocol-mailingList",
    "rd-protocol-locationTag"
  ];
  for (var i = 0, topic; topic = storyTopics[i]; i++) {
    rd.sub(topic, inflow, "showStories");
  }

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