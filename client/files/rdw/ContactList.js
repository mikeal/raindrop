dojo.provide("rdw.ContactList");

dojo.require("rd.contact");
dojo.require("dojo.string");

dojo.declare("rdw.ContactList", [rdw._Base], {
  //Array of contacts to show.
  //Warning: this is a prototype property,
  //be sure to always set it on the instance.
  contacts: [],

  templateString: '<ul class="ContactList"></ul>',

  contactTemplate: '<li>${name} ${identityHtml}</li>',
  identityTemplate: '<li></li>',

  postCreate: function() {
    //summary: dijit lifecycle method.

    //Sort the contacts.
    //TODO: make this more intelligent.
    this.contacts.sort();

    var html = "";
    for (var i = 0, contact; contact = this.contacts[i]; i++) {
      var idtys = contact.identities;
      if (!idtys) {
        continue;
      }

      //Sort the identities.
      idtys.sort();

      //Build HTML for identities.
      var idtyHtml = '';
      for (var j = 0, idty; idty = idtys[j]; j++) {
        idtyHtml += this.objectToHtml(idty);
      }

      //Build HTML for all the contacts.
      html += dojo.string.substitute(this.contactTemplate, {
        name: rd.escapeHtml(contact.name),
        identityHtml: idtyHtml
      });
    }

    dojo.place(html, this.domNode, "only");
  },

  objectToHtml: function(/*Object*/obj) {
    //summary: converts a JavaScript object of name value
    //pairs to an HTML structure.
    var keys = [];
    var empty = {};
    for (var prop in obj) {
      //Skip properties injected by Object.prototype
      //corruption or private properties.
      if(!(prop in empty) && prop.charAt(0) != "_") {
        keys.push(prop);
      }
    }

    keys.sort();

    //Make the HTML.
    var html = '<ol>';
    for (var i = 0, key; key = keys[i]; i++) {
      var value = obj[key];
      if (value.toString) {
        value = value.toString();
      }

      html += '<li><span class="name">'
            + rd.escapeHtml(key)
            + '</span><span class="value">'
            + rd.escapeHtml(value)
            + '</span></li>'
    }
    html += '</ol>';
    
    return html;
  }
});
