dojo.provide("rdw.Loading");
dojo.require("rdw._Base");

//Turn on io event publishing in dojo,
//if no specific preference has already been set.
if (!("ioPublish" in dojo.config)) {
  dojo.config.ioPublish = true;
}

//A widget that shows a loading indicator whenever there is an outstanding
//IO request.
dojo.declare("rdw.Loading", [rdw._Base], {
  templateString: '<div class="rdwLoading"></div>',

  postCreate: function() {
    //summary: dijit lifecycle method, after template is in the DOM.
    this.domNode.style.display = "none";
    this.startHandle = dojo.subscribe("/dojo/io/start", this, "ioStart");
    this.stopHandle = dojo.subscribe("/dojo/io/stop", this, "ioStop");
  },

  destroy: function() {
    //summary: dijit lifecycle method.
    dojo.unsubscribe(this.startHandle);
    dojo.unsubscribe(this.stopHandle);
    this.inherited("destroy", arguments);
  },

  ioStart: function() {
    //summary: triggered when there is at least one oustanding IO request.
    this.domNode.innerHTML = this.i18n.loading;
    this.domNode.style.display = "block";
  },

  ioStop: function() {
    //summary: triggered when all outstanding IO reqeusts stop.
    this.domNode.innerHTML = "";
    this.domNode.style.display = "none";
  }

});
