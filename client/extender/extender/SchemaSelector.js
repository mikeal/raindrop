dojo.provide("extender.SchemaSelector");

dojo.require("rdw._Base");
dojo.require("rd.store");
dojo.require("extender.SchemaExplorer");

//Uses script-added styles to allow loading on demand at the cost of a
//custom build that would load all styles at the beginning.
rd.addStyle("extender.css.SchemaSelector");

dojo.declare("extender.SchemaSelector", [rdw._Base], {
  templatePath: dojo.moduleUrl("extender.templates", "SchemaSelector.html"),

  schemaTemplate: '<li><a href="#${name}">${name}</a></li>',

  postCreate: function() {
    //summary: dijit lifecycle method, after template is in the DOM.

    //First, get the list of schemas from a view.
    rd.store.megaview({
      startkey: ["rd.core.content", "schema_id"],
      endkey: ["rd.core.content", "schema_id", {}],
      group: true,
      success: dojo.hitch(this, function(json) {
        var html = "";
        for (var i = 0, row; row = json.rows[i]; i++) {
          html += dojo.string.substitute(this.schemaTemplate, {
            name: row.key[2]
          })
        }
        if (html) {
          dojo.place(html, this.listNode, "only");
        }
      })
    });
  },

  onClick: function(/*Event*/evt) {
    //summary: handles onclicks for a schema selection.
    var href = evt.target.href;
    if (href && (href = href.split("#")[1])) {

      //Show the editor widget.
      var explorer = new extender.SchemaExplorer({
        schemaId: href
      });

      this.extender.add(explorer);

      dojo.stopEvent(evt);
    }
  }
});

