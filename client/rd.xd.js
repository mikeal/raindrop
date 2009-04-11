//xdomain loading wrapper. Can be inserted by a build process, but manually doing it for now.
window[(typeof (djConfig)!="undefined"&&djConfig.scopeMap&&djConfig.scopeMap[0][1])||"dojo"]._xdResourceLoaded(function(dojo, dijit, dojox){
  return {
  depends:[["provide","rd"], ["require","couch"]],defineResource:function(dojo, dijit, dojox){

//Main module definition
dojo.provide("rd");

dojo.require("couch");

/*
This file provides some basic environment services running in raindrop.
*/

dojo.mixin(rd, {
  ready: dojo.addOnLoad,

  escapeHtml: function(text) {
    return text && text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  },

  convertLines: function(text) {
    //Converts line returns to BR tags
    return text && text.replace(/\n/g, "<br>");  
  },

  onDocClick: function(evt) {
    //summary: Handles doc clicks to see if we need to use a register protocol.
    var node = evt.target;
    var href = node.href;
    
    if (!href && node.nodeName.toLowerCase() == "img") {
      //Small cheat to handle images that are hyperlinked.
      //May need to revisit this for the long term.
      href = node.parentNode.href;
    }

    if (href) {
      href = href.split("#")[1];
      if (href && href.indexOf("rd:") == 0) {
        //Have a valid rd: protocol link.
        href = href.split(":");
        var protocol = href[1];

        //Strip off rd: and protocol: for the final
        //value to pass to protocol handler.
        href.splice(0, 2);
        var value = href.join(":");
        
        dojo.stopEvent(evt);

        this.routeProtocol(protocol, value);
      }
    }
  },
  
  routeProtocol: function(/*String*/protocol, /*String*/value) {
    //summary: Handles loading of the protocols and routing the call to the right handler.
    //Fetch the protocols
    if (!this.protocols) {
      this.protocols = {};
      couch.db("extensions").view("all/protocol", {
        include_docs: true,
        group : false,
        success: dojo.hitch(this, function(json) {
          dojo.forEach(json.rows, function(row) {
            var val = row.value;
            this.protocols[val.protocol] = {
              handler: val.handler
            };
          }, this);
          this.callProtocol(protocol, value);
        })
      });
    } else {
      this.callProtocol(protocol, value);
    }
  },

  callProtocol: function(/*String*/protocol, /*String*/value) {
    //summary: Choose the right protocol extension to process the value.
    protocol = this.protocols[protocol];
    if (protocol) {
      //Get the module to load. Assumption is anything but the last .part
      //is the module name. The last .part is the method to call on the module.
      var module = protocol.handler.split(".");
      module.pop();

      //Dynamically load protocol handler on demand. If already loaded,
      //the code in the dojo.addOnLoad will execute immediately.
      dojo["require"](module.join("."));
      dojo.addOnLoad(function() {
        var handler = dojo.getObject(protocol.handler);
        if (handler) {
          handler(value);
        }
      });
    }
  }
});

dojo.addOnLoad(function(){
  //Register an onclick handler on the body to handle "#rd:" protocol URLs.
  dojo.connect(document.documentElement, "onclick", rd, "onDocClick");
});


}}});
