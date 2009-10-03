dojo.provide("rdw.ext.twitterNotification.ext");

dojo.require("rdw.Stories");
dojo.require("rdw.ext.twitterNotification.Group");

//Modify rdw.Stories to allow showing mailing lists.
rd.applyExtension("rdw.ext.twitterNotification.ext", "rdw.Stories", {
  addToPrototype: {
    homeGroups: [
      "rdw.ext.twitterNotification.Group"
    ]
  }
});
