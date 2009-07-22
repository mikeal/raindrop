dojo.provide("extender.UiManager");

dojo.require("rd.store");
dojo.require("rdw._Base");
dojo.require("extender.Editor");
dojo.require("extender.BackEndEditor");

//Uses script-added styles to allow loading on demand at the cost of a
//custom build that would load all styles at the beginning.
rd.addStyle("extender.css.UiManager");

dojo.declare("extender.UiManager", [rdw._Base], {
  templatePath: dojo.moduleUrl("extender.templates", "UiManager.html"),

  //Stores the backend extensions, indexed by their rd_key.
  beExts: null,

  extTemplate: '<li><a href="#uimanager-ext-${extType}-${source}:${targets}">${source}</a> extends: ${targets}</li>',

  beTemplate: '<li><a href="#uimanager-ext-be-${rd_key.1}:${source_schema}">${rd_key.1}</a> runs after: ${source_schema}. ${info}</li>',

  postCreate: function() {
    //summary: dijit lifecycle method, after template is in the DOM.
  },

  activate: function() {
    //summary: called by extender.Wizard when this instance is the current
    //panel activated in the display.

    rd.store.megaview({
      keys: [
        ["rd.core.content", "schema_id", "rd.ext.ui"],
        ["rd.core.content", "schema_id", "rd.ext.uiext"],
        ["rd.core.content", "schema_id", "rd.ext.workqueue"]
      ],
      include_docs: true,
      reduce: false,
      success: dojo.hitch(this, function(json) {
        var extKeys = [], extNames = {};
        var subKeys = [], subNames = {};
        var beKeys = [];
        this.beExts = {};
        var empty = {};
        for (var i= 0, row, doc; (row = json.rows[i]) && (doc = row.doc); i++) {
          //Check for object extensions
          if (!doc.disabled && doc.exts) {
            for (var prop in doc.exts) {
              if (!(prop in empty)) {
                var key = doc.exts[prop];
                var targets = extNames[key];
                if (!targets) {
                  targets = extNames[key] = [];
                  extKeys.push(key);
                }
                targets.push(prop);
              }
            }
          }

          //Check for topic extensions
          if (!doc.disabled && doc.subscriptions) {
            for (var prop in doc.subscriptions) {
              if (!(prop in empty)) {
                var key = doc.subscriptions[prop];
                var targets = subNames[key];
                if (!targets) {
                  targets = subNames[key] = [];
                  subKeys.push(key);
                }
                targets.push(prop);
              }
            }          
          }
          
          //Back end extension.
          if (!doc.disabled && doc.rd_schema_id == "rd.ext.workqueue") {
              var keyName = doc.rd_key.join(",");
              beKeys.push(keyName);
              this.beExts[keyName] = doc;
          }
        }

        //Show the object and subscription extensions in the DOM.
        this.insertExtensionHtml("ext", extKeys, extNames, this.extNode);
        this.insertExtensionHtml("sub", subKeys, subNames, this.subNode);
        
        //Show the back end extensions.
        if (beKeys.length) {
          beKeys.sort();
          var html = "";
          for (var i = 0, key; key = beKeys[i]; i++) {
            html += dojo.string.substitute(this.beTemplate, this.beExts[key]);
          }
          dojo.place(html, this.beNode, "only");
        }
      })
    })
  },

  insertExtensionHtml: function (/*String*/extType, /*Array*/keys, /*Object*/extNames, /*DOMNode*/parentNode) {
    //summary: generates the HTML markup that shows each extension and inserts
    //it into the widget.
    if (keys.length) {
      keys.sort();
      var html = "";
      for (var i = 0, key; key = keys[i]; i++) {
        var targets = extNames[key];
        targets.sort();
        html += dojo.string.substitute(this.extTemplate, {
          extType: extType,
          source: key,
          targets: targets.join(",")
        })
      }
      dojo.place(html, parentNode, "only");
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
        
        //Pull off extension type.
        var dashIndex = parts.indexOf("-");
        var extType = parts.substring(0, dashIndex);
        parts = parts.substring(dashIndex + 1, parts.length);

        var parts = parts.split(":");
        var moduleName = parts[0];
        var targetNames = parts[1].split(",");

        if (extType == "be") {
          //Back end extension
          this.extender.add(new extender.BackEndEditor({
            doc: this.beExts["ext," + moduleName]
          }));
        } else {
          //Front end extension.
          this.extender.add(new extender.Editor({
            moduleName: moduleName,
            targetNames: targetNames,
            extType: extType
          }));
        }
      }
      dojo.stopEvent(evt);
    }
  }
});
