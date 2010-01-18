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

run.def("rdw/DataSelector",
["run", "rd", "dojo", "dojo/DeferredList", "rdw/_Base", "rd/MegaviewStore"],
function (run, rd, dojo, DeferredList, Base, MegaviewStore) {

    return dojo.declare("rdw.DataSelector", [Base], {
        templateString: '<div class="rdwDataSelector dijitReset dijitInlineTable dijitLeft"><div dojoAttachPoint="selectorNode"></div></div>',
    
        comboWidget: "dijit/form/ComboBox",
    
        //type can have values of "identityContact", "contact", or "locationTag"
        //by default. Extensions can add other types by creating a typeLoaded function
        //on this widget.
        type: "identityContact",
    
        //If type is set to "all", this is the list of data stores
        //to aggregate together. Extensions can add other types by pushing
        //new values to this array. Note that this is an array on the prototype for
        //this widget. Just reassign this property to a new array on an instance
        //just to affect that instance's list.
        allType: ["contact", "locationTag"],
    
        //Restrict the type of records further. Useful in the default case only
        //for type: "identityContact".
        //values are like "twitter", "email", in other words, the first array
        //value of the identity ID.
        subType: "",
    
        //An initial value that will be used after
        //the person docs from the couch have loaded.
        initialValue: "",

        /** Dijit lifecycle method run before template evaluated */
        postMixInProperties: function () {
            this.inherited("postMixInProperties", arguments);
        },

        /** Dijit lifecycle method run after template HTML is in DOM */
        postCreate: function () {
            //Declare array to use for items found from data sources.
            this.items = [];
    
            //Figure out what data sources to use.
            this.sources = this.allType;
            if (this.type !== "all") {
                this.sources = [this.type];
            }
    
            this.createWidget();
        },

        /**
         * creates the widget that will use the data in this.items. Each object
         * entry in items should have an "id" and a "name" property.
         */
        createWidget: function () {
            //sort by name
            this.items.sort(function (a, b) {
                return a.name > b.name ? 1 : -1;
            });
    
            //Load the code for the widget then create and initialize it.
            run([this.comboWidget], dojo.hitch(this, function (Ctor) {
                //Create the selector widget.
                this.selectorInstance = new Ctor({
                    store: new MegaviewStore({
                        schemaQueryTypes: this.sources,
                        subType: this.subType
                    }),
                    onChange: dojo.hitch(this, "onSelectorChange")            
                }, this.selectorNode);
    
                //Pass initial value to selector if it was set.
                if (this.initialValue) {
                    this.selectorInstance.attr("value", this.initialValue);
                }
        
                //Add to supporting widgets so widget destroys do the right thing.
                this.addSupporting(this.selectorInstance);
            }));
        },

        /**
         * Triggered when the selector's value changes. value should be
         * type:id.
         * @param {String} value
         */
        onSelectorChange: function (value) {
            var item = this.selectorInstance.item;
            if (!item) {
                return;
            }
    
            //Dispatch to idSelected method on this instance.
            this[item.type + "Selected"](item.id);
    
            this.onDataSelected({
                type: item.type,
                id: item.id,
                value: item.name
            });
        },

        /**
         * Connection point for other code, that signals when data is selected.
         * @param {Object} data
         * @param {String} data.type the type of data selected (from what data source)
         * @param {String} data.id the id of the data for that type of data source.
         * @param {String} data.value the visible value for the data selected.
         */
        onDataSelected: function (/*Object*/data) {
        },

        /**
         * Allows instance.attr("value") to work.
         */
        _getValueAttr: function () {
            return this.selectorInstance ? this.selectorInstance.attr("value") : this.initialValue;
        },

        /**
         * Allows instance.attr("value", value) to work.
         */
        _setValueAttr: function (/*String*/ value, /*Boolean?*/ priorityChange) {
            return this.selectorInstance ?
                    this.selectorInstance.attr("value", value, priorityChange)
                :
                    this.initialValue = value;
        },

        /**
         * Dispatch function when a contact is selected.
         * @param {String} contactId
         */
        contactSelected: function (contactId) {
            rd.setFragId("rd:contact:" + contactId);    
        },

        /**
         * Dispatch function when an identity is selected.
         * @param {String} identityId
         */
        identitySelected: function (identityId) {
            rd.setFragId("rd:identity:" + identityId);
        },
    
        /**
         * Dispatch function when a locationTag is selected.
         * @param {String} location
         */
        locationTagSelected: function (location) {
            rd.setFragId("rd:locationTag:" + location);
        }
    });
});