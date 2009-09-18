dojo.provide("extender.util");

extender.util.opener = function() {
  //summary: tries to find the app that called this extender.
  //TODO: need to make this more extensible for other raindrop apps.
  return window.open(null, "raindrop");
}
