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

    rd.identity.byImage(dojo.hitch(this, function(/*Array*/identityIds){
      //First, get the identityIds for the max count of people we want to show.
      var ids = [];
      for (var i = 0, idtyId; (idtyId = identityIds[i]) && (i < this.count); i++) {
        ids.push(idtyId);
      }

      rd.contact.byIdentity(ids, dojo.hitch(this, function(contacts) {
        var html = ""; 
        var count = 0;

        if (contacts) {
          for (var i = 0, contact; contact = contacts[i]; i++) {
            //TODO: may not have enough contacts with an image.
            //Find image for the contact.
            var imageUrl = null;
            for (var j = 0, idty; idty = contact.identities[j]; j++) {
              if (idty.image) {
                imageUrl = idty.image;
                break;
              }
            }
  
            //Generate the HTML for this contact. Skip contacts without
            //and image.
            if (imageUrl) {
              html += dojo.string.substitute(this.faceTemplateString, {
                url: "#rd:contact:" + contact.contact_id,
                title: rd.escapeHtml(contact.name),
                imgUrl: imageUrl
              });
            }
          }
  
          if(html){
            dojo.place(html, this.domNode);
          }
        }
      }), function(err){ console.log(err) })
    }));
  }
});
