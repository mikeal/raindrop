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
    "listMailingList",
    "listLocation"
  ],

  postCreate: function() {
    //summary: dijit lifecycle method
    this.inherited("postCreate", arguments);

    this.dndSource = new dojo.dnd.Source(this.listNode);

    //Generate a list of links for the Organizer.
    //Use a name dispatch convention to allow extensions
    //to add other links.
    for (var i = 0, funcName; funcName = this.listOrder[i]; i++) {
      this[funcName]();
    }
  },

  addItems: function(/*String*/type, /*String*/title, /*DOMNode or DocumentFragment*/items) {
    //summary: called by list functions to add items to the DOM.
    //TODO: need to use listType and title
    var dndNodes = items;
    if (dndNodes.nodeType == 11) {
      dndNodes = dndNodes.childNodes;
    }
    this.dndSource.insertNodes(false, dndNodes);

    dojo.place(items, this.listNode);
  },

  listMailingList: function() {
    //summary: shows a list of mailing lists available for viewing.
    rd.tag.lists(dojo.hitch(this, function(ids) {
      var html = "";
      for (var i = 0, id; id = ids[i]; i++) {
        html += dojo.string.substitute('<li class="mailingList dojoDndItem"><a title="${id}" href="#rd:mailingList:${id}" >${name}</a></li>', {
          id: id,
          //TODO: use the mailing list doc's "name" property if available.
          name: id.split(".")[0]
        });
      }

      if (html) {
        this.addItems("listMailingList", "Mailing Lists", dojo._toDom(html));
      }
    }));
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
