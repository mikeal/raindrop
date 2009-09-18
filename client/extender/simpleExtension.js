dojo.provide("ext.linkIndex");
dojo.require("rdw.Message");

rd.applyExtension("ext.linkIndex", "rdw.Message", {
  after: {
    postCreate: function() {
      if (this.messageBag["rd.msg.email.mailing-list"]) {
        return;
      }

      var schema = this.messageBag["rd.msg.body.quoted.hyperlinks"];
      var links = schema && schema.links;
      if (!links) {
        return;
      }

      links = dojo.map(links, function(link) {
        return rd.template(
          '<li><a target="_blank" href="${url}">${url}</a></li>',
          { url: link }
        );
      });

      $(this.domNode).append('<ul class="linkIndex">' + links.join('') + '</ul>');
    }
  }
});
