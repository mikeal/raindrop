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
/*global run: false */
"use strict";

run.def("rdw/SummaryGroup",
["rd", "dojo", "rdw/_Base", "rd/onHashChange", "rdw/InflowSummaryGroup"],
function (rd, dojo, Base, onHashChange, InflowSummaryGroup) {

    return dojo.declare("rdw.SummaryGroup", [Base], {
        templateString: '<div class="rdwSummaryGroup WidgetBox"></div>',

        //List of topics to listen to and modify contents based
        //on those topics being published. Note that this is an object
        //on the rdw.SummaryGroup prototype, so modifying it will affect
        //all instances. Reassign the property to a new object to affect
        //only one instance.
        topics: {
            "rd-protocol-home": "home"
        },

        /** Dijit lifecycle method after template insertion in the DOM. */
        postCreate: function () {
            //Register for hashchange events so widget can update its state to
            //reflect the hash state.
            rd.sub("rd/onHashChange", this, "onHashChange");

            //Be sure to grab the latest value.
            this.onHashChange(onHashChange.value || "rd:home");
        },

        onHashChange: function (value) {
            value = value || "rd:home";
            this.clear();
            var topic = rd.getFragIdTopic(value),
                funcName = this.topics[topic.name];
            if (funcName) {
                this[funcName](topic.data);
            }
        },

        clear: function () {
            this.destroyAllSupporting();
            this.domNode.innerHTML = "";     
        },

        //**************************************************
        //start topic subscription endpoints
        //**************************************************
        home: function () {
            this.addSupporting(new InflowSummaryGroup({
            }, dojo.create("div", null, this.domNode)));
        }
        //**************************************************
        //end topic subscription endpoints
        //**************************************************
    });
});
