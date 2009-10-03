dojo.provide("rdw.ext.TwitterMessage");

dojo.require("rdw.Message");
dojo.require("rd.hyperlink");

/*
  Treat the Twitter messages differently than Email
*/

rd.applyExtension("rdw.ext.TwitterMessage", "rdw.Message", {
  after: {
    postMixInProperties: function() {
      var body = this.messageBag['rd.msg.body'];
      if(body.from && body.from[0] == "twitter") {
        this.message = rd.hyperlink.addTwitterUsers(this.message);
        this.message = rd.hyperlink.addTwitterTags(this.message);
      }
    }
  }
});

rd.addStyle("rdw.ext.css.TwitterMessage");
