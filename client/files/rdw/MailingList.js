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

    // FIXME: this is now only passed with the list ID...
    this.title = this.id = this.doc;
    this.name = this.id.split(".")[0];
//    this.title = this.doc.key[1]; /* this is always either the name or id */
  },

  onClick: function(evt) {
    //summary: handles click delegation when clicking on list of links.
    var target = evt.target;
    if (target.href) {
      target = target.href.split("#")[1];
      if (target) {
        dojo.publish("rd-protocol-" + target);
        dojo.stopEvent(evt);
        this.show(target);
      }
    }
  },

  show: function(id) {
    // XXX - this is broken - sorry about that :(
    // I think we might need a tweak to the mega-view here...
    // Get the rd_key for all items in the mailing-list.
    couch.db("raindrop").view("raindrop!content!all/_view/megaview", {
      key: ["rd/msg/email/mailing-list", "id", id],
      reduce: false,
      success: function(json) {
        //Get message keys
        var keys = [];
        for (var i = 0, row; row = json.rows[i]; i++) {
          keys.push(['rd/core/content', 'key-schema_id',
                     [row.value.rd_key, "rd/msg/conversation"]]);
        }
        // and yet another view to fetch the convo IDs for these messages.
        couch.db("raindrop").view("raindrop!content!all/_view/megaview", {
          keys: keys,
          reduce: false,
          include_docs: true,
          success: function(json) {
            //Get conversation IDs.
            // XXX - this isn't working yet :(
            var convIds = [];
            for (var i = 0, row; row = json.rows[i]; i++) {
              convIds.push(row.doc.conversation_id);
            }
            //Load up conversations and ask for them to be displayed.
            rd.conversation(convIds, function(conversations) {
              rd.pub("rd-display-conversations", conversations);
            });
          }
        });
      }
    });
  }
});
