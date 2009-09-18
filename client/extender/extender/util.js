dojo.provide("extender.util");

extender.util.opener = function() {
  //summary: tries to find the opener. Can be tricky since multiple
  //tabs are allowed, and our immediate opener could have been closed.  
  var o = opener;
  while (o) {
    if (o.rd.appName != "extender") {
      return o;
    }
    o = o.opener;
  }
  return null; 
}
