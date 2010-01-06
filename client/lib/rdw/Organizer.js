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

/*jslint nomen: false, plusplus: false */
/*global run: false, location: false */
"use strict";

run("rdw/Organizer",
["rd", "dojo", "rdw/_Base", "rd/conversation", "rd/tag", "dojo/string",
 "dijit/TitlePane", "text!rdw/templates/Organizer!html"],
function (rd, dojo, Base, conversation, tag, string, TitlePane, template) {

    return dojo.declare("rdw.Organizer", [Base], {
        // Mailing lists to which any messages in the datastore belong.
        // Populated by a view after the widget gets created.
    
        widgetsInTemplate: true,
    
        templateString: template,
    
        listContainerHtml: '<select class="${listClass}" onchange="if (this.value) window.location = \'#\' + this.value"></select>',
    
        //The order in which to call list operations
        //push new items to this array and define matching function
        //on Organizer to extend Organizer listing.
        listOrder: [
            "listLocation"
        ],

        /** Dijit lifecycle method, after template in DOM */
        postCreate: function () {
            this.inherited("postCreate", arguments);
    
            //Listen for different links already in the template, for current
            //selection changes.
            dojo.query("li[type]").forEach(function (node) {
                var type = node.getAttribute("type");
                this.subscribe("rd-protocol-" + type, dojo.hitch(this, "onSelectionChange", type));
            }, this);
    
            //Generate a list of links for the Organizer.
            //Use a name dispatch convention to allow extensions
            //to add other links.
            this.listToPane = {};
            var i, funcName, paneNode;
            for (i = 0; (funcName = this.listOrder[i]); i++) {
                //The extension funcName may not exist, so ignore if not defined
                if (!this[funcName]) {
                    continue;
                }
    
                //Create a TitlePane that will hold some items, initially hidden.
                paneNode = dojo.place(rd.template(this.listContainerHtml, {
                    listClass: funcName
                }), this.domNode);
                
                //Bizarre, webkit is making a DocumentFragment for the place call?
                if (paneNode.style) {
                    paneNode.style.display = "none";
                }
    
                //Remember this TitlePane and call method that populates it.
                this.listToPane[funcName] = paneNode;
                this[funcName]();
            }
        },

        /**
         * Called by list functions to add items to the DOM.
         * @param {String} type
         * @param {String} title
         * @param {DOMNode|DocumentFragment} items
         */
        addItems: function (type, title, items) {
            var paneNode = this.listToPane[type];
            dojo.place('<option value="">' + title + '</option>', paneNode);
    
            dojo.place(items, paneNode);
            if (paneNode.style) {
                paneNode.style.display = "";
            }
        },

        /** Shows a list of imap location folders available for viewing. */
        listLocation: function () {
            tag.locations(dojo.hitch(this, function (locations) {
                var html = "", i, loc;
                for (i = 0; (loc = locations[i]); i++) {
                    html += string.substitute('<option value="rd:locationTag:${id}">${name}</option>', {
                        id: loc.toString(),
                        name: loc.join("/")
                    });
                }
    
                if (html) {
                    this.addItems("listLocation", "Mail Folders", dojo._toDom(html));
    
                    //Listen to set current selection state.
                    this.subscribeSelection("locationTag");
                }
            }));
        },

        /**
         * Subscribes to the selection notification for the rd-protocol topic
         * with the provided sub type.
         * @param {String} protocolSubType
         */
        subscribeSelection: function (protocolSubType) {
            this.subscribe("rd-protocol-" + protocolSubType, dojo.hitch(this, "onSelectionChange", protocolSubType));
            
            //Check current URL fragment. If contains the protocol sub type, then set selection.
            var fragId = location.href.split("#")[1],
                prefix = "rd:" + protocolSubType + ":",
                args;
            if (fragId && fragId.indexOf(prefix) === 0) {
                args = fragId.substring(prefix.length, fragId.length);
                args = (args && args.split(":")) || [];
                args.unshift(protocolSubType);
                this.onSelectionChange.apply(this, args);
            }
        },

        /**
         * As the selection changes, highlight the right thing in the organizer.
         * Can be called with no args, which means try applying previous stored
         * this.selectionType. Useful for extensions that add new things after an
         * async API call.
         * @param {String} type
         * @param {String} arg
         */
        onSelectionChange: function (type, arg) {
            if (type || this.selectionType) {
                //First remove current selection.
                dojo.query("li.selected", this.domNode).removeClass("selected");
        
                //Apply selection to the correct element.
                if (type) {
                    this.selectionType = Array.prototype.join.call(arguments, ":");
                }
                if (this.selectionType) {
                    dojo.query('[type="' + this.selectionType + '"]').addClass("selected");
                }
            }
        },

        /** Dijit lifecycle method */
        destroy: function () {
            this.inherited("destroy", arguments);
        }
    });
});
