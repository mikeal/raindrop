dojo.provide("rdw.ext.feedNotification.ext");

dojo.require("rdw.Stories");
dojo.require("rdw.ext.feedNotification.Group");

//Modify rdw.Stories to allow showing mailing lists.
rd.applyExtension("rdw.ext.feedNotification.ext", "rdw.Stories", {
  addToPrototype: {
    homeGroups: [
      "rdw.ext.feedNotification.Group"
    ]
  }
});
