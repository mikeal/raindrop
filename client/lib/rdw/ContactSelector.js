dojo.provide("rdw.ContactSelector");

dojo.require("dojo.string");

dojo.require("rd.contact");

dojo.declare("rdw.ContactSelector", [rdw._Base], {
  templateString: '<div class="rdwContactSelector" dojoAttachEvent="onclick: onClick"><ul dojoAttachPoint="listNode"></ul></div>',

  addTemplate: '<li class="add"><a href=#rdw.ContactSelector:add><span class="name">${i18n.add}</span></a></li>',

  contactTemplate: '<li class="${extraClass}"><a href=#rdw.ContactSelector:${contactId}><img src=${imgUrl}> <span class="name">${name}</span></a></li>',

  //The JS object that controls this ContactSelector instance.
  //ContactSelector will notify the controller via
  //controller.onContactSelected(/*String*/contactId) when a contact
  //is selected. If there is no controller, then an topic will be published.
  controller: null,

  //Array of preferred contacts to show.
  preferred: null,

  blankImgUrl: dojo.moduleUrl("rdw.resources", "blank.png"),

  postCreate: function() {
    //summary: dijit lifecycle method, called after template is inserted in DOM.
    this.inherited("postCreate", arguments);
    this.update();
  },

  onNewContactKeyPress: function(/*Event*/evt) {
    //summary: handles key presses in the new contact area so if Enter is
    //chosen, the name is grabbed and submitted.
    if (evt.keyCode == dojo.keys.ENTER) {
      var name = dojo.trim(evt.target.value);

      if (this.controller && this.controller.onContactSelected) {
        this.controller.onContactSelected({name: name});
      } else {
        rd.pub("rdw.ContactSelector-selected", {name: name});
      }

      dojo.stopEvent(evt);
    }
  },

  onNewContactClick: function(/*Event*/evt) {
    //summary: clicks on the text box should not bubble out so we can keep
    //the menu up.
    evt.stopPropagation();
  },

  update: function(/*String?*/suggestedAddName, /*Array?*/preferred) {
    //summary: updates the display of the contacts.
    this.suggestedAddName = suggestedAddName;
    this.preferred = preferred;

    //Generate the contacts html, starting with the preferred list.
    //Keep a hashmap of the preferred ids, to make weeding them out of the full
    //list easier.
    var prefIds = {};
    var html = '';
    
    if (this.suggestedAddName) {
      html += dojo.string.substitute(this.addTemplate, {
        name: rd.escapeHtml(this.suggestedAddName),
        i18n: this.i18n
      });
    }

    if (this.preferred) {
      for(var i = 0, contact; contact = this.preferred[i]; i++) {
        //Only include contacts with names.
        if (contact.name) {
          var contactId = contact.rd_key[1];
          html += dojo.string.substitute(this.contactTemplate, {
            contactId: contactId,
            imgUrl: contact.image || this.blankImgUrl,
            name: contact.name,
            extraClass: "preferred"
          });
          prefIds[contactId] = 1;
        }
      }
    }

    //Generate html for the rest of the contacts.
    rd.contact.list(dojo.hitch(this, function(contacts) {
      for(var i = 0, contact; contact = contacts[i]; i++) {
        //Only include contacts with names.
        if (contact.name) {
          var contactId = contact.rd_key[1];
          if (!prefIds[contactId]) {
            html += dojo.string.substitute(this.contactTemplate, {
              contactId: contactId,
              imgUrl: contact.image || this.blankImgUrl,
              name: contact.name,
              extraClass: ""
            });
          }
        }
      }

      if (html) {
        dojo.place(html, this.listNode, "only");
      }
    }));
  },

  onClick: function(/*Event*/evt) {
    //summary: handles clicks on contacts.

    //See if we have an href. If not on immediate element, try one level
    //above, in case target was an image or span.
    var href = evt.target.href;
    if (!href) {
      href = evt.target.parentNode.href;
    }

    if (href && (href = href.split("#")[1])) {
      if (href.indexOf("rdw.ContactSelector:") == 0) {
        //Pull out contactId, it may be just an add new contact
        //request, so construct contact data appropriately.
        var contactId = href.split(":")[1];
        if (contactId == "add") {
          var contact = {name: this.suggestedAddName};
        } else {
          contact = {contactId: contactId};
        }

        //Notify controller or broadcast selection.
        if (this.controller && this.controller.onContactSelected) {
          this.controller.onContactSelected(contact);
        } else {
          rd.pub("rdw.ContactSelector-selected", contact);
        }
        evt.preventDefault();
      } else {
        //Did not click on an interesting link. Stop the event
        //to make sure things like dropdowns do not close.
        dojo.stopEvent(evt);
      }
    }
  },

  clear: function() {
    //summary: clears out the contact HTML so this has less impact on the DOM.
    this.listNode.innerHTML = "";
  }
});
