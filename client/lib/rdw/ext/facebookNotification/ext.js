dojo.provide("rdw.ext.facebookNotification.ext");

dojo.require("rdw.Stories");
dojo.require("rdw.ext.facebookNotification.Group");

//Modify rdw.Stories to allow showing mailing lists.
rd.applyExtension("rdw.ext.facebookNotification.ext", "rdw.Stories", {
  addToPrototype: {
    homeGroups: [
      "rdw.ext.facebookNotification.Group"
    ]
  }
});
