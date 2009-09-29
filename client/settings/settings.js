dojo.provide("settings");

dojo.require("settings.Account");
dojo.require("rd.api");

dojo.addOnLoad(function() {
  var allowed = [
    "gmail",
    "twitter"
  ];

  //Fetch all accounts and create widgets, but only for the allowed types.
  rd.api().megaview({
    key: ["rd.core.content", "schema_id", "rd.account"],
    reduce: false,
    include_docs: true
  })
  .ok(function(json) {
    var settingsNode = dojo.byId("settings");
    
    //Build up a set of kind to doc mappings.
    var kindMap = {};
    for (var i = 0, row, doc; (row = json.rows[i]) && (doc = row.doc); i++) {
      if (doc.kind) {
        kindMap[doc.kind] = doc;
      }
    }
    
    //Build a list of widgets for the allowed set, using documents if they exist
    //to populate them.
    for (var i = 0, svc; svc = allowed[i]; i++) {
      var doc = kindMap[svc] || {
        kind: svc
      };

      new settings.Account({
        doc: doc
      }, dojo.create("div", null, settingsNode));
    }
    
  })
});