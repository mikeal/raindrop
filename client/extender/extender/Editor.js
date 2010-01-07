/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Raindrop.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Messaging, Inc..
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * */

dojo.provide("extender.Editor");

dojo.require("rdw._Base");
dojo.require("rd.api");
dojo.require("extender.util");

//Uses script-added styles to allow loading on demand at the cost of a
//custom build that would load all styles at the beginning.
rd.addStyle("extender/css/Editor");

dojo.declare("extender.Editor", [rdw._Base], {
  //The type of extension: possible values are "ext" or "sub"
  extType: "ext",

  //Holds the module name that is being edited.
  moduleName: "",

  //The modules targeted by this extension.
  targetNames: [],

  //The couchdb document for the extension's json manifest.
  moduleManifest: null,

  //The initial content to use for the editor
  //If none is provided, the module will be fetched
  //from its moduleName.
  content: "",

  //Show the UI in the "try it" mode.
  useTryMode: false,

  //Indicates if the editor should listen to resize to make the content as big
  //as possible as compared to the viewport -- only account for space above the
  //editor iframe. If false, then it just makes sure to fit its parent container,
  //which should be a fixed size.
  useViewportResize: true,

  //A callback that can be issued once the editor completely loads.
  onEditorLoad: null,

  //Bespin url for the iframe.
  iframeUrl: dojo.moduleUrl("extender", "../bespin.html"),

  templatePath: dojo.moduleUrl("extender.templates", "Editor.html"),

  widgetsInTemplate: true,

  onTryClick: function(/*Event*/evt) {
    //summary: handles clicks to try it button, instantly saves the extension,
    //and show other action buttons.

    //Switch the buttons out
    //Set button state.
    dojo.forEach([this.cloneNode, this.saveNode, this.enabledSectionNode, this.deleteNode], function(node) {
      dojo.style(node, {
        display: ""
      });
    });
    dojo.style(this.tryNode, {
      display: "none"
    });
    
    this.onSave(null, dojo.hitch(this, function() {
      this.enableExtension(true);
    }));
  },

  postCreate: function() {
    //summary: dijit lifecycle method, after template is in the DOM.

    //Set button state.
    if (this.useTryMode) {
      dojo.forEach([this.cloneNode, this.saveNode, this.enabledSectionNode, this.deleteNode], function(node) {
        dojo.style(node, {
          display: "none"
        });
      });
    } else {
      dojo.style(this.tryNode, {
        display: "none"
      });
    }

    //Some hackery to get .js path from Dojo code.
    var parts = this.moduleName.split(".");
    this.path = dojo.moduleUrl(parts.slice(0, -1).join("."), parts[parts.length - 1] + ".js").toString();

    var text = this.content;
    if(!text) {
      //TODO: does not work with xdomain loaded modules.
      var text = dojo._getText(this.path + "?nocache=" + ((new Date()).getTime()));
    }

    //Fetch the manifest file for this document.
    this.fetchManifest();

    //Set the text for the editor.
    this.editorContent(text);

    //Set the enabled state
    //Only check for the first target. Only allowing a global
    //disable for all moduleName+targetName combinations.
    //This is just an initial guess based on the loaded app.
    //The definitive answer comes when the manifest is loaded via fetchManifest.
    this.enabledNode.checked = extender.util.opener().rd.extensionEnabled(this.moduleName, this.targetNames[0]);

    //Bind to resize and make sure size is initially correct.
    if (this.useViewportResize) {
      this.connect(window, "onresize", "onResize");
    }
    setTimeout(dojo.hitch(this, "onResize"), 100);
  },

  editorContent: function(/*String?*/text) {
    //summary: gets/sets the editor content in bespin.
    if (arguments.length) {
      this.editorText = text;
      if (this._iframeLoaded) {
        this.iframeNode.contentWindow._editorComponent.setContent(text);
      }
      return this.editorText;
    } else {
      return this.iframeNode.contentWindow._editorComponent.getContent();
    }
  },

  onIframeLoad: function() {
    //summary: once bespin loads, set the content.
    this._iframeLoaded = true;
    this.editorContent(this.editorText);
    setTimeout(dojo.hitch(this, function() {
      this.onResize();
      if (this.onEditorLoad) {
        this.onEditorLoad();
      }
    }), 1000);
    if (this._saveOnLoad) {
      this.onSave();
    }
  },

  couchDocPath: function() {
    //summary: the path to the couchdb document that has this extension as
    //an attachment.
    var modulePath = this.moduleName.replace(/\./g, "/");
    var index = this.path.indexOf(modulePath);
    return this.path.substring(0, index - 1);
  },

  moduleDocPath: function() {
    //summary: gets the module's couchdb path from its module name.
    //It is really an attachment on a couchdb document.
    var modulePath = this.moduleName.replace(/\./g, "/");
    return this.couchDocPath() + "/" + modulePath + ".js";
  },

  onClone: function(evt) {
    //summary: handles clicks to clone button.
    var moduleName = prompt("Choose a name for the cloned extension:");
    moduleName = moduleName && dojo.trim(moduleName);
    if (moduleName) {
        //Make sure extName is valid.
        moduleName = moduleName.replace(/[^\w_]/g, "");
        window.location = "frontExtension.html?r=" + (new Date()).getTime() + "#" + moduleName + ":" + this.targetNames.join(",") + ":clone:" + this.moduleName;
    }
  },

  onSave: function(evt, callback) {
    //summary: handles click events to save button.

    if (!this._iframeLoaded) {
      this._saveOnLoad = true;
      return;
    }

    //Load the couch doc so we can get the _rev field.
    dojo.xhrGet({
      url: this.couchDocPath(),
      handleAs: "json",
      handle: dojo.hitch(this, function(response, ioArgs) {
        if (response instanceof Error) {
          this.updateStatus("Error: " + response);
          return;
        }

        var _rev = response._rev;
        dojo.xhrPut({
          url: this.moduleDocPath() + "?rev=" + _rev,
          headers: {
            "Content-Type": "application/javascript"
          },
          putData: this.iframeNode.contentWindow._editorComponent.getContent(),
          handle: dojo.hitch(this, function(response, ioArgs) {
            if (response instanceof Error) {
              this.updateStatus("Error: " + response);
              return;
            }

            //Extension file updated, now update the manifest
            var manifestUrl = rd.dbPath + this.moduleManifest._id;
            if (this.moduleManifest._rev) {
              manifestUrl += "?rev=" + this.moduleManifest._rev;
            }

            dojo.xhrPut({
              url: manifestUrl,
              putData: dojo.toJson(this.moduleManifest),
              handle: dojo.hitch(this, function(response, ioArgs) {
                if (response instanceof Error) {
                  this.updateStatus("Error: " + response);
                } else {
                  //Trigger update in opener.
                  extender.util.opener().rd._updateExtModule(this.moduleName, dojo.toJson(this.targetNames));

                  //Make sure to get latest manifest, since _rev can change.
                  this.fetchManifest();

                  this.updateConfigJs("save");

                  this.updateStatus("File Saved");
                  if (callback) {
                    callback();
                  }
                }
              })
            });
          })            
        });
      })
    })
  },

  onDelete: function(/*Event*/evt) {
    //summary: handles action to delete an extension.
    if (confirm("Delete this extension: " + this.moduleName + "?")) {
      //Delete the manifest document.
      var manifestUrl = rd.dbPath + this.moduleManifest._id;
      dojo.xhrGet({
        url: manifestUrl,
        handleAs: "json",
        load: dojo.hitch(this, function(doc, ioArgs) {
          dojo.xhrDelete({
            url: manifestUrl + "?rev=" + doc._rev,
            load: dojo.hitch(this, function() {
              //Now get rid of the extension JS.
              //TODO: delete any CSS/HTML associated with the deleted files?
              dojo.xhrGet({
                url: this.couchDocPath(),
                handleAs: "json",
                load: dojo.hitch(this, function(response, ioArgs) {
                  var _rev = response._rev;
                  dojo.xhrDelete({
                    url: this.moduleDocPath() + "?rev=" + _rev,
                    load: dojo.hitch(this, function() {
                      this.updateConfigJs("delete");

                      //Disable the extension in the live page.
                      this.enableExtension(false);
                      
                      //Paranoid, give a bit of time for parent frame operations
                      //to complete.
                      setTimeout(function() {
                        location = "extensions.html";
                      }, 200);
                    })
                  });
                })
              });
            })
          });
        })
      });
    }
  },

  onEnableClick: function(/*Event*/evt) {
    //summary: handles clicks to enable/disable an extension.
    this.enableExtension(this.enabledNode.checked);
  },

  enableExtension: function(/*Boolean*/enabled) {
    //Update the manifest.
    if (enabled) {
      delete this.moduleManifest.disabled;
    } else {
      this.moduleManifest.disabled = true;
    }
    //Update the runtime display
    for(var i = 0, target; target = this.targetNames[i]; i++) {
      extender.util.opener().rd.extensionEnabled(this.moduleName, target, enabled);
    }
  },

  updateStatus: function(message) {
    //summary: updates the status node with a message using an
    //animation.
    dojo.style(this.statusNode, "opacity", 0);
    this.statusNode.innerHTML = rd.escapeHtml(message);
    dojo.anim(
      this.statusNode, {
        opacity: 1
      },
      500,
      null,
      dojo.hitch(this, function() {
        setTimeout(dojo.hitch(this, function() {
          dojo.style(this.statusNode, "opacity", 0);
        }), 5000);
      })
    );
  },

  onResize: function() {
    //summary: handles window resize actions to best show the editable content.
    if (this.useViewportResize) {
      var editorHeight = (dijit.getViewport().h - dojo.coords(this.iframeNode).y - 5) + "px";
    } else {
      //Add up sibling element heights, then use the remainder (as compared to parent
      //height) as the height for this
      var sibHeight = 0;
      dojo.query(this.iframeNode).siblings().forEach(function(node) {
        sibHeight += dojo.marginBox(node).h;
      });
      editorHeight = (dojo.contentBox(this.iframeNode.parentNode).h - sibHeight) + "px";
    }
    this.iframeNode.style.height = editorHeight;
  },

  fetchManifest: function() {
    //summary: fetches the manifest for this extension. If no manifest exists,
    //create one for it.
    rd.api().megaview({
      key: ["rd.core.content", "key", ["ext", this.moduleName]],
      include_docs: true,
      reduce: false
    })
    .ok(this, function(json) {
      var rows = json.rows;
      if (rows.length) {
        this.moduleManifest = rows[0].doc;
      } else {
        this.generateManifest();
      }
      this.enabledNode.checked = !this.moduleManifest.disabled;
    })
    .error(this, function(json) {
      this.generateManifest();
      this.enabledNode.checked = !this.moduleManifest.disabled;
    });
  },

  generateManifest: function() {
    //summary: makes up a manifest json for this extension.
    var rdKey = ["ext", this.moduleName];

    this.moduleManifest = {
      "_id": "rc!" + rdKey[0] + "." + rd.toBase64(rdKey[1]) + "!rd.core!rd.ext.uiext",
      "rd_key": rdKey,
      "rd_source": null,
      "rd_schema_id": "rd.ext.uiext",
      "rd_ext_id": "rd.core"
    };

    //Set the disabled state
    if (!this.enabledNode.checked) {
      this.moduleManifest.disabled = true;
    }

    //Set the module mapping.
    var mapping = {};
    for (var i = 0, targetName; targetName = this.targetNames[i]; i++) {
      mapping[targetName] = this.moduleName;
    }
    this.moduleManifest[(this.extType == "ext" ? "exts" : "subscriptions")] = mapping;
  },
  
  updateConfigJs: function(/*String*/command) {
    //summary: updates the rdconfig.js file with a change to the extension data.
    //command can be "delete" or "save".

    //Get the rdconfig.js text.
    dojo.xhrGet({
      url: rd.dbPath + "lib/rdconfig.js",
      load: dojo.hitch(this, function(configText, ioArgs) {
        //Do the rdconfig.js mangling.
        var empty = {};
        for (var i = 0, targetName; targetName = this.targetNames[i]; i++) {
          var regExp = new RegExp('(,)?\\s*{\\s*["\']' + targetName + '["\']\\s*:\\s*["\']' + this.moduleName + '["\']\\s*}');
          if (command == "delete" || !this.enabledNode.checked) {
            configText = configText.replace(regExp, "");
          } else if (command == "save" && !regExp.test(configText)) {
            //Save a new entry, it is not an existing entry.
            var propName = (this.extType == "ext" ? "exts" : "subs");
            var hasObject = (new RegExp(propName + '\\s*:\\s*\\[\\s*{')).test(configText);
            var insertRegExp = new RegExp(propName + '\\s*:\\s*\\[\\s*');
            var text = propName + ": [{'" + targetName + "': '" + this.moduleName + "'}";
            if (hasObject) {
              text += ",";
            }
            configText = configText.replace(insertRegExp, text);
          }

          //Make sure to clean up any starting commas.
          configText = configText
                        .replace(/subs\s*:\s*\[\s*,/, "subs: [")
                        .replace(/exts\s*:\s*\[\s*,/, "exts: [");
        }

        //Get the couch doc holding the rdconfig.js attachment, to get its version number.
        dojo.xhrGet({
          url: rd.dbPath + "lib",
          handleAs: "json",
          load: dojo.hitch(this, function(response, ioArgs) {
            var _rev = response._rev;
            dojo.xhrPut({
              url: rd.dbPath + "lib/rdconfig.js?rev=" + _rev,
              headers: {
                "Content-Type": "application/javascript"
              },
              putData: configText
            });
          })
        });
      })
    });
  }
});
