dojo.provide("extender.WidgetSelector");

dojo.require("rdw._Base");

//Uses script-added styles to allow loading on demand at the cost of a
//custom build that would load all styles at the beginning.
rd.addStyle("extender.css.WidgetSelector");

dojo.declare("extender.WidgetSelector", [rdw._Base], {
  templatePath: dojo.moduleUrl("extender.templates", "WidgetSelector.html"),

  postCreate: function() {
    //summary: dijit lifecycle method, after template is in the DOM.
    
    //Tell parent to load helper selector.
    opener.rd.require("extender.widgetSelectorHelper");
    var _self = this;
    opener.rd.addOnLoad(function() {
      opener.extender.widgetSelectorHelper.start(_self);
    });
  },

  select: function(/*String*/widgetName) {
    //summary: handles selection of widget. Called by widgetSelectorHelper.
    rd.escapeHtml(widgetName, this.widgetNameNode, "only");
  },

  destroy: function() {
    //summary: dijit lifecycle method.
    //Make sure parent window does not hold on to this widget instance.
    opener.extender.widgetSelectorHelper.stop();
    this.inherited("destroy", arguments);
  }
});
