dojo.provide("rdw.Organizer");

dojo.require("rd.conversation");
dojo.require("rd.tag");
dojo.require("rdw._Base");
dojo.require("dojo.dnd.Source");
dojo.require("dijit.TitlePane");

dojo.declare("rdw.Organizer", [rdw._Base], {
  // Mailing lists to which any messages in the datastore belong.
  // Populated by a view after the widget gets created.

  widgetsInTemplate: true,

  templatePath: dojo.moduleUrl("rdw.templates", "Organizer.html"),

  //The order in which to call list operations
  //push new items to this array and define matching function
  //on Organizer to extend Organizer listing.
  listOrder: [
    "listLocation"
  ],

  postCreate: function() {
    //summary: dijit lifecycle method
    this.inherited("postCreate", arguments);

    this.dndSource = new dojo.dnd.Source(this.listNode);

    //Generate a list of links for the Organizer.
    //Use a name dispatch convention to allow extensions
    //to add other links.
    this.listToPane = {};
    for (var i = 0, funcName; funcName = this.listOrder[i]; i++) {
      //The extension funcName may not exist, so ignore if not defined
      if (!this[funcName]) {
        continue;
      }

      //Create a TitlePane that will hold some items, initially hidden.
      var pane = new dijit.TitlePane({}, dojo.place('<div>', this.domNode));
      pane.domNode.style.display = "none";
      
      //Create an empty ul inside the pane that is a drag source.
      var node = dojo.place('<ol></ol>', pane.containerNode);
      if (!pane._supportingWidgets) {
        pane._supportingWidgets = [];
      }

      pane.listNodeDndSource = new dojo.dnd.Source(node);
      pane._supportingWidgets.push(pane.listNodeDndSource);

      pane.listNode = node;

      //Remember this TitlePane and call method that populates it.
      this.listToPane[funcName] = pane;
      this[funcName]();
    }
  },

  addItems: function(/*String*/type, /*String*/title, /*DOMNode or DocumentFragment*/items) {
    //summary: called by list functions to add items to the DOM.
    
    var pane = this.listToPane[type];
    pane.attr("title", title);

    var dndNodes = items;
    if (dndNodes.nodeType == 11) {
      dndNodes = dndNodes.childNodes;
    }
    pane.listNodeDndSource.insertNodes(false, dndNodes);

    dojo.place(items, pane.listNode);
    pane.domNode.style.display = "";
  },

  listLocation: function() {
    //summary: shows a list of imap location folders available for viewing.
    rd.tag.locations(dojo.hitch(this, function(locations) {
      var html = "";
      for (var i = 0, loc; loc = locations[i]; i++) {
        html += dojo.string.substitute('<li class="locationTag dojoDndItem"><a href="#rd:locationTag:${id}">${name}</a></li>', {
          id: loc.toString(),
          name: loc.join("/")
        });
      }

      if (html) {
        this.addItems("listLocation", "Mail Folders", dojo._toDom(html));
      }
    }));
  },

  destroy: function() {
    //summary: dijit lifecycle method
    this.dndSource.destroy();
    this.inherited("destroy", arguments);
  }
});
