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
/*global require: false, window: false, setTimeout: false, prompt: false,
confirm: false, location: true */
"use strict";

require.def("extender/Editor",
["require", "rd", "dojo", "dijit", "rdw/_Base", "rd/api", "extender/util",
 "text!extender/templates/Editor!html"],
function (require, rd, dojo, dijit, Base, api, util, template) {

    //Uses script-added styles to allow loading on demand at the cost of a
    //custom build that would load all styles at the beginning.
    rd.addStyle("extender/css/Editor");

    return dojo.declare("extender.Editor", [Base], {
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
        iframeUrl: require.nameToUrl("extender/../bespin", ".html"),
    
        templateString: template,
    
        widgetsInTemplate: true,

        /**
         * Handles clicks to try it button, instantly saves the extension,
         * and show other action buttons.
         * @param {Event} evt
         */
        onTryClick: function (evt) {
            //Switch the buttons out
            //Set button state.
            dojo.forEach([this.cloneNode, this.saveNode, this.enabledSectionNode, this.deleteNode], function (node) {
                dojo.style(node, {
                    display: ""
                });
            });
            dojo.style(this.tryNode, {
                display: "none"
            });
            
            this.onSave(null, dojo.hitch(this, function () {
                this.enableExtension(true);
            }));
        },

        /** Dijit lifecycle method, after template is in the DOM. */
        postCreate: function () {
            //Set button state.
            if (this.useTryMode) {
                dojo.forEach([this.cloneNode, this.saveNode, this.enabledSectionNode, this.deleteNode], function (node) {
                    dojo.style(node, {
                        display: "none"
                    });
                });
            } else {
                dojo.style(this.tryNode, {
                    display: "none"
                });
            }

            var parts, text;

            //Get .js path.
            parts = this.moduleName.split(".");
            this.path = require.nameToUrl(this.moduleName, ".js");
    
            text = this.content;
            if (!text) {
                //TODO: does not work with xdomain loaded modules.
                text = dojo._getText(this.path + "?nocache=" + ((new Date()).getTime()));
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
            this.enabledNode.checked = util.opener().require("rd").extensionEnabled(this.moduleName, this.targetNames[0]);
    
            //Bind to resize and make sure size is initially correct.
            if (this.useViewportResize) {
                this.connect(window, "onresize", "onResize");
            }
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
            setTimeout(dojo.hitch(this, function () {
                this.onResize();
                if (this.onEditorLoad) {
                    this.onEditorLoad();
                }
            }), 1000);
            if (this._saveOnLoad) {
                this.onSave();
            }
        },

        /**
         * The path to the couchdb document that has this extension as
         * an attachment.
         */
        couchDocPath: function () {
            var modulePath = this.moduleName.replace(/\./g, "/"),
                index = this.path.indexOf(modulePath);
            return this.path.substring(0, index - 1);
        },

        /**
         * Gets the module's couchdb path from its module name.
         * It is really an attachment on a couchdb document.
         */
        moduleDocPath: function () {
            var modulePath = this.moduleName.replace(/\./g, "/");
            return this.couchDocPath() + "/" + modulePath + ".js";
        },

        /** Handles clicks to clone button. */
        onClone: function (evt) {
            var moduleName = prompt("Choose a name for the cloned extension:");
            moduleName = moduleName && dojo.trim(moduleName);
            if (moduleName) {
                //Make sure extName is valid.
                moduleName = moduleName.replace(/[^\w_]/g, "");
                window.location = "frontExtension.html?r=" + (new Date()).getTime() + "#" + moduleName + ":" + this.targetNames.join(",") + ":clone:" + this.moduleName;
            }
        },

        /** Handles click events to save button. */
        onSave: function (evt, callback) {
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
                    dojo.xhrPut({
                        url: this.moduleDocPath() + "?rev=" + _rev,
                        headers: {
                            "Content-Type": "application/javascript"
                        },
                        putData: this.iframeNode.contentWindow._editorComponent.getContent(),
                        handle: dojo.hitch(this, function (response, ioArgs) {
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
                                handle: dojo.hitch(this, function (response, ioArgs) {
                                    if (response instanceof Error) {
                                        this.updateStatus("Error: " + response);
                                    } else {
                                        //Trigger update in opener.
                                        util.opener().require("rd")._updateExtModule(this.moduleName, dojo.toJson(this.targetNames));
    
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
            });
        },

        /**
         * Handles action to delete an extension.
         * @param {Event} evt
         */
        onDelete: function (evt) {
            if (confirm("Delete this extension: " + this.moduleName + "?")) {
                //Delete the manifest document.
                var manifestUrl = rd.dbPath + this.moduleManifest._id;
                dojo.xhrGet({
                    url: manifestUrl,
                    handleAs: "json",
                    load: dojo.hitch(this, function (doc, ioArgs) {
                        dojo.xhrDelete({
                            url: manifestUrl + "?rev=" + doc._rev,
                            load: dojo.hitch(this, function () {
                                //Now get rid of the extension JS.
                                //TODO: delete any CSS/HTML associated with the deleted files?
                                dojo.xhrGet({
                                    url: this.couchDocPath(),
                                    handleAs: "json",
                                    load: dojo.hitch(this, function (response, ioArgs) {
                                        var _rev = response._rev;
                                        dojo.xhrDelete({
                                            url: this.moduleDocPath() + "?rev=" + _rev,
                                            load: dojo.hitch(this, function () {
                                                this.updateConfigJs("delete");
    
                                                //Disable the extension in the live page.
                                                this.enableExtension(false);
                                                
                                                //Paranoid, give a bit of time for parent frame operations
                                                //to complete.
                                                setTimeout(function () {
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

        /**
         * Handles clicks to enable/disable an extension.
         * @param {Event} evt
         */
        onEnableClick: function (evt) {
            this.enableExtension(this.enabledNode.checked);
        },

        enableExtension: function (enabled) {
            //Update the manifest.
            if (enabled) {
                delete this.moduleManifest.disabled;
            } else {
                this.moduleManifest.disabled = true;
            }
            //Update the runtime display
            for (var i = 0, target; (target = this.targetNames[i]); i++) {
                util.opener().require("rd").extensionEnabled(this.moduleName, target, enabled);
            }
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
            var editorHeight, sibHeight;
            if (this.useViewportResize) {
                editorHeight = (dijit.getViewport().h - dojo.coords(this.iframeNode).y - 5) + "px";
            } else {
                //Add up sibling element heights, then use the remainder (as compared to parent
                //height) as the height for this
                sibHeight = 0;
                dojo.query(this.iframeNode).siblings().forEach(function (node) {
                    sibHeight += dojo.marginBox(node).h;
                });
                editorHeight = (dojo.contentBox(this.iframeNode.parentNode).h - sibHeight) + "px";
            }
            this.iframeNode.style.height = editorHeight;
        },

        /**
         * Fetches the manifest for this extension. If no manifest exists,
         * create one for it.
         */
        fetchManifest: function () {
            api().megaview({
                key: ["rd.core.content", "key", ["ext", this.moduleName]],
                include_docs: true,
                reduce: false
            })
            .ok(this, function (json) {
                var rows = json.rows;
                if (rows.length) {
                    this.moduleManifest = rows[0].doc;
                } else {
                    this.generateManifest();
                }
                this.enabledNode.checked = !this.moduleManifest.disabled;
            })
            .error(this, function (json) {
                this.generateManifest();
                this.enabledNode.checked = !this.moduleManifest.disabled;
            });
        },

        /** Makes up a manifest json for this extension. */
        generateManifest: function () {
            var rdKey = ["ext", this.moduleName], mapping, i, targetName;
    
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
            mapping = {};
            for (i = 0; (targetName = this.targetNames[i]); i++) {
                mapping[targetName] = this.moduleName;
            }
            this.moduleManifest[(this.extType === "ext" ? "exts" : "subscriptions")] = mapping;
        },

        /**
         * Updates the rdconfig.js file with a change to the extension data.
         * command can be "delete" or "save".
         * @param {String} command
         */
        updateConfigJs: function (command) {
            //Get the rdconfig.js text.
            dojo.xhrGet({
                url: rd.dbPath + "lib/rdconfig.js",
                load: dojo.hitch(this, function (configText, ioArgs) {
                    //Do the rdconfig.js mangling.
                    var empty = {}, i, targetName, propName, hasObject,
                        insertRegExp, text, regExp;
                    for (i = 0; (targetName = this.targetNames[i]); i++) {
                        regExp = new RegExp('(,)?\\s*{\\s*["\']' + targetName + '["\']\\s*:\\s*["\']' + this.moduleName + '["\']\\s*}');
                        if (command === "delete" || !this.enabledNode.checked) {
                            configText = configText.replace(regExp, "");
                        } else if (command === "save" && !regExp.test(configText)) {
                            //Save a new entry, it is not an existing entry.
                            propName = (this.extType === "ext" ? "exts" : "subs");
                            hasObject = (new RegExp(propName + '\\s*:\\s*\\[\\s*{')).test(configText);
                            insertRegExp = new RegExp(propName + '\\s*:\\s*\\[\\s*');
                            text = propName + ": [{'" + targetName + "': '" + this.moduleName + "'}";
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
                        load: dojo.hitch(this, function (response, ioArgs) {
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
});
