dojo.provide("extender.SchemaExplorer");

dojo.require("rdw._Base");
dojo.require("rd.store");

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

  //Flag on whether to show private fields.
  showPrivate: false,

  postCreate: function() {
    //summary: dijit lifecycle method, after template is in the DOM.
  },

  activate: function() {
    //Callback from expander when this widget is being shown.
    //Also used just to refresh the data displayed.

    //Get some sample documents for this schema.
    rd.store.megaview({
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
  
          //Strip off private props if necessary.
          doc = this.showPrivate ? doc : this._stripPrivate(doc);

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
  },

  onShowPrivateClick: function(/*Event*/evt) {
    //summary: handles clicks to checkbox to toggle showing private fields.
    this.showPrivate = !!this.showPrivateNode.checked;
    this.activate();
  },
 
  _stripPrivate: function(/*Object*/doc) {
    //summary: strips off the private fields from the doc, this includes
    //couch-private and raindrop-private fields.
    var newDoc = {};
    var empty = {};
    for (var prop in doc) {
      if (!(prop in empty) && prop.charAt(0) != "_" && prop.indexOf("rd_") != 0) {
        newDoc[prop] = doc[prop];
      }
    }
    return newDoc;
  }
});

