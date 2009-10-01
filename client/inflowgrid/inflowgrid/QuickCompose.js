dojo.provide("inflowgrid.QuickCompose");

dojo.require("rdw.QuickCompose");

dojo.declare("inflowgrid.QuickCompose", [rdw.QuickCompose], {
  templatePath: dojo.moduleUrl("inflowgrid.templates", "QuickCompose.html"),

  onCloseClick: function(evt) {
    inflowgrid.hideQuickCompose();
    dojo.stopEvent(evt);
  }
});
