dojo.provide("inflowgrid.QuickCompose");

dojo.require("rdw.QuickCompose");

dojo.declare("inflowgrid.QuickCompose", [rdw.QuickCompose], {
  onCloseClick: function(evt) {
    inflowgrid.hideQuickCompose();
    dojo.stopEvent(evt);
  }
});
