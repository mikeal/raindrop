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
/*global dojo: false, rdw: false, rd: false, setTimeout: false */
"use strict";

dojo.provide("rdw.ext.mailingList.model");

dojo.require("rd.api");

rdw.ext.mailingList.model = {
    _reg: {},
    _ids: {},

    /**
     * registers an object, usually a widget, as listening for a summary schema.
     * The object should have a .id property that is unique and implement
     * a onMailingListSummaryUpdate method.
     */
    register: function (mlId, obj) {
        var reg = this._reg[mlId] || (this._reg[mlId] = {}),
            id = obj.id, doc = this._ids[mlId];
        if (!reg[id]) {
            reg[id] = obj;
        }
        if (!doc) {
            this._ids[mlId] = "needsUpdate";
            this._get(mlId);
        } else {
            if (doc !== "needsUpdate") {
                obj.onMailingListSummaryUpdate(doc);
            }
        }
    },

    unregister: function (mlId, obj) {
        var prop, reg = this._reg[mlId];
        delete reg[obj.id];
    
        //Check if any other registrations. If so, clean up.
        for (prop in reg) {
            if (this.reg.hasOwnProperty(prop)) {
                //Still listeners, just return.
                return;
            }
        }
    
        //If got here, then no more registrations for that list, clean up.
        delete this._reg[mlId];
        delete this._ids[mlId];
    },

    put: function (doc) {
        return rd.api().put({
            doc: doc
        }).ok(this, function (upDoc) {
            var mlId = doc.id;
      
            //Update the rev.
            doc._rev = doc._rev;
      
            //Update the cache
            this._ids[mlId] = doc;
      
            //If the status is a pending one, then watch for changes.
            this._checkStatus(mlId, doc);
        });
    },

    _get: function (mlId) {
        var doc = this._ids[mlId],
            dfd = new dojo.Deferred();
        if (doc === "needsUpdate") {
            rd.api().megaview({
                key: ['rd.mailing-list', 'id', mlId],
                reduce: false,
                include_docs: true
            })
            .ok(this, function (json) {
                // ??? Should we pass the doc to the callback rather than assigning it
                // to a property of this object here?
                if (json.rows.length > 0) {
                    var doc = this._ids[mlId] = json.rows[0].doc;
                    dfd.callback(doc);
                    this._callUpdate(mlId, doc);
                } else {
                    dfd.error(json);
                }
            })
            .error(dfd);
        } else {
            dfd.callback(doc);
        }
        return dfd;
    },

    _callUpdate: function (mlId, doc) {
        var objs = this._reg[mlId], prop;
        for (prop in objs) {
            if (objs.hasOwnProperty(prop)) {
                objs[prop].onMailingListSummaryUpdate(doc);
            }
        }
    },

    _checkStatus: function (mlId, doc) {
        //First, update listeners with the doc.
        this._callUpdate(mlId, doc);
    
        //Now keep checking if the status is one that is in transition.
        if (doc.status === "unsubscribe-pending" || doc.status === "unsubscribe-confirmed") {
            setTimeout(dojo.hitch(this, function () {
                this.get(mlId).ok(this, function (doc) {
                    this._checkStatus(mlId, doc);
                });       
            }), 10000);
        }
    }
};
