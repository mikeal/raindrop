var ContactCompleter = {
  type: "contact",
  complete: function(aAutocomplete, aText) {
    console.log("Contact completer firing on", aText);
    Gloda.dbContacts.view("contact_ids/by_suffix", {
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
    Gloda.dbMessages.view("tags/all_tags", {
      success: function(result) {
        var tagNames = result.rows[0].value;
        console.log("Tag completer got tag names:", tagNames);
        var nodes = [];
        var textLength = aText.length;
        tagNames.forEach(function (tagName) {
          if (tagName.substring(0, textLength) == aText) {
            var node = $("<div/>")[0];
            ElementXBL.prototype.addBinding.call(node, "autocomplete.xml#tag-completion");
            node.setTagName(tagName);
            nodes.push(node);
          }
        });
        aAutocomplete.haveSomeResults(aText, nodes, TagCompleter, 100);
      }
    });
  }
};
