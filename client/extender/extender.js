dojo.provide("extender");

dojo.require("rdw.Loading");
dojo.require("extender.Wizard");
dojo.require("rd.onHashChange");

rd.sub("rd-protocol-extenderClose", function() {
  window.close();
});
