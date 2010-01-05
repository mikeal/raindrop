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
/*global run: false */
"use strict";

run("rdw/ContactSelector",
["rd", "dojo", "rdw/_Base", "dojo/string", "rd/contact"],
function (rd, dojo, Base, string, contact) {

    return dojo.declare("rdw.ContactSelector", [Base], {
        templateString: '<div class="rdwContactSelector" dojoAttachEvent="onclick: onClick">' +
                        '    <div class="rdwContactSelectorArrow"></div>' +
                        '    <div class="rdwContactSelectorContainer"><ul dojoAttachPoint="listNode"></ul></div>' +
                        '</div>',
    
        addTemplate: '<div class="add"><a href=#rdw/ContactSelector:add><span class="name">${i18n.add}</span></a></div>',
    
        contactTemplate: '<li class="${extraClass}"><a href=#rdw/ContactSelector:${contactId}><img src=${imgUrl}> <span class="name">${name}</span></a></li>',
    
        //The JS object that controls this ContactSelector instance.
        //ContactSelector will notify the controller via
        //controller.onContactSelected(/*String*/contactId) when a contact
        //is selected. If there is no controller, then an topic will be published.
        controller: null,
    
        //Array of preferred contacts to show.
        preferred: null,
    
        blankImgUrl: dojo.moduleUrl("rdw.resources", "blank.png"),
    
        /** dijit lifecycle method, called after template is inserted in DOM. */
        postCreate: function () {
            this.inherited("postCreate", arguments);
            this.update();
        },
    
        /**
         * Handles key presses in the new contact area so if Enter is
         * chosen, the name is grabbed and submitted.
         * @param {Event} evt
         */
        onNewContactKeyPress: function (evt) {
            if (evt.keyCode === dojo.keys.ENTER) {
                var name = dojo.trim(evt.target.value);
    
                if (this.controller && this.controller.onContactSelected) {
                    this.controller.onContactSelected({name: name});
                } else {
                    rd.pub("rdw/ContactSelector-selected", {name: name});
                }
    
                dojo.stopEvent(evt);
            }
        },

        /**
         * clicks on the text box should not bubble out so we can keep
         * the menu up.
         * @param {Event} evt
         */
        onNewContactClick: function (/*Event*/evt) {
            evt.stopPropagation();
        },

        /** Updates the display of the contacts. */
        update: function (/*String?*/suggestedAddName, /*Array?*/preferred) {
            this.suggestedAddName = suggestedAddName;
            this.preferred = preferred;
    
            //Generate the contacts html, starting with the preferred list.
            //Keep a hashmap of the preferred ids, to make weeding them out of the full
            //list easier.
            var prefIds = {}, html = '', i, contact, contactId;
            
            if (this.suggestedAddName) {
                html += string.substitute(this.addTemplate, {
                    name: rd.escapeHtml(this.suggestedAddName),
                    i18n: this.i18n
                });
            }
    
            if (this.preferred) {
                for (i = 0; (contact = this.preferred[i]); i++) {
                    //Only include contacts with names.
                    if (contact.name) {
                        contactId = contact.rd_key[1];
                        html += string.substitute(this.contactTemplate, {
                            contactId: contactId,
                            imgUrl: contact.image || this.blankImgUrl,
                            name: contact.name,
                            extraClass: "preferred"
                        });
                        prefIds[contactId] = 1;
                    }
                }
            }
    
            //Generate html for the rest of the contacts.
            contact.list(dojo.hitch(this, function (contacts) {
                for (i = 0; (contact = contacts[i]); i++) {
                    //Only include contacts with names.
                    if (contact.name) {
                        contactId = contact.rd_key[1];
                        if (!prefIds[contactId]) {
                            html += string.substitute(this.contactTemplate, {
                                contactId: contactId,
                                imgUrl: contact.image || this.blankImgUrl,
                                name: contact.name,
                                extraClass: ""
                            });
                        }
                    }
                }
    
                if (html) {
                    dojo.place(html, this.listNode, "only");
                }
            }));
        },

        /**
         * handles clicks on contacts.
         * @param {Event} evt
         */
        onClick: function (evt) {
            //See if we have an href. If not on immediate element, try one level
            //above, in case target was an image or span.
            var href = evt.target.href, contactId, contact;
            if (!href) {
                href = evt.target.parentNode.href;
            }

            if (href && (href = href.split("#")[1])) {
                if (href.indexOf("rdw/ContactSelector:") === 0) {
                    //Pull out contactId, it may be just an add new contact
                    //request, so construct contact data appropriately.
                    contactId = href.split(":")[1];
                    if (contactId === "add") {
                        contact = {name: this.suggestedAddName};
                    } else {
                        contact = {contactId: contactId};
                    }
    
                    //Notify controller or broadcast selection.
                    if (this.controller && this.controller.onContactSelected) {
                        this.controller.onContactSelected(contact);
                    } else {
                        rd.pub("rdw/ContactSelector-selected", contact);
                    }
                    evt.preventDefault();
                } else {
                    //Did not click on an interesting link. Stop the event
                    //to make sure things like dropdowns do not close.
                    dojo.stopEvent(evt);
                }
            }
        },

        /** Clears out the contact HTML so this has less impact on the DOM. */
        clear: function () {
            this.listNode.innerHTML = "";
        }
    });
});
