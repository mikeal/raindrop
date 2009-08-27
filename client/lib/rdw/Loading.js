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
  templateString: '<div class="rdwLoading">${i18n.loading}</div>',

  postCreate: function() {
    //summary: dijit lifecycle method, after template is in the DOM.
    this.domNode.style.display = "none";
    this.subscribe("/dojo/io/start", "ioStart");
    this.subscribe("/dojo/io/send", "ioSend");
    this.subscribe("/dojo/io/stop", "ioStop");
  },

  destroy: function() {
    //summary: dijit lifecycle method.
    //if (this.ioSendHandle) {
    //  dojo.unsubscribe(this.ioSendHandle);
    //}
    this.inherited("destroy", arguments);
  },

  ioSend: function() {
    //summary: only listen to iosend in case this widget is instantiated after
    //io calls start.
    dojo.unsubscribe(this.ioSendHandle);
    this.ioSendHandle = null;
    this.ioStart();
  },

  ioStart: function() {
    //summary: triggered when there is at least one oustanding IO request.
    this.domNode.style.display = "";
  },

  ioStop: function() {
    //summary: triggered when all outstanding IO reqeusts stop.
    this.domNode.style.display = "none";
  }
});
