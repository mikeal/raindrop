dojo.provide("rdw.ext.MessageDebug");

rd.extendDeclared("rdw.Message", {
  after: {
    postCreate: function() {
      //summary: adds debug links to show documents associated with message
      //NOTE: the "this" in this function is the instance of rdw.Message.

      var id = this.doc._id;
      var idName = this.doc._id.substring(this.doc._id.lastIndexOf("!") + 1, this.doc._id.length);

      //Create a node to hold the debug links
      var debugNode = dojo.create("div", {
        "class": "debug",
        innerHTML: '<a target="_blank" href="/_utils/document.html?raindrop/'
                   + encodeURIComponent(id) + '">' + idName + '</a>'
      });

      //Loop over the sources and add links for each kind.
      for (var src in this.doc.raindrop_sources) {
        id = this.doc.raindrop_sources[src][0];

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
