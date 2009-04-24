dojo.provide("rdw.Stories");
dojo.require("rdw._Base");
dojo.require("rdw.Story");

dojo.declare("rdw.Stories", [rdw._Base], {
  // The documents to display in the stories widget.
  _docs: null,
  docs: function(newVal) {
    if (!newVal)
      return this._docs;

    this._docs = newVal;

    // Remove existing message widgets from the presentation.
    rd.query(".Message", this.domNode).forEach(function(message) {
      rd.destroy(message);
    });

    //Use a document fragment for best performance
    //and load up each story widget in there.
    var frag = dojo.doc.createDocumentFragment();
    dojo.forEach(this._docs, function(doc) {
      new rdw.Story({
        doc: doc
      }, dojo.create("div", null, frag));
    });

    //Inject nodes all at once for best performance.
    this.domNode.appendChild(frag);    

    // Return anything to suppress JavaScript strict warnings about the function
    // not always returning a value.
    return true;
  },

  templateString: '<ol id="Stories"></ol>'
});
