dojo.provide("extender.BackEndEditor");

dojo.require("dojox.encoding.base64");
dojo.require("rdw._Base");
dojo.require("couch");

//Uses script-added styles to allow loading on demand at the cost of a
//custom build that would load all styles at the beginning.
rd.addStyle("extender.css.BackEndEditor");

dojo.declare("extender.BackEndEditor", [rdw._Base], {
  //The couchdb document for the extension.
  doc: null,

  //Bespin url for the iframe.
  iframeUrl: dojo.moduleUrl("extender", "../bespin.html"),

  templatePath: dojo.moduleUrl("extender.templates", "BackEndEditor.html"),

  widgetsInTemplate: true,

  postMixInProperties: function() {
    //summary: dijit lifecycle method, called before template is evaluated.
    this.inherited("postMixInProperties", arguments);
    
    //Pass the language to use for the bespin frame.
    this.iframeUrl += "#python";
  },

  postCreate: function() {
    //summary: dijit lifecycle method, after template is in the DOM.

    //Set the text for the editor.
    this.editorContent(this.doc.code);

    //Set the enabled state
    //Only check for the first target. Only allowing a global
    //disable for all moduleName+targetName combinations.
    this.enabledNode.checked = !this.doc.disabled;

    //Bind to resize and make sure size is initially correct.
    this.connect(window, "onresize", "onResize");
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
    setTimeout(dojo.hitch(this, "onResize"), 1000);
    if (this._saveOnLoad) {
      this.onSave();
    }
  },

  couchDocPath: function() {
    //summary: the path to the couchdb document
    return rd.path + this.doc._id;
  },

  onSave: function(evt) {
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
        
        this.doc = response;
        this.doc.code = this.iframeNode.contentWindow._editorComponent.getContent();
        
        dojo.xhrPut({
          url: this.couchDocPath() + "?rev=" + _rev,
          putData: dojo.toJson(this.doc),
          handle: dojo.hitch(this, function(response, ioArgs) {
            if (response instanceof Error) {
              this.updateStatus("Error: " + response);
              return;
            }

            //TODO: make the extension run, or
            //show what it might generate?

            this.updateStatus("File Saved");
          })            
        });
      })
    })
  },

  onDelete: function(/*Event*/evt) {
    //summary: handles action to delete an extension.
    if (confirm("Delete this extension: " + this.doc.rd_key[1] + "?")) {
      dojo.xhrGet({
        url: this.couchDocPath(),
        handleAs: "json",
        load: dojo.hitch(this, function(response, ioArgs) {
          var _rev = response._rev;
          dojo.xhrDelete({
            url: this.couchDocPath() + "?rev=" + _rev,
            load: dojo.hitch(this, function() {
              location = "extensions.html";
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
    //TODO: allow enable/disable of the extension. 
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
    var editorHeight = (dijit.getViewport().h - dojo.coords(this.iframeNode).y - 5) + "px";
    this.iframeNode.style.height = editorHeight;
  }
});
