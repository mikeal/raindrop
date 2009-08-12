dojo.provide("rdw._Base");

dojo.require("dojo.cache");
dojo.require("dojo.string");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.require("rd");

//TODO: remove the ROOT call to allow dynamic locale determination
dojo.requireLocalization("rdw", "i18n", "ROOT");

//Base "class" for all rdw widgets.
dojo.declare("rdw._Base", [dijit._Widget, dijit._Templated], {
  postMixInProperties: function() {
    //summary: dijit lifecycle method
    this.inherited("postMixInProperties", arguments);

    //Set default i18n bundle
    //TODO: remove the ROOT call to allow dynamic locale determination
    this.i18n = dojo.i18n.getLocalization("rdw", "i18n");
  },

  getFragmentId: function(/*Event*/evt) {
    //summary: pulls off the fragment ID of a link on the target element,
    //if there is one.
    var frag = evt.target.href;
    if (frag) {
      frag = frag.split("#")[1];
    }
    return frag;
  },

  addSupporting: function(/*Object*/widget) {
    //summary: adds a supporting widget to the supportingWidgets array,
    //to assist with proper widget cleanup.
    if (!this._supportingWidgets) {
      this._supportingWidgets = []
    }

    this._supportingWidgets.push(widget);
  },

  removeSupporting: function(/*Object*/widget) {
    //summary: removes a supporting widget from the supporting widgets
    //array. Useful if the supporting widget is destroyed before this
    //widget is destroyed.
    if (!this._supportingWidgets) {
      var index = dojo.indexOf(this._supportingWidgets, widget);
      if (index > -1) {
        this._supportingWidgets.splice(index, 1);
      }
    }
  },

  destroyAllSupporting: function() {
    //summary: destroys all supporting widgets, and removes them
    //from the _supportingWidgets array.
    if (this._supportingWidgets && this._supportingWidgets.length) {
      var widget;
      while((widget = this._supportingWidgets.shift())) {
        widget.destroy();
      }
    }
  }
});
