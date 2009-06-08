dojo.provide("extender.UiManager");

dojo.require("rdw._Base");
dojo.require("extender.Editor");

//Uses script-added styles to allow loading on demand at the cost of a
//custom build that would load all styles at the beginning.
rd.addStyle("extender.css.UiManager");

dojo.declare("extender.UiManager", [rdw._Base], {
  templatePath: dojo.moduleUrl("extender.templates", "UiManager.html"),

  extTemplate: '<li><a href="#uimanager-ext-${source}:${targets}">${source}</a> extends: ${targets}</li>',

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

    //Get subscription extensions
    var subKeys = [];
    var subNames = {};
    for (var i = 0, sub; sub = subs[i]; i++) {
      for (prop in sub) {
        if (!(prop in empty)) {
          sourceList = subNames[sub[prop]];
          if(!sourceList) {
            sourceList = subNames[sub[prop]] = [];
            subKeys.push(sub[prop]);
          }
          sourceList.push(prop);
        }
      }
    }

    //Show the object and subscription extensions in the DOM.
    this.insertExtensionHtml(keys, extNames, this.extNode);
    this.insertExtensionHtml(subKeys, subNames, this.subNode);
  },

  insertExtensionHtml: function (/*Array*/keys, /*Object*/extNames, /*DOMNode*/parentNode) {
    //summary: generates the HTML markup that shows each extension and inserts
    //it into the widget.
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
      dojo.place(html, parentNode);
    }
  },

  onExtClick: function(evt) {
    //summary: Captures extension clicks to load them for viewing.
    var linkId = this.getFragmentId(evt);
    var extPrefix = "uimanager-ext-";
    if (linkId && linkId.indexOf("uimanager-") == 0) {
      if (linkId.indexOf(extPrefix) == 0) {
        //Get the module name and get the text for the module.
        var parts = linkId.substring(extPrefix.length, linkId.length);
        var parts = parts.split(":");
        var moduleName = parts[0];
        var targetNames = parts[1].split(",");

        this.extender.add(new extender.Editor({
          moduleName: moduleName,
          targetNames: targetNames
        }));
      }
      dojo.stopEvent(evt);
    }
  }
});
