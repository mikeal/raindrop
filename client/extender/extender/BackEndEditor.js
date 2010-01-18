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

/*jslint plusplus: false, nomen: false */
/*global run: false, window: false, setTimeout: false, confirm: false,
location: true */
"use strict";

run.def("extender/BackEndEditor",
["run", "rd", "dojo", "dijit", "couch", "rdw/_Base", "dojox/encoding/base64",
  "text!extender/templates/BackEndEditor!html"],
function (run, rd, dojo, dijit, couch, Base, base64, template) {

    //Uses script-added styles to allow loading on demand at the cost of a
    //custom build that would load all styles at the beginning.
    rd.addStyle("extender/css/BackEndEditor");
    
    return dojo.declare("extender.BackEndEditor", [Base], {
        //The couchdb document for the extension.
        doc: null,

        //Bespin url for the iframe.
        iframeUrl: run.nameToUrl("extender/../bespin", ".html"),

        templateString: template,

        widgetsInTemplate: true,

        /** Dijit lifecycle method, called before template is evaluated. */
        postMixInProperties: function () {
            this.inherited("postMixInProperties", arguments);
            
            //Pass the language to use for the bespin frame.
            this.iframeUrl += "#python";
        },

        /** Dijit lifecycle method, after template is in the DOM. */
        postCreate: function () {
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

        /**
         * Gets/sets the editor content in bespin.
         * @param {String} [text]
         */
        editorContent: function (text) {
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

        /** Once bespin loads, set the content. */
        onIframeLoad: function () {
            this._iframeLoaded = true;
            this.editorContent(this.editorText);
            setTimeout(dojo.hitch(this, "onResize"), 1000);
            if (this._saveOnLoad) {
                this.onSave();
            }
        },

        /** The path to the couchdb document */
        couchDocPath: function () {
            return rd.path + this.doc._id;
        },
    
        onClone: function (evt) {
            //TODO
        },

        /** Handles click events to save button. */
        onSave: function (evt) {
            if (!this._iframeLoaded) {
                this._saveOnLoad = true;
                return;
            }
    
            //Load the couch doc so we can get the _rev field.
            dojo.xhrGet({
                url: this.couchDocPath(),
                handleAs: "json",
                handle: dojo.hitch(this, function (response, ioArgs) {
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
                        handle: dojo.hitch(this, function (response, ioArgs) {
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
            });
        },

        /** Handles action to delete an extension. */
        onDelete: function (evt) {
            if (confirm("Delete this extension: " + this.doc.rd_key[1] + "?")) {
                dojo.xhrGet({
                    url: this.couchDocPath(),
                    handleAs: "json",
                    load: dojo.hitch(this, function (response, ioArgs) {
                        var _rev = response._rev;
                        dojo.xhrDelete({
                            url: this.couchDocPath() + "?rev=" + _rev,
                            load: dojo.hitch(this, function () {
                                location = "extensions.html";
                            })
                        });
                    })
                });
            }
        },

        /** Handles clicks to enable/disable an extension. */
        onEnableClick: function (evt) {
            this.enableExtension(this.enabledNode.checked);
        },

        /**
         * Allow enable/disable of the extension.
         * @param {Boolean} enabled
         */
        enableExtension: function (enabled) {
        },

        /** Updates the status node with a message using an animation. */
        updateStatus: function (message) {
            dojo.style(this.statusNode, "opacity", 0);
            this.statusNode.innerHTML = rd.escapeHtml(message);
            dojo.anim(
                this.statusNode, {
                    opacity: 1
                },
                500,
                null,
                dojo.hitch(this, function () {
                    setTimeout(dojo.hitch(this, function () {
                        dojo.style(this.statusNode, "opacity", 0);
                    }), 5000);
                })
            );
        },

        /** Handles window resize actions to best show the editable content. */
        onResize: function () {
            var editorHeight = (dijit.getViewport().h - dojo.coords(this.iframeNode).y - 5) + "px";
            this.iframeNode.style.height = editorHeight;
        }
    });
});
