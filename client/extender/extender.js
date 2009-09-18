dojo.provide("extender");

dojo.require("rdw.Loading");
dojo.require("extender.Wizard");
dojo.require("rd.onHashChange");
dojo.require("extender.Editor");

rd.sub("rd-protocol-extenderClose", function() {
  window.close();
});
