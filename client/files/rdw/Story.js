dojo.provide("rdw.Story");
dojo.require("rdw._Base");
dojo.require("rdw.Message");

dojo.declare("rdw.Story", [rdw._Base], {
  //Holds the couch document for this story.
  //Warning: this is a prototype property: be sure to
  //set it per instance.
  msgs: {},

  templateString: '<li class="Story"></li>',

  postCreate: function() {
    //summary: dijit lifecycle method
    this.inherited("postCreate", arguments);
    var first = true;

    // Sort by date
    this.msgs.sort(function (a,b) {return a.timestamp > b.timestamp });

    //Use _supportingWidgets to track child widgets
    //so that they get cleaned up automatically by dijit destroy.
    this._supportingWidgets = [];

    for (var i = 0, msg; msg = this.msgs[i]; i++) {
      this._supportingWidgets.push(new rdw.Message({
        messageBag: msg,
        type: first ? "" : "reply"
      }, dojo.create("div", null, this.domNode)));
      first = false;
    };
  }
});
