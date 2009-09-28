dojo.provide("ext.linkIndex");
dojo.require("rdw.Message");

rd.applyExtension("ext.linkIndex", "rdw.Message", {
  after: {
    postCreate: function() {
      var schema = this.messageBag["rd.msg.body.quoted.hyperlinks"];
      var links = schema && schema.links;
      if (!links) {
        return;
      }

      links = dojo.map(links, function(link) {
        return rd.template(
          '<li><a href="${url}">${url}</a></li>',
          { url: link }
        );
      });

      $(this.domNode)
        .append('<ul class="linkIndex">' + links.join('') + '</ul>')
        .find(".linkIndex")
        .css({
          paddingBottom: "8px",
          listStyle: "none",
          fontSize: "small"
        })
        .find("a")
        .css({
          color: "#1a1a1a",
          opacity: 0.5,
          textDecoration: "none"
        });
    }
  }
});
