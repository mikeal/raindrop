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
/*global run: false, confirm: false, alert: false */
"use strict";

run.def("rdw/ext/mailingList/SummaryGroup",
["rd", "dojo", "rdw/_Base", "rdw/ext/mailingList/model", "text!rdw/ext/mailingList/SummaryGroup!html"],
function (rd, dojo, Base, model, template) {

    rd.addStyle("rdw/ext/mailingList/SummaryGroup");

    return dojo.declare("rdw.ext.mailingList.SummaryGroup", [Base], {
        // The ID of the mailing list. This must be passed to the constructor
        // so postCreate can use it to retrieve the document from the datastore.
        listId: null,

        templateString: template,

        /** Dijit lifecycle method after template insertion in the DOM. */
        postCreate: function () {
            this.inherited("postCreate", arguments);
            model.register(this.listId, this);
        },

        /** Dijit lifecycle method, when destroying the dijit. */
        destroy: function () {
            model.unregister(this.listId, this);
            this.inherited("destroy", arguments);
        },

        onMailingListSummaryUpdate: function (doc) {
            this.doc = doc;
            dojo.attr(this.subscriptionStatusNode, "status", doc.status);
            dojo.attr(this.subscriptionActionNode, "status", doc.status);
    
            if (doc.identity) {
                rd.escapeHtml(doc.identity[1], this.identityNode, "only");
            }
    
            //Archive is not a required field, check for it
            if (doc.archive && doc.archive.http) {
                this.archiveHttpNode.href = doc.archive.http;
            } else {
                this.archiveNode.style.display = "none";
            }

            //Post is not a required field and is often only an email
            if (doc.post) {
                if (doc.post.http) {
                    this.postHttpNode.href = doc.post.http;
                } else {
                    this.postHttpNode.style.display = "none";
                }
    
                if (doc.post.mailto) {
                    this.postEmailNode.href = doc.post.mailto;
                } else {
                    this.postEmailNode.style.display = "none";
                }
            } else {
                this.postNode.style.display = "none";
            }

            //Help is not a required field, check for it
            if (doc.help) {
                if (doc.help.http) {
                    this.helpHttpNode.href = doc.help.http;
                } else {
                    this.helpHttpNode.style.display = "none";
                }
    
                if (doc.help.mailto) {
                    this.helpEmailNode.href = doc.help.mailto;
                } else {
                    this.helpEmailNode.style.display = "none";
                }
            } else {
                this.helpNode.style.display = "none";
            }

            // TODO: make this localizable.
            if (doc.status === "subscribed") {
                rd.escapeHtml("Subscribed", this.subscriptionStatusNode, "only");
                rd.escapeHtml("Unsubscribe", this.subscriptionActionNode, "only");
            } else if (doc.status === "unsubscribe-pending" ||
                       doc.status === "unsubscribe-confirmed") {
                rd.escapeHtml("Unsubscribe Pending", this.subscriptionStatusNode, "only");
                //XXX Future
                //rd.escapeHtml("Cancel Unsubscribe", this.subscriptionActionNode, "only");
            } else if (doc.status === "unsubscribed") {
                rd.escapeHtml("Unsubscribed", this.subscriptionStatusNode, "only");
                //XXX Future
                //rd.escapeHtml("Re-Subscribe", this.subscriptionActionNode, "only");
            }
        },

        /**
         * Unsubscribe from a mailing list.
         *
         * This method uses the parsed List-Unsubscribe headers of email messages
         * from lists to determine how to issue the unsubscription request. The
         * Mailing List headers should have been properly parsed in the mailing list
         * extension.    Any errors found here should likely be logged with support
         * tickets so we can update the extension for better parsing.
         *
         */
        onSubscription: function () {
            // Don't do anything unless the user is subscribed to the list.
            if (this.doc.status !== "subscribed") {
                return;
            }
    
            // TODO: do all this in the mailing list extractor extension so we know
            // whether or not we understand how to unsubscribe from this mailing list
            // right from the start and can enable/disable the UI accordingly.
            // TODO: If we can't unsubscribe the user, explain it to them nicely.
            if (!this.doc.unsubscribe && !this.doc.unsubscribe.mailto) {
                throw "can't unsubscribe from mailing list; no unsubscribe info";
            }
    
            if (!confirm("Are you sure you want to unsubscribe from " + this.doc.id + "?    " +
                                     "You won't receive messages from the mailing list anymore, " +
                                     "and if you resubscribe later you won't receive the messages " +
                                     "that were sent to the list while you were unsubscribed.")) {
                return;
            }

            // TODO: retrieve the list from the store again and make sure its status
            // is still "subscribed" and we're still able to unsubscribe from it.
    
            this.doc.status = "unsubscribe-pending";
            model.put(this.doc)
            .error(this, function (error) {
                // TODO: update the UI to notify the user about the problem.
                alert("error updating list: " + error);
            });
        }
    });
});
