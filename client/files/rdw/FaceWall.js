dojo.provide("rdw.FaceWall");

dojo.require("rdw._Base");
dojo.require("dojo.string");
dojo.require("rd.identity");

dojo.declare("rdw.FaceWall", [rdw._Base], {
  //Max number of faces to show.
  count: 30,

  templateString: '<ul class="FaceWall"></ul>',

  faceTemplateString: '<li class="identity"><a href="${url}" title="${title}"><img src="${imgUrl}"></a></li>',

  postCreate: function() {
    //summary: dijit lifecycle method

    rd.identity.all("twitter", dojo.hitch(this, function(/*Object*/users){
        var html = ""; 
        var count = 0;

        for (var id in users) {
          var doc = users[id];
          if (typeof id == "string" && doc.image) {
            //Generate HTML for user
            html += dojo.string.substitute(this.faceTemplateString, {
              url: "#rd:" + doc.identity_id[0] + ":" + doc.identity_id[1],
              title: rd.escapeHtml(doc.name),
              imgUrl: doc.image
            });

            if ((count += 1) == this.count) {
              break;
            }
          }
        }

        if(html){
          dojo.place(html, this.domNode);
        }
    }));
  }
});
