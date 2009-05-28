dojo.provide("rdw.ext.youTubeMessage");

dojo.require("rd.message");
dojo.require("rdw.Message");

/*
Applies a data extension to rd.message
and a display extension to rdw.Message.
Allows showing youtube videos inline with
a message.
*/

rd.applyExtension("rd.message", {
  after: {
    onMessageLoaded: function(/*Object*/messageBag) {
      //summary: add in data about a youtube link if one is
      //found in the message body.
      var body = messageBag["rd.msg.body"].body;
      if(!body) {
        return;
      }

      var youTubeMatch = body.match(/http:\/\/www.youtube.com\/watch\?v=(.+)/);
      if (youTubeMatch) {
        var videoId = youTubeMatch[1];
        messageBag["rdw/ext/youTubeMessage"] = {
          videoId: videoId
        };
      }
    }
  }
});

rd.applyExtension("rdw.Message", {
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

      //Make sure we have a video ID.
      var videoId = this.messageBag["rdw/ext/youTubeMessage"] && this.messageBag["rdw/ext/youTubeMessage"].videoId;
      if (!videoId) {
        return;
      }

      var obj = '<object width="425" height="344">' +
                '<param name="movie" value="http://www.youtube.com/v/' + videoId +
                '&color1=0xb1b1b1&color2=0xcfcfcf&feature=player_embedded&fs=1"></param>' +
                '<param name="allowFullScreen" value="true"></param>' +
                '<embed src="http://www.youtube.com/v/' + videoId + 
                '&color1=0xb1b1b1&color2=0xcfcfcf&feature=player_embedded&fs=1" ' +
                'type="application/x-shockwave-flash" allowfullscreen="true" ' +
                'width="425" height="344"></embed></object>';

      //Create a node to hold the you tube object.
      var youTubeNode = dojo.create("div", {
        "class": "youTube",
        innerHTML: obj
      });

      //Attach the you tube HTML to the message.
      dojo.query(".message", this.domNode).addContent(youTubeNode);
    }
  }
});

rd.addStyle("rdw.ext.css.youTubeMessage");
