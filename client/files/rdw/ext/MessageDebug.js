dojo.provide("rdw.ext.MessageDebug");

dojo.require("rdw.Message");

rd.applyExtension("rdw.Message", {
  after: {
    postCreate: function() {
      //summary: adds debug links to show documents associated with message
      //NOTE: the "this" in this function is the instance of rdw.Message.

      var msgDoc = this.messageBag.message;
      var id = msgDoc._id;
      var idName = msgDoc._id.substring(msgDoc._id.lastIndexOf("!") + 1, msgDoc._id.length);

      //Create a node to hold the debug links
      var debugNode = dojo.create("div", {
        "class": "debug",
        innerHTML: '<a target="_blank" href="/_utils/document.html?raindrop/'
                   + encodeURIComponent(id) + '">' + idName + '</a>'
      });

      //Loop over the sources and add links for each kind.
      for (var src in msgDoc.raindrop_sources) {
        id = msgDoc.raindrop_sources[src][0];

        dojo.create("a", {
          "class": "tag",
          target: "_blank",
          href: "/_utils/document.html?raindrop/" + encodeURIComponent(id),
          innerHTML: id.substring(id.lastIndexOf("/") + 1, id.length)
        }, debugNode);
      }

      //Attach the debug div to the Messsage.
      dojo.query(".message", this.domNode).addContent(debugNode);
    }
  }
});

rd.addStyle("rdw.ext.css.MessageDebug");
