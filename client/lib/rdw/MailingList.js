dojo.provide("rdw.MailingList");

dojo.require("rd.conversation");

dojo.require("rdw._Base");

dojo.declare("rdw.MailingList", [rdw._Base], {
  id: "",
  name: "",
  
  //The limit of mailing list items to retrieve.
  limit: 30,

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
    // Get the rd_key for all items in the mailing-list.
    couch.db("raindrop").view("raindrop!content!all/_view/megaview", {
      key: ["rd.msg.email.mailing-list", "id", id],
      reduce: false,
      limit: this.limit,
      success: function(json) {
        //Get message keys
        var keys = [];
        for (var i = 0, row; row = json.rows[i]; i++) {
          keys.push(['rd.core.content', 'key-schema_id',
                     [row.value.rd_key, "rd.msg.conversation"]]);
        }
        // and yet another view to fetch the convo IDs for these messages.
        couch.db("raindrop").view("raindrop!content!all/_view/megaview", {
          keys: keys,
          reduce: false,
          include_docs: true,
          success: function(json) {
            //Get conversation IDs.
            var convIds = [];
            var seen = {}
            for (var i = 0, row; row = json.rows[i]; i++) {
              var cId = row.doc.conversation_id;
              if (!seen[cId]) {
                convIds.push(row.doc.conversation_id);
                seen[cId] = true;
              }
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
