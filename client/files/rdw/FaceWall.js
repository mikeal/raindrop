dojo.provide("rdw.FaceWall");

dojo.require("rdw._Base");
dojo.require("dojo.string");
dojo.require("rd.contact");

dojo.declare("rdw.FaceWall", [rdw._Base], {
  //Max number of faces to show.
  count: 30,
  
  //Default image url. TODO, need a better one.
  defaultImageUrl: dojo.moduleUrl("rdw.resources", "blank.png"),

  templateString: '<ul class="FaceWall"></ul>',

  faceTemplateString: '<li class="identity"><a href="${url}" title="${title}"><img src="${imgUrl}"></a></li>',

  postCreate: function() {
    //summary: dijit lifecycle method

    rd.contact.list(dojo.hitch(this, function(/*Object*/contacts){
      //First, get the contactIds for the max count of people we want to show.
      var contactIds = [];
      for (var i = 0, contact; (contact = contacts[i]) && (i < this.count); i++) {
        contactIds.push(contact.contact_id);
      }

      //Now load all the contacts.
      rd.contact.get(contactIds, dojo.hitch(this, function(contacts) {
        var html = ""; 
        var count = 0;

        for (var i = 0, contact; contact = contacts[i]; i++) {
          //TODO: may not have enough contacts with an image.
          //Find image for the contact.
          var imageUrl = this.defaultImageUrl;
          for (var j = 0, idty; idty = contact.identities[j]; j++) {
            if (idty.image) {
              imageUrl = idty.image;
              break;
            }
          }

          //Generate the HTML for this contact.
          html += dojo.string.substitute(this.faceTemplateString, {
            url: "#rd:contact:" + contact.contact_id,
            title: rd.escapeHtml(contact.name),
            imgUrl: imageUrl
          });
        }

        if(html){
          dojo.place(html, this.domNode);
        }
      }), function(err){ console.log(err) })
    }));
  }
});
