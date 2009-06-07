dojo.provide("rdw.ext.youTubeMessage");

dojo.require("rd.message");
dojo.require("rdw.Message");
dojo.require("dojo.fx");

/*
Applies a ui extension to rd.message
and a display extension to rdw.Message.
Allows showing youtube videos inline with
a message.
*/

rd.applyExtension("rdw.ext.youTubeMessage", "rdw.Message", {
  after: {
    postCreate: function() {
      //summary: if messageBag has youtube data, add a
      //display item for the data.
      //TODO: could vary the display based on how the
      //message is displayed. I would expect rdw.Message
      //to have a "type" field to indicate what type of
      //display rdw.Message would use for the message,
      //or a different widget would be used for the display.
  
      //NOTE: the "this" in this function is the instance of rdw.Message.

      //Check for a YouTube video
      var yt = this.messageBag["rd.msg.body.youtubed"];
      if (!yt) {
        return;
      }

      /* ugh, would have been nicer if I stored the thumbnails better */
      var thumbnail = "";
      for ( var thumb in yt["media:thumbnail"] ) {
        var url = yt["media:thumbnail"][thumb]["url"];
        /* we're looking for thumbnail #1 */
        if ( url.substring(url.length - 5) == "1.jpg" ) {
          thumbnail = url;
          break;
        }
      }

      var youTubeImgTemplateString = '<div class="thumbnail"><a href="${url}">' +
                                     '<img src="${thumb}" class="thumbnail"/></a></div>';

      var img = dojo.string.substitute(youTubeImgTemplateString, {
        url: yt["media:player"]["url"],
        thumb: thumbnail
      });

      var youTubeInfoTemplateString = '<div class="info"><a href="${url}" class="title">${body}</a>' +
                                      '<div class="views">${viewCount} views</div></div>';

      var title = dojo.string.substitute(youTubeInfoTemplateString, {
        url: yt["media:player"]["url"],
        body: yt["media:title"]["body"],
        viewCount: new Number(yt["yt:statistics"]["viewCount"]).toLocaleString()
      });

      //Create a node to hold the youtube object.
      var youTubeNode = dojo.create("div", {
        "class": "youTube",
        "style" : "display: none;",
        innerHTML: img + title
      });

      //Attach the you tube HTML to the message.
      dojo.query(".message .content", this.domNode).addContent(youTubeNode);

      dojo.connect(youTubeNode, "onclick", this, "onYouTubeClick");

      dojo.fx.wipeIn({
        node: youTubeNode,
        duration: 300
      }).play(300);
    }
  },
  addToPrototype: {
    onYouTubeClick: function(evt) {
      //summary: handles clicking anywhere on the youtube attachment block
      var yt = this.messageBag["rd.msg.body.youtubed"];
      if (!yt) {
        return;
      }

      var videoId = yt["video_id"];
      /* only grab this video inside this message, it's possible there are others */
      var q = dojo.query("#" + videoId, this.domNode);
      console.log(q);
      if ( q.length > 0 ) {
        dojo.fx.wipeOut({
          node: q[0],
          duration: 300
        }).play();
        q.orphan();
      }
      else {
        var videoUrl = "";
        for ( var content in yt["media:content"] ) {
          if ( yt["media:content"][content]["type"] == "application/x-shockwave-flash" ) {
            videoUrl = yt["media:content"][content]["url"];
          }
        }

        var objTemplateString = '<object width="425" height="344">' +
                  '<param name="movie" value="${url}"></param>' +
                  '<param name="allowFullScreen" value="true"></param>' +
                  '<embed src="${url}" ' +
                  'type="application/x-shockwave-flash" allowfullscreen="true" ' +
                  'width="425" height="344"></embed></object>';

        var obj = dojo.string.substitute(objTemplateString, {
          url: videoUrl
        });

        /* XXX The videoId is necessarily going to be unique in this page */
        var player = dojo.create("div", {
          "class": "player",
          "id" : videoId,
          "style" : "display: none;",
          innerHTML: obj
        });

        dojo.query(".message > .content > .youTube", this.domNode).addContent(player);

        dojo.fx.wipeIn({
          node: player,
          duration: 300
        }).play();
      }
      dojo.stopEvent(evt);
    }
  }
});

rd.addStyle("rdw.ext.css.youTubeMessage");
