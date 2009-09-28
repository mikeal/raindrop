dojo.provide("inflow.Organizer");

dojo.require("rd.conversation");
dojo.require("rd.tag");
dojo.require("rdw._Base");

dojo.declare("inflow.Organizer", [rdw._Base], {
  // Mailing lists to which any messages in the datastore belong.
  // Populated by a view after the widget gets created.

  widgetsInTemplate: true,

  templatePath: dojo.moduleUrl("inflow.templates", "Organizer.html"),

  listContainerHtml: '<select class="${listClass}></select>',

  //The order in which to call list operations
  //push new items to this array and define matching function
  //on Organizer to extend Organizer listing.
  listOrder: [
    "listLocation"
  ],

  postCreate: function() {
    //summary: dijit lifecycle method
    this.inherited("postCreate", arguments);

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
      var paneNode = dojo.place(rd.template(this.listContainerHtml, {
        listClass: funcName
      }), this.domNode);
      
      //Bizarre, webkit is making a DocumentFragment for the place call?
      if (paneNode.style) {
        paneNode.style.display = "none";
      }

      //Remember this TitlePane and call method that populates it.
      this.listToPane[funcName] = paneNode;
      this[funcName]();
    }
  },

  addItems: function(/*String*/type, /*String*/title, /*DOMNode or DocumentFragment*/items) {
    //summary: called by list functions to add items to the DOM.
    
    var paneNode = this.listToPane[type];
    dojo.place('<option>' + title + '</option>', paneNode);

    dojo.place(items, paneNode);
    paneNode.style.display = "";
  },

  listLocation: function() {
    //summary: shows a list of imap location folders available for viewing.
    rd.tag.locations(dojo.hitch(this, function(locations) {
      var html = "";
      for (var i = 0, loc; loc = locations[i]; i++) {
        html += dojo.string.substitute('<option value="rd:locationTag:${id}">${name}</option>', {
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
    this.inherited("destroy", arguments);
  }
});
