dojo.provide("rdw.Organizer");

dojo.require("rd.conversation");
dojo.require("rdw._Base");
dojo.require("rdw.MailingList");
dojo.require("dojo.dnd.Source");

dojo.declare("rdw.Organizer", [rdw._Base], {
  // Mailing lists to which any messages in the datastore belong.
  // Populated by a view after the widget gets created.
  widgetsInTemplate: true,

  _mailingLists: null,
  mailingLists: function(newVal) {
    if (!newVal)
      return this._mailingLists;

    this._mailingLists = newVal;

    // Remove existing mailing list widgets from the presentation.
    rd.query(".MailingList", this.listNode).forEach(function(mailingList) {
      rd.destroy(mailingList);
    });

    //Use a document fragment for best performance
    //and load up each story widget in there.
    var frag = dojo.doc.createDocumentFragment();
    var dndNodes = [];
    dojo.forEach(this._mailingLists, dojo.hitch(this, function(doc) {
      //Store widgets in this._supportingWidgets so they get destroyed properly
      //by dijit infrastructure.
      if (!this._supportingWidgets) {
        this._supportingWidgets = [];
      }
      var widget = new rdw.MailingList({
          doc: doc,
          "class": "dojoDndItem"
        }, dojo.create("div", null, frag));
      
      this._supportingWidgets.push(widget);
      dndNodes.push(widget.domNode);
    }));

    //Inject nodes all at once for best performance.
    this.listNode.appendChild(frag);

    //Register newly created nodes for DND
    this.dndSource.insertNodes(false, dndNodes);

    // Return anything to suppress JavaScript strict warnings about the function
    // not always returning a value.
    return true;
  },

  templatePath: dojo.moduleUrl("rdw.templates", "Organizer.html"),

  postMixInProperties: function() {
    //summary: dijit lifecycle method
    this.inherited("postMixInProperties", arguments);
  },

  postCreate: function() {
    //summary: dijit lifecycle method
    this.inherited("postCreate", arguments);

    this.dndSource = new dojo.dnd.Source(this.listNode);

    // Populate the widget with a list of mailing lists to which any messages
    // in the datastore belong.
    couch.db("raindrop").view("raindrop!content!all/_view/megaview", {
      startkey: ['rd.msg.email.mailing-list', 'id'],
      endkey: ['rd.msg.email.mailing-list', 'id', {}],
      group_level: 3,
      success: dojo.hitch(this, function(json) {
        var lists = [];
        for (var i = 0, row; i<json.rows.length; i++) {
          lists.push(json.rows[i].key[2]);
        }
        this.mailingLists(lists);
      })
    });
  },
  
  destroy: function() {
    //summary: dijit lifecycle method
    this.dndSource.destroy();
    this.inherited("destroy", arguments);
  }
});
