dojo.provide("rdw.Organizer");
dojo.require("rdw._Base");
dojo.require("rdw.MailingList");

dojo.declare("rdw.Organizer", [rdw._Base], {
  mailing_lists: null,

  templatePath: dojo.moduleUrl("rdw.templates", "Organizer.html"),

  postMixInProperties: function() {
    //summary: dijit lifecycle method
    this.inherited("postMixInProperties", arguments);
  },

  postCreate: function() {
    //summary: dijit lifecycle method
    this.inherited("postCreate", arguments);

    if (this.mailing_lists) {
      //for each (var mailing_list in this.mailing_lists) {
      //  alert([key for (key in mailing_list.value)].join(", "));

      //Use a document fragment for best performance
      //and load up each story widget in there.
      var frag = dojo.doc.createDocumentFragment();
      dojo.forEach(this.mailing_lists, function(doc) {
        new rdw.MailingList({
          doc: doc
        }, dojo.create("div", null, frag));
      });

      //Inject nodes all at once for best performance.
      this.domNode.firstElementChild.appendChild(frag);
    }
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
    couch.db("raindrop").view("raindrop!messages!by/_view/by_doc_type", {
      keys: ["message"],
      limit: 30,
      include_docs: true,
      group : false,
      success: function(json) {
        //Grab the docs from the returned rows.
        var docs = rd.map(json.rows, function(row) {
          return row.doc;
        });

        // Replace the existing stories widget with a new one
        // containing the messages we just retrieved.
        var stories = dijit.byId("Stories");
        if (stories)
          stories.destroy();
        new rdw.Stories({
          docs: docs
        }, rd.create("div", { id: "Stories" }, rd.byId("StoriesContainer")));
      }
    });
  }

});
