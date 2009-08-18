dojo.provide("rd.onHashChange");

//Simple utility that watches for hash changes and then publishes changes.

;(function(){
  var value = location.href.split("#")[1] || "";
  var interval = setInterval(function(){
    var newValue = location.href.split("#")[1] || "";
    if (newValue != value) {
      value = newValue;
      console.log("publising: " + value);
      dojo.publish("rd.onHashChange", [value]);
    }
  }, 300);
})();
