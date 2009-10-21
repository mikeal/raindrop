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

dojo.provide("inflowgrid");

dojo.require("rd.onHashChange");
dojo.require("rdw.Loading");
dojo.require("rdw.Notify");
dojo.require("inflowgrid.QuickCompose");
dojo.require("rdw.Search");
dojo.require("inflowgrid.Stories");
dojo.require("inflowgrid.Organizer");

dojo.require("rd.engine");
dojo.require("rd.conversation");

dojo.mixin(inflowgrid, {
  isComposeVisible: true,

  showQuickCompose: function() {
    //Place the div really high and slide it in.
    if (!this.isComposeVisible) {
      var qc = dijit.registry.byClass("inflowgrid.QuickCompose").toArray()[0];
      dojo.removeClass(qc.domNode, "invisible");

      var position = dojo.position(qc.domNode);
      var navNode = dojo.byId("nav");
      qc.domNode.style.top = (-1 * position.h) + "px";
      this.isComposeVisible = true;
      dojo.anim("nav", { top: 0 });
    }
  },

  hideQuickCompose: function() {
    if (this.isComposeVisible) {
      var qc = dijit.registry.byClass("inflowgrid.QuickCompose").toArray()[0];
      var navPosition = dojo.marginBox(dojo.byId("nav"));
      var navHeaderPosition = dojo.marginBox(dojo.byId("navHeader"));

      this.isComposeVisible = false;
      dojo.anim("nav", { top: (-1 * (navPosition.h - navHeaderPosition.h)) });
    }
  }
});

;(function(){
  //Set the window name, so extender can target it.
  //TODO: need to make this more generic, to work across raindrop apps.
  window.name = "raindrop";


  //Do onload work that shows the initial display.
  dojo.addOnLoad(function() {
    inflowgrid.hideQuickCompose();

    //Trigger the first list of items to show. Favor a fragment ID on the URL.
    var fragId = location.href.split("#")[1];
    if (fragId) {
      rd.dispatchFragId(fragId);
    } else {
      rd.pub("rd-protocol-home");
    }

    //Listen for hash changes but only if the hash value is empty,
    //which means do our default action (view home)
    rd.sub("rd.onHashChange", function(val) {
      if (!val) {
        rd.pub("rd-protocol-home");
      }
    });

    //Listen for quick compose calls    
    dojo.query(".quickComposeLaunch").onclick(function(evt) {
      inflowgrid.showQuickCompose();
      dojo.stopEvent(evt);
    })

    //Start up the autosyncing if desired, time is in seconds.
    var autoSync = 0;
    var args = location.href.split("#")[0].split("?")[1];
    if (args) {
      args = dojo.queryToObject(args);
      if (args.autosync) {
        if (args.autosync == "off") {
          autoSync = 0;
        } else {
          autoSync = parseInt(args.autosync, 10);
        }
      }
    }

    //watch for auto sync
    if (autoSync) {
      rd.engine.autoSync(autoSync);
    }
  });
})();