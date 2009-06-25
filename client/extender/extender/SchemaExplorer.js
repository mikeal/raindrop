dojo.provide("extender.SchemaExplorer");

dojo.require("rdw._Base");
dojo.require("couch");

//Uses script-added styles to allow loading on demand at the cost of a
//custom build that would load all styles at the beginning.
rd.addStyle("extender.css.SchemaExplorer");

dojo.declare("extender.SchemaExplorer", [rdw._Base], {
  templateString: dojo.cache("extender.templates", "SchemaExplorer.html"),

  propTemplate: '<tr><td class="prop">${name}</th><td class="value">${value}</th></tr>',

  //The name of the schema ID
  schemaId: "",

  //The number of sample documents to use.
  limit: 10,

  postCreate: function() {
    //summary: dijit lifecycle method, after template is in the DOM.

    //Get some sample documents for this schema.
    couch.db("raindrop").view("raindrop!content!all/_view/megaview", {
      key: ["rd.core.content", "schema_id", this.schemaId],
      include_docs: true,
      reduce: false,
      limit: this.limit,
      success: dojo.hitch(this, function(json) {
        this.docs = [];
        this.example = {};
        this.props = [];
        for (var i = 0, row, doc; (row = json.rows[i]) && (doc = row.doc); i++) {
          //Save the document, then collect properties that can exist
          //on this type of document. Collect the properties as an array
          //so we can sort and display easier.
          this.docs.push(doc);
          var empty = {};
          for (var prop in doc) {
            if (!(prop in empty) && !(prop in this.example)) {
              this.example[prop] = doc[prop];
              this.props.push(prop);
            }
          }
        }

        this.props.sort();

        //Show the example properties
        var html = '';
        for (var i = 0, prop; prop = this.props[i]; i++) {
          var value = this.example[prop] === null ? "" : this.example[prop];
          if (dojo.isObject(value)) {
            value = dojo.toJson(value);
          }
          html += dojo.string.substitute(this.propTemplate, {
            name: prop,
            value: value
          });
        }
        if (html) {
          dojo.place(html, this.tbodyNode, "only");
        }
        
        //Show the complete exampe documents.
        this.exampleNode.innerHTML = dojo.toJson(this.docs, true);
      })
    });
  }
});

