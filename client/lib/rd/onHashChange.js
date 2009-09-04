dojo.provide("rd.onHashChange");

//Simple utility that watches for hash changes and then publishes changes.

;(function(){
  var value = location.href.split("#")[1] || "";
  var interval = setInterval(function(){
    var newValue = location.href.split("#")[1] || "";
    if (newValue != value) {
      value = newValue;
      //Use a set timeout so an error on a subscriber does
      //not stop the polling.
      setTimeout(function() {
        dojo.publish("rd.onHashChange", [value]);
      }, 10);
    }
  }, 300);
})();
