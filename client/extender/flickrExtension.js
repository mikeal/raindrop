dojo.provide("ext.flickrIndex");

dojo.require("rdw.Message");
dojo.require("dojo.io.script");

rd.applyExtension("ext.flickrIndex", "rdw.Message", {
  after: {
    postCreate: function() {
      var schema = this.messageBag["rd.msg.body.quoted.hyperlinks"];
      var links = schema && schema.links;
      if (!links) {
        return;
      }

      var flickrRegExp = /https?:\/\/[^\/]*flickr\.com\//;
      links = dojo.filter(links, function(link) {
        return flickrRegExp.test(link) ? link : null;
      });

      if (links.length) {
        var section = dojo.query(this.domNode)
                        .query(".content")
                          .after('<ul class="flickrIndex"></ul>')
                          .end()
                        .query(".flickrIndex");

        section.style({
          "MozBorderRadius": "5px",
          "WebkitBorderRadius": "5px",
          "backgroundColor": "#CCCCCC",
          "padding": "1ex"
        });

        var idRegExp = /\/(\d+)\//;

        dojo.map(links, function(link) {
          var id = idRegExp.exec(link);
          id  = id && id[1];
          if (id) {
            dojo.io.script.get({
              url: "http://api.flickr.com/services/rest/",
              content: {
                api_key: "002cc8ab023aea75b1fa37c31c75abe6",
                method: "flickr.photos.getSizes",
                photo_id: id,
                format: "json"
              },
              jsonp: "jsoncallback",
              load: function(json) {
                if (json.stat == "ok") {
                  var url = json.sizes.size[0].source;
                  section.append('<img src="' + url + '">');
                }
              }
            });
          }
        });
      }
    }
  }
});
