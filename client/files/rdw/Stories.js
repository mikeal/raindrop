dojo.provide("rdw.Stories");
dojo.require("rdw._Base");
dojo.require("rdw.Story");

dojo.declare("rdw.Stories", [rdw._Base], {
  //Warning: this is a prototype property: be sure to
  //set it per instance.
  docs: [],

  templateString: '<ol class="Stories"></ol>',

  postCreate: function() {
    //summary: dijit lifecycle method
    this.inherited("postCreate", arguments);
    
    //Use a document fragment for best performance
    //and load up each story widget in there.
    var frag = dojo.doc.createDocumentFragment();
    dojo.forEach(this.docs, function(doc){
      new rdw.Story({
        doc: doc
      }, dojo.create("div", null, frag));
    });

    //Inject nodes all at once for best performance.
    this.domNode.appendChild(frag);    
  }
});
