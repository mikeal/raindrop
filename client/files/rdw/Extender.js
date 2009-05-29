dojo.provide("rdw.Extender");

dojo.require("dojox.fx.scroll");

dojo.require("rdw._Base");

rd.addStyle("rdw.css.Extender");

dojo.declare("rdw.Extender", [rdw._Base], {

  //Holds index into the history for extener panels.
  historyIndex: 0,

  templatePath: dojo.moduleUrl("rdw.templates", "Extender.html"),

  postCreate: function() {
    //summary: dijit lifecycle method.
    this.history = [this];
    
    this.backNode.style.visibility = "hidden";
    this.forwardNode.style.visibility = "hidden";
  },

  destroy: function() {
    //Remove this widget.
    this.history.splice(0, 1);

    //Destroy the rest of the widgets.
    dojo.forEach(this.history, function(widget) {
      widget.destroy.apply(widget, arguments);
    });
    this.inherited("destroy", arguments);
  },

  add: function(/*Object*/widget) {
    //summary: adds a widget to the history and trims any forward history.
    this.history[this.historyIndex + 1] = widget;

    //Trim forward history.
    if (this.history.length > this.historyIndex + 2) {
      var removed = this.history.splice(this.historyIndex + 2, (this.history.length - this.historyIndex + 2));
      dojo.forEach(removed, function(widget) {
        widget.destroy();
      });
    }
    this.forward();
  },

  forward: function() {
    //summary: goes forward one step in the history.
    this.historyIndex += 1;
    var scrollAmount = dojo.marginBox(this.panelNode).w;

    dojox.fx.smoothScroll({
      win: this.panelContainerNode,
      target: { x: this.panelContainerNode.scrollLeft + scrollAmount, y: 0},
      duration: 300,
      onEnd: dojo.hitch(this, function() {
        //Adjust the nav links.
        if (this.historyIndex == this.history.length - 1) {
          this.forwardNode.style.visibility = "hidden";
        }
        this.backNode.style.visibility = "visible";
      })
    }).play();
  },

  back: function() {
    //summary: goes back one step in the history.
    this.historyIndex -= 1;
    var scrollAmount = dojo.marginBox(this.panelNode).w;

    dojox.fx.smoothScroll({
      win: this.panelContainerNode,
      target: { x: this.panelContainerNode.scrollLeft - scrollAmount, y: 0},
      duration: 300,
      onEnd: dojo.hitch(this, function() {
        //Adjust the nav links.
        if (this.historyIndex == 0) {
          this.backNode.style.visibility = "hidden";
        }
        this.forwardNode.style.visibility = "visible";
      })
    }).play();
  },

  onClick: function(evt) {
    //summary: handles clicks that might route to an extender action.
    var linkId = this.getFragmentId(evt);
    if (linkId && linkId.indexOf("extender-") == 0) {
      var action = linkId.split("-")[1];
      if (this[action]) {
        this[action]();
      } else if (linkId == "extender-close") {
        rd.hideExtender();
      } else if (linkId == "extender-ui-viewAll") {
        //Show all UI extensions
        dojo["require"]("rdw.extender.UiManager");
        dojo.addOnLoad(dojo.hitch(this, function(){
          var panel = dojo.create("div", {
            "class": "panel",
            innerHTML: '<div></div>'
          }, this.panelsNode);
          this.add(new rdw.extender.UiManager({}, panel.firstChild));
        }));
      }
      dojo.stopEvent(evt);
    }
  }
});
