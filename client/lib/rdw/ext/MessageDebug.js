dojo.provide("rdw.ext.MessageDebug");

dojo.require("rdw.Message");

rd.applyExtension("rdw.ext.MessageDebug", "rdw.Message", {
  after: {
    postCreate: function() {
      //summary: adds debug links to show documents associated with message
      //NOTE: the "this" in this function is the instance of rdw.Message.

      //Create a node to hold the debug links
      var debugNode = dojo.create("div", {
        "class": "debug"
      });

      //Loop over the sources and add links for each kind.
      for(var prop in this.messageBag) {
        var schema = this.messageBag[prop];
        var sch_id = schema.rd_schema_id; // XXX - include schema in the link?
        id = schema._id;
        dojo.create("a", {
          "class": "tag",
          target: "_blank",
          title: schema.rd_ext_id,
          href: "/_utils/document.html?raindrop/" + encodeURIComponent(id),
          innerHTML: sch_id.replace(/rd\.msg\./,'')
        }, debugNode);
      }

      //Attach the debug div to the Messsage.
      dojo.query(".message", this.domNode).addContent(debugNode);
    }
  }
});

rd.addStyle("rdw.ext.css.MessageDebug");
