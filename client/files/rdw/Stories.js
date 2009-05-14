dojo.provide("rdw.Stories");

dojo.require("rdw._Base");
dojo.require("rdw.Story");

dojo.declare("rdw.Stories", [rdw._Base], {
  templateString: '<ol id="Stories"></ol>',

  // docs is called w/ a set of document IDs which correspond to
  // the messages that we want to display.  But we want to display
  // them in context, so we need to find the set of related
  // mesages which provide the 'story'.
  conversations: function(conversations) {
    // Remove existing message widgets from the presentation.
    rd.query(".Message", this.domNode).forEach(function(message) {
      rd.destroy(message);
    });

    //Use a document fragment for best performance
    //and load up each story widget in there.
    var frag = dojo.doc.createDocumentFragment();
    for (var i = 0, conv; conv = conversations[i]; i++) {
      new rdw.Story({
         msgs: conv
       }, dojo.create("div", null, frag));        
    }

    //Inject nodes all at once for best performance.
    this.domNode.appendChild(frag);
  }
});
