/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Raindrop.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Messaging, Inc..
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * */

dojo.provide("rdw.ext.MessageFlickrLinkAttachments");

dojo.require("rdw.Message");

/*
Applies a display extension to rdw.Message.
Allows showing links included in the message as inline attachments
*/

rd.applyExtension("rdw.ext.MessageFlickrLinkAttachments", "rdw.Message", {
  after: {
    postCreate: function() {
      //NOTE: the "this" in this function is the instance of rdw.Message.

      //Check for links found in a message
      var flickr_schema = this.msg.schemas["rd.msg.body.flickr"];
      if (!flickr_schema ) {
        return;
      }

      // http:\/\/farm3.static.flickr.com\/2684\/4252109194_ba795640e8_s.jpg
      img_src = "http://farm" + flickr_schema["farm"] + ".static.flickr.com/" +
                flickr_schema["server"] + "/" + flickr_schema["id"] + "_" +
                flickr_schema["secret"] + "_s.jpg";

      href = "href=\"http://www.flickr.com/" +
                flickr_schema["owner"]["nsid"] + "/" + flickr_schema["id"] + "/\""
      img = "<div class=\"thumbnail\"><a target=\"_blank\" " + href + "><img src=\""+
              img_src+"\" class=\"flickr\"/></a></div>";
      title = "<a target=\"_blank\" class=\"title\" " + href + "\">" +
                flickr_schema["title"]["_content"] + "</a>";
      owner = "<abbr class=\"owner\" title=\""+ flickr_schema["owner"]["username"] +
                "\">" + flickr_schema["owner"]["realname"] + "</abbr>";
      desc = "<div class=\"description\">" + flickr_schema["description"]["_content"] + "</div>";

      //Create a node to hold the link object
      var linkNode = dojo.create("div", {
        "class": "flickr photo link",
        innerHTML: img + "<div class=\"information\">" + title + owner + desc + "</div>"
      });
      dojo.query(".message .attachments", this.domNode).addContent(linkNode);
      dojo.connect(linkNode, "onclick", this, "onMessageFlickrLinkAttachmentClick");

    }
  },
  addToPrototype: {
    onMessageFlickrLinkAttachmentClick: function(evt) {
      //summary: handles clicking anywhere on the link attachment block
      var link_schema = this.msg.schemas["rd.msg.body.flickr"];
      if (!link_schema ) {
        return;
      }
    }
  }
});

rd.addStyle("rdw.ext.css.MessageFlickrLinkAttachments");
