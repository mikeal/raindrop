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

dojo.provide("rdw._Base");

dojo.require("dojo.cache");
dojo.require("dojo.string");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.require("rd");

//TODO: remove the ROOT call to allow dynamic locale determination
dojo.requireLocalization("rdw", "i18n", "ROOT");

//Base "class" for all rdw widgets.
dojo.declare("rdw._Base", [dijit._Widget, dijit._Templated], {
  postMixInProperties: function() {
    //summary: dijit lifecycle method
    this.inherited("postMixInProperties", arguments);

    //Set default i18n bundle
    //TODO: remove the ROOT call to allow dynamic locale determination
    this.i18n = dojo.i18n.getLocalization("rdw", "i18n");
  },

  getFragmentId: function(/*Event*/evt) {
    //summary: pulls off the fragment ID of a link on the target element,
    //if there is one.
    var frag = evt.target.href;
    if (frag) {
      frag = frag.split("#")[1];
    }
    return frag;
  },

  addSupporting: function(/*Object*/widget) {
    //summary: adds a supporting widget to the supportingWidgets array,
    //to assist with proper widget cleanup.
    if (!this._supportingWidgets) {
      this._supportingWidgets = []
    }

    this._supportingWidgets.push(widget);
    return widget;
  },

  removeSupporting: function(/*Object*/widget) {
    //summary: removes a supporting widget from the supporting widgets
    //array. Useful if the supporting widget is destroyed before this
    //widget is destroyed.
    if (!this._supportingWidgets) {
      var index = dojo.indexOf(this._supportingWidgets, widget);
      if (index > -1) {
        this._supportingWidgets.splice(index, 1);
      }
    }
  },

  destroyAllSupporting: function() {
    //summary: destroys all supporting widgets, and removes them
    //from the _supportingWidgets array.
    if (this._supportingWidgets && this._supportingWidgets.length) {
      var widget;
      while((widget = this._supportingWidgets.shift())) {
        widget.destroy();
      }
    }
  }
});
