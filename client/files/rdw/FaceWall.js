dojo.provide("rdw.FaceWall");

dojo.require("rdw._Base");
dojo.require("dojo.string");

dojo.declare("rdw.FaceWall", [rdw._Base], {
  //Warning: this is a prototype property: be sure to
  //set it per instance.
  docs: [],

  templateString: '<ul class="FaceWall"></ul>',

  faceTemplateString: '<li class="identity"><a href="${url}" title="${title}"><img src="${imgUrl}"></a></li>',

  postCreate: function() {
    //summary: dijit lifecycle method
    couch.db("raindrop").view("raindrop!identities!by/_view/by_image", {
      limit: 30,
      include_docs: true,
      success: dojo.hitch(this, function(json) {
        //Grab the docs from the returned rows.
        var html = "";
        this.docs = rd.map(json.rows, dojo.hitch(this, function(row) {
          var doc = row.doc;
          
          html += dojo.string.substitute(this.faceTemplateString, {
            url: "#rd:" + doc.identity_id[0] + ":" + doc.identity_id[1],
            title: rd.escapeHtml(doc.name),
            imgUrl: doc.image
          });
          
          return doc;
        }));

        dojo.place(html, this.domNode);
      })
    });

  }
});
