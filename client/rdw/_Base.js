dojo.provide("rdw._Base");
dojo.require("dijit.dijit");

dojo.requireLocalization("rdw", "i18n");

//Base "class" for all rdw widgets.
dojo.declare("rdw._Base", [dijit._Widget, dijit._Templated], {
  postMixInProperties: function() {
    //summary: dijit lifecycle method
    this.inherited("postMixInProperties", arguments);

    //Set default i18n bundle
    this.i18n = dojo.i18n.getLocalization("rdw", "i18n");
  }
});
