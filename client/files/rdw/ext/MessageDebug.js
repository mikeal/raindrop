dojo.provide("rdw.ext.MessageDebug");

dojo.require("rdw.Message");

rd.applyExtension("rdw.Message", {
  after: {
    postCreate: function() {
      //summary: adds debug links to show documents associated with message
      //NOTE: the "this" in this function is the instance of rdw.Message.

      var msgBag = this.messageBag;
      var id = msgBag['rd.msg.body'].rd_key;
      var idName = id;

      //Create a node to hold the debug links
      var debugNode = dojo.create("div", {
        "class": "debug",
        innerHTML: '<a target="_blank" href="/_utils/document.html?raindrop/'
                   + encodeURIComponent(id) + '">' + idName + '</a>'
      });

      //Loop over the sources and add links for each kind.
      for each (var sch in msgBag) {
        var sch_id = sch.rd_schema_id; // XXX - include schema in the link?
        id = sch._id;
        dojo.create("a", {
          "class": "tag",
          target: "_blank",
          href: "/_utils/document.html?raindrop/" + encodeURIComponent(id),
          innerHTML: sch_id,
        }, debugNode);
      }

      //Attach the debug div to the Messsage.
      dojo.query(".message", this.domNode).addContent(debugNode);
    }
  }
});

rd.addStyle("rdw.ext.css.MessageDebug");
