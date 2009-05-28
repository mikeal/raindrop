var ContactCompleter = {
  type: "contact",
  complete: function(aAutocomplete, aText) {
    console.log("Contact completer firing on", aText);
    Gloda.dbContacts.view("raindrop!contacts!all/by_suffix", {
      startkey: aText,
      endkey: aText + "\u9999",
      include_docs: true,
      limit: 10,
      success: function(result) {
        var seen = {};
        var nodes = [];
        result.rows.forEach(function (row) {
          if (!(row.id in seen)) {
            var node = $("<div/>").addClass("auco_contact")[0];
            ElementXBL.prototype.addBinding.call(node, "autocomplete.xml#contact-completion");
            node.setContact(row.doc);
            nodes.push(node);

            seen[row.id] = true;
          }
        });
        console.log("Want to tell dude about:", aAutocomplete);
        aAutocomplete.haveSomeResults(aText, nodes, ContactCompleter, 1);
      }
    });
  }
};

var TagCompleter = {
  type: "tag",
  complete: function(aAutocomplete, aText) {
    console.log("Tag completer firing on", aText);
    Gloda.dbMessages.view("raindrop!content!all/megaview", {
      group: true,
      startkey: ['rd.tags', 'tags']
      endkey: ['rd.tags', 'tags', {}]
      success: function(result) {
        var nodes = [];
        if (result.rows.length==0) {
          console.log("Tag completer can't see any tags starting with", aText);
          return;
        }
        console.log("Tag completer got", result.rows.length, "tags");
        result.rows.forEach(function (row) {
          var node = $("<div/>")[0];
          ElementXBL.prototype.addBinding.call(node, "autocomplete.xml#tag-completion");
          node.setTagName(row['key'][2]);
          nodes.push(node);
        });
        aAutocomplete.haveSomeResults(aText, nodes, TagCompleter, 100);
      }
    });
  }
};
