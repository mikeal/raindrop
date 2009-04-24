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
      }
    }
  }
});
