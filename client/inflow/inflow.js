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

dojo.provide("inflow");

dojo.require("dijit.Dialog");

dojo.require("rd.onHashChange");
dojo.require("rdw.Loading");
dojo.require("rdw.Notify");
dojo.require("rdw.QuickCompose");
dojo.require("rdw.Search");
dojo.require("rdw.Summary");
dojo.require("rdw.Conversations");
dojo.require("rdw.Widgets");
dojo.require("rdw.Organizer");

dojo.require("rd.engine");
dojo.require("rd.conversation");

dojo.mixin(inflow, {
  addAccountUrl: "/raindrop/settings/index.html",

  showAccounts: function() {
    //summary: shows the account setup in an iframe.
    dojo["require"]("dijit.Dialog");
    dojo.addOnLoad(this, function() {
      this.accountsDialog = new dijit.Dialog({
        "class": "inflowAddAccountFrame"  
      }, dojo.create("div", null, dojo.body()));

      this.accountsDialog.containerNode.innerHTML = '<iframe src="' + this.addAccountUrl + '"></iframe>';
      this.accountsDialog.show();
    });
  },

  onAccountFrameMessage: function(evt) {
    //summary: a postMessage endpoint for messages from the account frame.
    if (evt.data == "settings-done") {
      this.accountsDialog.hide();
      this.accountsDialog.destroy();
      this.accountsDialog = null;
    }

    //TODO: enable server syncing once our story is better there.
    //rd.engine.syncNow();
  },

  isComposeVisible: true,

  showQuickCompose: function() {
    //Place the div really high and slide it in.
    if (!this.isComposeVisible) {
      var qc = dijit.registry.byClass("rdw.QuickCompose").toArray()[0];
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
      var qc = dijit.registry.byClass("rdw.QuickCompose").toArray()[0];
      var navPosition = dojo.marginBox(dojo.byId("nav"));
      var navHeaderPosition = dojo.marginBox(dojo.byId("navHeader"));

      this.isComposeVisible = false;
      dojo.anim("nav", { top: (-1 * (navPosition.h - navHeaderPosition.h)) });
    }
  },
  
  addNotice: function(node) {
    //Adds a notice to the notices area. Extensions can pass a DOM node
    //to this method to have it show up in the notices area. The caller
    //of this function is responsible for cleaning up the node. The node
    //should have a class="notice" for styling concerns.
    dojo.byId("notices").appendChild(node);
  }
});

;(function(){
  //Set the window name, so extender can target it.
  //TODO: need to make this more generic, to work across raindrop apps.
  window.name = "raindrop";

  //Listen to no accounts/show account settings subscriptions
  rd.sub("rd.api.me.noAccounts", inflow, "showAccounts");
  rd.sub("rd-protocol-account-settings", inflow, "showAccounts");

  //Do onload work that shows the initial display.
  dojo.addOnLoad(function() {
    //inflow.hideQuickCompose();

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

    //Listen for completion for the addAccount frame.
    window.addEventListener("message", dojo.hitch(inflow, "onAccountFrameMessage"), false);

    //Listen for quick compose open calls    
    //dojo.query(".quickComposeLaunch").onclick(function(evt) {
    //  inflow.showQuickCompose();
    //  dojo.stopEvent(evt);
    //})

    //Listen for quick compose close calls.
    //rd.sub("rd-QuickCompose-closed", inflow, "hideQuickCompose");

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
