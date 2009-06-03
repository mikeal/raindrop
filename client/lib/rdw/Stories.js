dojo.provide("rdw.Stories");

dojo.require("rdw._Base");
dojo.require("rdw.Story");

dojo.declare("rdw.Stories", [rdw._Base], {
  //Array of conversations to show.
  //Warning: this is a prototype property,
  //be sure to always set it on the instance.
  conversations: [],

  templateString: '<ol class="Stories"></ol>',

  postCreate: function() {
    //summary: dijit lifecycle method.

    //Use _supportingWidgets to track child widgets
    //so that they get cleaned up automatically by dijit destroy.
    this._supportingWidgets = [];

    //Use a document fragment for best performance
    //and load up each story widget in there.
    var frag = dojo.doc.createDocumentFragment();
    for (var i = 0, conv; conv = this.conversations[i]; i++) {
      this._supportingWidgets.push(new rdw.Story({
         msgs: conv
       }, dojo.create("div", null, frag)));        
    }

    //Inject nodes all at once for best performance.
    this.domNode.appendChild(frag);
  }
});
