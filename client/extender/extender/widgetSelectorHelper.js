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

dojo.provide("extender.widgetSelectorHelper");

//Uses script-added styles to allow loading on demand at the cost of a
//custom build that would load all styles at the beginning.
rd.addStyle("extender.css.widgetSelectorHelper");

extender.widgetSelectorHelper = {
  //Holds on to instance of WidgetSelector to notify of a selection.
  displayWidget: null,
  
  start: function(/*Object*/displayWidget) {
    //summary: starts the tracking of the mouse for widget selection and
    //binds to a displayWidget to tell it what widget gets selected.
    this.displayWidget = displayWidget;

    this.moveHandle = dojo.connect(document.documentElement, "onmousemove", this, "onMouseMove");
    this.clickHandle = dojo.connect(document.documentElement, "onclick", this, "onClick");
  },

  stop: function() {
    //summary: stops the tracking of the mouse for widget selection, and
    //general cleanup.
    this.displayWidget = null;
    this._forgetWidget();
    dojo.disconnect(this.moveHandle);
    dojo.disconnect(this.clickHandle);
  },

  onMouseMove: function (evt) {
    //summary: as the user moves the mouse, highlight appropriate widget.

    //Find parent widget.
    var widget = dijit.getEnclosingWidget(evt.target);

    if (widget != this.widget) {
      this._forgetWidget();
      this.widget = widget;
      if (this.widget) {
        dojo.addClass(this.widget.domNode, "widgetSelectorHelperSelected");
        this._updateLabel();
      }
    }
  },

  onClick: function(evt) {
    //summary: as user clicks on an element, tell the displayWidget about it.
    try {
      this.displayWidget.select(this.widget.declaredClass);
    } catch (e) {
      //In some cases we might not get notified if the displayWidget's window
      //is destroyed, so assume if an error here, then stop.
      this.stop();
    }
    this._forgetWidget();
  },

  _forgetWidget: function(widget) {
    //summary: gets rid of a reference to the widget to help avoid leaks,
    //bad refreshes of data.
    if (this.widget) {
      dojo.removeClass(this.widget.domNode, "widgetSelectorHelperSelected");
      this.widget = null;
      if (this.labelNode) {
        this.labelNode.style.display = "none";
      }
    }
  },
  
  _updateLabel: function() {
    //summary: positions label about the widget in upper left corner.
    if (!this.labelNode) {
      this.labelNode = dojo.create("div", {
        "class": "widgetSelectorHelperLabel"
      }, dojo.body());
    }

    var coords = dojo.coords(this.widget.domNode, true);
    var style = this.labelNode.style;
    style.top = coords.y + "px";
    style.left = coords.x + "px";
    this.labelNode.innerHTML = this.widget.declaredClass;
    style.display = "block";
  }
}
