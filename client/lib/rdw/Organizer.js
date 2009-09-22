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


    //Listen for different links already in the template, for current
    //selection changes.
    dojo.query("li[type]").forEach(function(node) {
      var type = node.getAttribute("type");
      this.subscribe("rd-protocol-" + type, dojo.hitch(this, "onSelectionChange", type));
    }, this);

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
        html += dojo.string.substitute('<li type="locationTag:${id}" class="locationTag dojoDndItem"><a href="#rd:locationTag:${id}">${name}</a></li>', {
          id: loc.toString(),
          name: loc.join("/")
        });
      }

      if (html) {
        this.addItems("listLocation", "Mail Folders", dojo._toDom(html));

        //Listen to set current selection state.
        this.subscribeSelection("locationTag");
      }
    }));
  },

  subscribeSelection: function(/*String*/protocolSubType) {
    //summary: subscribes to the selection notification for the rd-protocol topic
    //with the provided sub type.
    this.subscribe("rd-protocol-" + protocolSubType, dojo.hitch(this, "onSelectionChange", protocolSubType));
    
    //Check current URL fragment. If contains the protocol sub type, then set selection.
    var fragId = location.href.split("#")[1];
    var prefix = "rd:" + protocolSubType + ":";
    if (fragId && fragId.indexOf(prefix) == 0) {
      var args = fragId.substring(prefix.length, fragId.length);
      args = (args && args.split(":")) || [];
      args.unshift(protocolSubType);
      this.onSelectionChange.apply(this, args);
    }
  },

  onSelectionChange: function(/*String*/type, /*String*/arg) {
    //summary: as the selection changes, highlight the right thing in the organizer.
    //Can be called with no args, which means try applying previous stored
    //this.selectionType. Useful for extensions that add new things after an
    //async API call.

    if (type || this.selectionType) {
      //First remove current selection.
      dojo.query("li.selected", this.domNode).removeClass("selected");
  
      //Apply selection to the correct element.
      if (type) {
        this.selectionType = Array.prototype.join.call(arguments, ":");
      }
      if (this.selectionType) {
        dojo.query('[type="' + this.selectionType + '"]').addClass("selected");
      }
    }
  },

  destroy: function() {
    //summary: dijit lifecycle method
    this.dndSource.destroy();
    delete this.dndSource;
    this.inherited("destroy", arguments);
  }
});
