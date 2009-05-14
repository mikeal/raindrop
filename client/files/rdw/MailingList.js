dojo.provide("rdw.MailingList");

dojo.require("rd.conversation");

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
      success: function(json) {
        //Get conversation IDs.
        var convIds = [];
        for (var i = 0, row; row = json.rows[i]; i++) {
          convIds.push(row.value.conversation_id);
        }

        //Load up conversations and give to Stories
        rd.conversation(convIds, function(conversations) {
          dijit.byId("Stories").conversations(conversations);
        });
      }
    });
  }
});
