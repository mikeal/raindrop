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
/*global run: false, opener: false */
"use strict";

run.def("extender/WidgetSelector",
["rd", "dojo", "rdw/_Base", "extender/Editor",
  "text!extender/templates/WidgetSelector!html", "text!extender/templates/sampleObjectExtension!js"],
function (rd, dojo, Base, Editor, template, sampleTemplate) {

    //Uses script-added styles to allow loading on demand at the cost of a
    //custom build that would load all styles at the beginning.
    rd.addStyle("extender/css/WidgetSelector");

    return dojo.declare("extender.WidgetSelector", [Base], {
        templateString: template,

        /**
         * Dijit lifecycle method, after template is in the DOM.
         */
        postCreate: function () {
            //Tell parent to load helper selector.
            var _self = this;
            opener.run(["extender/widgetSelectorHelper"], function (helper) {
                helper.start(_self);  
            });
        },

        /**
         * Handles selection of widget. Called by widgetSelectorHelper.
         * @param {String} widgetName
         */
        select: function (widgetName) {
            this.targetName = widgetName;
            rd.escapeHtml(this.targetName, this.widgetNameNode, "only");
        },

        /** Dijit lifecycle method. */
        destroy: function () {
            //Make sure parent window does not hold on to this widget instance.
            opener.extender.widgetSelectorHelper.stop();
            this.inherited("destroy", arguments);
        },

        /** Handles creating the basic extension. */
        onCreateClick: function (evt) {
            dojo.stopEvent(evt);
            
            if (!this.targetName) {
                this.feedback("Please select a widget in the other window.");
                return;
            }
    
            var extName = dojo.trim(this.nameNode.value), template, text,
                editor;
            if (!extName) {
                this.feedback("Please enter a name for the extension");
                return;
            }
    
            //Make sure extName is valid.
            extName = extName.replace(/[^\w_]/g, "");
    
            opener.extender.widgetSelectorHelper.stop();
    
            //Load up the sample extension, replacing the names.
            template = sampleTemplate;
            text = rd.template(template, {
                extName: extName,
                targetModule: this.targetName
            });
    
            //Show the editor widget.
            editor = new Editor({
                moduleName: "ext." + extName,
                targetNames: [this.targetName],
                content: text,
                extType: "ext"
            });
    
            this.extender.add(editor);
    
            //Trigger the extension immediately?
            editor.onSave();
            this.feedback("");
        },

        /**
         * Give user feedback on their action.
         * @param {String} message
         */
        feedback: function (message) {
            rd.escapeHtml(message, this.feedbackNode, "only");
        }
    });
});
