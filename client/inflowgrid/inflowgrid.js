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
  isComposeVisible: false,

  showQuickCompose: function() {
    //Place the div really high and slide it in.
    if (!this.isComposeVisible) {
      var qc = dijit.registry.byClass("inflowgrid.QuickCompose").toArray()[0];
      //Force expanded view.
      qc.onFocusTextArea();

      var position = dojo.position(qc.domNode);
      qc.domNode.style.top = (-1 * position.h) + "px";
      this.isComposeVisible = true;
      dojo.fx.slideTo({
        node: qc.domNode,
        left: 0,
        top: 0,
        units: "px"
      }).play();
    }
  },

  hideQuickCompose: function() {
    if (this.isComposeVisible) {
      var qc = dijit.registry.byClass("inflowgrid.QuickCompose").toArray()[0];
      var position = dojo.position(qc.domNode);
      this.isComposeVisible = false;
      dojo.fx.slideTo({
        node: qc.domNode,
        left: 0,
        top: -1 * position.h,
        units: "px"
      }).play();
    }
  }
});

;(function(){
  //Set the window name, so extender can target it.
  //TODO: need to make this more generic, to work across raindrop apps.
  window.name = "raindrop";


  //Do onload work that shows the initial display.
  dojo.addOnLoad(function() {
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