dojo.provide("rdw.Search");
dojo.require("rdw._Base");

dojo.declare("rdw.Search", [rdw._Base], {
  templatePath: dojo.moduleUrl("rdw.templates", "Search.html"),
  
  postMixInProperties: function() {
    //summary: dijit lifecycle method
    this.inherited("postMixInProperties", arguments);
  },

  postCreate: function() {
    //summary: dijit lifecycle method
    this.inherited("postCreate", arguments);
  },
  focusSearchInput: function(evt) {
    //summary: keep the search area alive when focused but the mouse left
    dojo.addClass(this.search, 'searchInputFocused');
  },
  blurSearchInput: function(evt) {
    //summary: reset the search area opacity when focus leaves
    dojo.removeClass(this.search, 'searchInputFocused');
  },
  onClick: function(evt) {
    //summary: handles click delegation for list of recent search links
    var target = evt.target;
    if (target.href) {
      target = target.href.split("#")[1];
      if (target) {
        dojo.publish("rd-protocol-" + target);
        dojo.stopEvent(evt);
      }
    }
  }
});
