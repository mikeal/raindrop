dojo.provide("rdw.extender.UiManager");

dojo.require("rdw._Base");
dojo.require("rdw.extender.Editor");

rd.addStyle("rdw.extender.css.UiManager");

dojo.declare("rdw.extender.UiManager", [rdw._Base], {
  templatePath: dojo.moduleUrl("rdw.extender.templates", "UiManager.html"),

  extTemplate: '<li><a href="#uimanager-ext-${source}">${source}</a> extends: ${targets}</li>',

  postCreate: function() {
    //summary: dijit lifecycle method, after template is in the DOM.

    //List all the known extensions.
    var exts = dojo.config.rd.exts;
    var subs = dojo.config.rd.subs;

    //Get the object extensions
    var keys = []; //The unique ext names, used for sorting.
    var extNames = {}; //The map of ext module name to target modules.
    var empty = {}; //Used to weed out people messing with Object.prototype.
    for (var prop in exts) {
      if (!(prop in empty)) {
        var target = prop;
        dojo.forEach(exts[prop], function(source) {
          var sourceList = extNames[source];
          if(!sourceList) {
            sourceList = extNames[source] = [];
            keys.push(source);
          }
          sourceList.push(target);
        })
      }
    }

    //Dump the object extension names.
    if (keys.length) {
      keys.sort();
      var html = "";
      for (var i = 0, key; key = keys[i]; i++) {
        var targets = extNames[key];
        targets.sort();
        html += dojo.string.substitute(this.extTemplate, {
          source: key,
          targets: targets.join(",")
        })
      }
      dojo.place(html, this.extNode);
    }
  },

  onExtClick: function(evt) {
    //summary: Captures extension clicks to load them for viewing.
    var linkId = this.getFragmentId(evt);
    if (linkId && linkId.indexOf("uimanager-") == 0) {
      if (linkId.indexOf("uimanager-ext-") == 0) {
        //Get the module name and get the text for the module.
        var moduleName = linkId.split("-")[2];
        
        this.extender.add(new rdw.extender.Editor({
          moduleName: moduleName
        }));
      }
      dojo.stopEvent(evt);
    }
  }
});
