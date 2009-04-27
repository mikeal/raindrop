dojo.provide("rdw.Organizer");
dojo.require("rdw._Base");
dojo.require("rdw.MailingList");

dojo.declare("rdw.Organizer", [rdw._Base], {
  // Mailing lists to which any messages in the datastore belong.
  // Populated by a view after the widget gets created.
  _mailingLists: null,
  mailingLists: function(newVal) {
    if (!newVal)
      return this._mailingLists;

    this._mailingLists = newVal;

    // Remove existing mailing list widgets from the presentation.
    rd.query(".MailingList", this.list).forEach(function(mailingList) {
      rd.destroy(mailingList);
    });

    //Use a document fragment for best performance
    //and load up each story widget in there.
    var frag = dojo.doc.createDocumentFragment();
    dojo.forEach(this._mailingLists, function(doc) {
      new rdw.MailingList({
        doc: doc
      }, dojo.create("div", null, frag));
    });

    //Inject nodes all at once for best performance.
    this.list.appendChild(frag);

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

    this.showHome();

    // Populate the widget with a list of mailing lists to which any messages
    // in the datastore belong.
    couch.db("raindrop").view("raindrop!mailing_lists!all/_view/by_list_id", {
      group: true,
      success: dojo.hitch(this, function(json) {
        this.mailingLists(json.rows);
      })
    });
  },

  onClick: function(evt) {
    //summary: handles click delegation when clicking on list of links.
    var target = evt.target;
    if (target.href) {
      target = target.href.split("#")[1];
      if (target) {
        dojo.publish("rd-nav-" + target);
        dojo.stopEvent(evt);
        if (target == "home")
          this.showHome();
      }
    }
  },

  showHome: function() {
    couch.db("raindrop").view("raindrop!messages!by/_view/by_timestamp", {
      limit: 30,
      include_docs: false, // the timestamp view includes conversation ids in the value
      descending: true,
      success: function(json) {
        dijit.byId("Stories").docs(json.rows);
      }
    });
  }

});
