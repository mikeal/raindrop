dojo.provide("rdw.ContactList");

dojo.require("dojo.dnd.Source");
dojo.require("dojo.string");

dojo.require("rd.contact");

dojo.declare("rdw.ContactList", [rdw._Base], {
  //Array of contacts to show.
  //Warning: this is a prototype property,
  //be sure to always set it on the instance.
  contacts: [],

  templateString: '<ul class="ContactList"></ul>',

  contactTemplate: '<li class="dojoDndItem contact" data-contactId="${contactId}" dndType="contact">'
                 + '  <div class="photoSection"><img class="photo" src="${imageUrl}" /></div>'
                 + '  <div class="contactDetails">${name} ${identityHtml}</div>'
                 + '</li>',

  identityTemplate: '<li class="identity">'
                  + '  <div class="photoSection"><img class="photo" src="${imageUrl}" /></div>'
                  + '  <ul class="identityDetails">'
                  + '    <li class="name">${name}</li>'
                  + '    <li class="service ${serviceClass}">${service}: ${serviceName}</li>'
                  + '  </ul>'
                  + '</li>',

  blankImgUrl: dojo.moduleUrl("rdw.resources", "blank.png"),

  postCreate: function() {
    //summary: dijit lifecycle method.
    this._subs = [
      rd.sub("rd-protocol-contacts", dojo.hitch(this, "fetchContacts"))
    ];
  },

  fetchContacts: function() {
    //summary: calls data API to get the list of contacts and
    //calls update.
    rd.contact.list(dojo.hitch(this, function(contacts) {
      this.updateContacts(contacts);
    }));
  },

  updateContacts: function(/*Array*/contacts) {
    //summary: what it says on the tin. updates the display of contacts.

    this.contacts = contacts;

    //Sort the contacts.
    //TODO: make this more intelligent.
    this.contacts.sort(function(a, b) {
      return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
    });

    var html = "";
    for (var i = 0, contact; contact = this.contacts[i]; i++) {
      var idtys = contact.identities;
      if (!idtys) {
        continue;
      }

      //Sort the identities.
      idtys.sort(function(a, b) {
        return a.rd_key[1][0] > b.rd_key[1][0] ? 1 : -1;
      });

      //Build HTML for identities.
      var idtyHtml = '<ul class="identities">';
      for (var j = 0, idty; idty = idtys[j]; j++) {
        var name = idty.name, service = "", serviceName = "", serviceClass = "hidden";
        
        //For URL identities, the info is very redundant, so
        //skip the extra info for URL identities.
        if (idty.rd_key[1][0] != "url") {
          service = rd.escapeHtml(idty.rd_key[1][0] || "");
          serviceName = rd.escapeHtml(idty.rd_key[1][1] || "");
          serviceClass = "";
        }

        //Generate the HTML for the identity.
        idtyHtml += dojo.string.substitute(this.identityTemplate, {
          imageUrl: idty.image || this.blankImgUrl,
          name: rd.escapeHtml(idty.name || ""),
          service: service,
          serviceName: serviceName,
          serviceClass: serviceClass
        });
      }
      idtyHtml += '</ul>';

      //Build HTML for all the contacts.
      html += dojo.string.substitute(this.contactTemplate, {
        contactId: contact.rd_key[1],
        imageUrl: contact.image || this.blankImgUrl,
        name: rd.escapeHtml(contact.name),
        identityHtml: idtyHtml
      });
    }

    //Insert the HTML
    dojo.place(html, this.domNode, "only");

    //Make sure we are at the top of the contact list.
    dijit.scrollIntoView(this.domNode);

    //Wire up the DnD sources
    this.dndSources = [];
    this.dndSources.push(new dojo.dnd.Source(this.domNode, {accept: ["contact"]}));

    dojo.query(".contact", this.domNode).forEach(function(node) {
      this.dndSources.push(new dojo.dnd.Source(node, {accept: ["contact"]}));
    }, this);
    
    //Listen to the dnd drop
    this._subs.push(rd.sub("/dnd/drop", this, "onDndDrop"));
  },

  onDndDrop: function(/*Object*/source, /*Array*/droppedNodes, /*Boolean*/copy, /*Object*/target) {
    //Handles DND drops. Just a quick and dirty way to do contact merging.
    var sourceNode = droppedNodes[0];
    var targetNode = target.node;
    //debugger;

    var sourceContactId = dojo.attr(sourceNode, "data-contactId");
    var targetContactId = dojo.attr(targetNode, "data-contactId");

    if (sourceContactId && targetContactId) {
      rd.contact.merge(sourceContactId, targetContactId, function() {
        rd.publish("rd-protocol-contacts");
      });

      //Update the display for now. A bit hacky, not very
      //nice. TODO: make it better.
      this.domNode.innerHTML = "Merging contacts...";
    }
  },

  destroy: function() {
    //summary: dijit lifecycle method.

    //Be sure to destroy the DnD handles.
    for (var i = 0, source; source = this.dndSources[i]; i++) {
      source.destroy();
    }

    //unsubscribe.
    for (var i = 0, sub; sub = this._subs[i]; i++) {
      rd.unsub(sub);
    }

    this.inherited("destroy", arguments);
  }
});
