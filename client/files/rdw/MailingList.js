dojo.provide("rdw.MailingList");
dojo.require("rdw._Base");

dojo.declare("rdw.MailingList", [rdw._Base], {
  id: "",
  name: "",

  templatePath: dojo.moduleUrl("rdw.templates", "MailingList.html"),

  postMixInProperties: function() {
    //summary: dijit lifecycle method
    this.inherited("postMixInProperties", arguments);

    this.id = this.doc.key[0];
    this.name = this.doc.key[0].split(".")[0];
    this.title = this.doc.key[1]; /* this is always either the name or id */
  },

  onClick: function(evt) {
    //summary: handles click delegation when clicking on list of links.
    var target = evt.target;
    if (target.href) {
      target = target.href.split("#")[1];
      if (target) {
        dojo.publish("rd-nav-" + target);
        dojo.stopEvent(evt);
        this.show(target);
      }
    }
  },

  show: function(id) {
    couch.db("raindrop").view("raindrop!messages!by/_view/by_mailing_list", {
      keys: [id],
      limit: 30,
      include_docs: true,
      success: function(json) {
        dijit.byId("Stories").docs(json.rows);
      }
    });
  }

});
