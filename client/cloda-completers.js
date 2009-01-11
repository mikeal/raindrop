var ContactCompleter = {
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
        aAutocomplete.haveSomeResults(aText, nodes);
      }
    });
  }
};