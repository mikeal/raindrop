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
/*global require: false */
"use strict";

require.def("rdw/ContactList",
["require", "rd", "dojo", "dijit", "dojo.string", "dojo/dnd/Source", "rdw/_Base", "rd/contact"],
function (require, rd, dojo, dijit, string, Source, Base, contact) {

    return dojo.declare("rdw.ContactList", [Base], {
        //Array of contacts to show.
        //Warning: this is a prototype property,
        //be sure to always set it on the instance.
        contacts: [],
    
        templateString: '<ul class="ContactList"></ul>',
    
        contactTemplate: '<li class="dojoDndItem contact" data-contactId="${contactId}" dndType="contact">' +
                         '    <div class="photoSection"><img class="photo" src="${imageUrl}" /></div>' +
                         '    <div class="contactDetails">${name} ${identityHtml}</div>' +
                         '</li>',
    
        identityTemplate: '<li class="identity">' +
                          '    <div class="photoSection"><img class="photo" src="${imageUrl}" /></div>' +
                          '    <ul class="identityDetails">' +
                          '        <li class="name">${name}</li>' +
                          '        <li class="service ${serviceClass}">${service}: ${serviceName}</li>' +
                          '    </ul>' +
                          '</li>',
    
        blankImgUrl: require.nameToUrl("rdw/resources/blank", ".png"),

        /** dijit lifecycle method, after template inserted in DOM */
        postCreate: function () {
            this._subs = [
                rd.sub("rd-protocol-contacts", dojo.hitch(this, "fetchContacts"))
            ];
        },
    
        /**
         * Calls data API to get the list of contacts and
         * calls update.
         */
        fetchContacts: function () {
            contact.list(dojo.hitch(this, function (contacts) {
                this.updateContacts(contacts);
            }));
        },

        _idtySort: function (a, b) {
            return a.rd_key[1][0] > b.rd_key[1][0] ? 1 : -1;
        },

        /**
         * What it says on the tin. updates the display of contacts.
         * @param {Array} contacts
         */
        updateContacts: function (contacts) {
            this.contacts = contacts;
    
            //Sort the contacts.
            //TODO: make this more intelligent.
            this.contacts.sort(function (a, b) {
                return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
            });
    
            var html = "", i, contact, idtys, idtyHtml, j, idty, name,
                service, serviceName, serviceClass;
            for (i = 0; (contact = this.contacts[i]); i++) {
                idtys = contact.identities;
                if (!idtys) {
                    continue;
                }
    
                //Sort the identities.
                idtys.sort(this._idtySort);
    
                //Build HTML for identities.
                idtyHtml = '<ul class="identities">';
                for (j = 0; (idty = idtys[j]); j++) {
                    name = idty.name;
                    service = "";
                    serviceName = "";
                    serviceClass = "hidden";

                    //For URL identities, the info is very redundant, so
                    //skip the extra info for URL identities.
                    if (idty.rd_key[1][0] !== "url") {
                        service = rd.escapeHtml(idty.rd_key[1][0] || "");
                        serviceName = rd.escapeHtml(idty.rd_key[1][1] || "");
                        serviceClass = "";
                    }
    
                    //Generate the HTML for the identity.
                    idtyHtml += string.substitute(this.identityTemplate, {
                        imageUrl: idty.image || this.blankImgUrl,
                        name: rd.escapeHtml(idty.name || ""),
                        service: service,
                        serviceName: serviceName,
                        serviceClass: serviceClass
                    });
                }
                idtyHtml += '</ul>';
    
                //Build HTML for all the contacts.
                html += string.substitute(this.contactTemplate, {
                    contactId: contact.rd_key[1],
                    imageUrl: contact.image || this.blankImgUrl,
                    name: rd.escapeHtml(contact.name),
                    identityHtml: idtyHtml
                });
            }
    
            //Insert the HTML
            dojo.place(html, this.domNode, "only");
    
            //Make sure we are at the top of the contact list.
            dijit.scrollIntoView(this.domNode);
    
            //Wire up the DnD sources
            this.dndSources = [];
            this.dndSources.push(new Source(this.domNode, {accept: ["contact"]}));
    
            dojo.query(".contact", this.domNode).forEach(function (node) {
                this.dndSources.push(new Source(node, {accept: ["contact"]}));
            }, this);
            
            //Listen to the dnd drop
            this._subs.push(rd.sub("/dnd/drop", this, "onDndDrop"));
        },
    
        /**
         * Handles DND drops. Just a quick and dirty way to do contact merging.
         * @param {Object} source
         * @param {Array} droppedNode
         * @param {Boolean} copy
         * @param {Object} target
         */
        onDndDrop: function (source, droppedNodes, copy, target) {
            var sourceNode = droppedNodes[0],
                targetNode = target.node,
                sourceContactId = dojo.attr(sourceNode, "data-contactId"),
                targetContactId = dojo.attr(targetNode, "data-contactId");

            if (sourceContactId && targetContactId) {
                contact.merge(sourceContactId, targetContactId, function () {
                    rd.publish("rd-protocol-contacts");
                });
    
                //Update the display for now. A bit hacky, not very
                //nice. TODO: make it better.
                this.domNode.innerHTML = "Merging contacts...";
            }
        },

        /** dijit lifecycle method */
        destroy: function () {
            //Be sure to destroy the DnD handles.
            var i, source, sub;
            for (i = 0; (source = this.dndSources[i]); i++) {
                source.destroy();
            }
    
            //unsubscribe.
            for (i = 0; (sub = this._subs[i]); i++) {
                rd.unsub(sub);
            }
    
            this.inherited("destroy", arguments);
        }
    });
});