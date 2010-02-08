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

/*jslint plusplus: false, nomen: false */
/*global require: false, console:false */
"use strict";

require.modify("rdw/Message", "rdw/ext/youTubeMessage-rdw/Message",
["rd", "dojo", "rd/schema", "rdw/Message", "dojo/fx"], function (
  rd,   dojo,   rdSchema,    Message,       fx) {

    rd.addStyle("rdw/ext/css/youTubeMessage");

    //Applies a display extension to rdw/Message. Allows showing youtube videos
    //inline with a message.
    rd.applyExtension("rdw/ext/youTubeMessage", "rdw/Message", {
        addToPrototype: {
            linkHandlers: [
                function (link) {
                    //if msg has youtube data, add a
                    //display item for the data.
                    //TODO: could vary the display based on how the
                    //message is displayed. I would expect rdw/Message
                    //to have a "type" field to indicate what type of
                    //display rdw/Message would use for the message,
                    //or a different widget would be used for the display.

                    //NOTE: the "this" in this function is the instance of rdw/Message.

                    //Check for a YouTube video
                    var yt = rdSchema.getMsgMultipleMatch(this.msg, "rd.msg.body.youtubed", "ref_link", link.url),
                        thumbnail = "", thumb, url, youTubeImgTemplateString, img,
                        title, youTubeInfoTemplateString, thumbs, i;
                    if (!yt) {
                        return false;
                    }

                    thumbs = yt.media$group.media$thumbnail;

                    //ugh, would have been nicer if I stored the thumbnails better
                    for (i = 0; (thumb = thumbs[i]); i++) {
                        url = thumb.url;
                        //we're looking for thumbnail #1
                        if (url.substring(url.length - 5) === "1.jpg") {
                            thumbnail = url;
                            break;
                        }
                    }
    
                    youTubeImgTemplateString = '<div class="thumbnail"><a href="${url}">' +
                                                   '<img src="${thumb}" class="thumbnail"/></a>' +
                                                   '<div class="play"></div></div>';
    
                    img = rd.template(youTubeImgTemplateString, {
                        url: yt.media$group.media$player.url,
                        thumb: thumbnail
                    });

                    youTubeInfoTemplateString = '<div class="info"><a href="${url}" class="title">${body}</a>' +
                                                '<div class="views">${viewCount} views</div></div>';
    
                    title = rd.template(youTubeInfoTemplateString, {
                        url: yt.media$group.media$player.url,
                        body: yt.media$group.media$title.$t,
                        viewCount: Number(yt.yt$statistics.viewCount).toLocaleString()
                    });

                    this.addAttachment('<div class="youTube video hbox" data-dclick="onYouTubeClick">' + img + title + '</div>', "video");

                    return true;
                }
            ],

            // Handles clicking anywhere on the youtube attachment block

            onYouTubeClick: function (evt) {
                var yt = this.msg.schemas["rd.msg.body.youtubed"], videoId, q,
                    videoUrl, content, objTemplateString, obj, player;
                if (!yt) {
                    return;
                }

                videoId = yt.media$group.yt$videoid.$t;
                //only grab this video inside this message, it's possible there are others
                q = dojo.query("#youtube-" + videoId, this.domNode);
                if (q.length > 0) {
                    fx.wipeOut({
                        node: q[0],
                        duration: 300
                    }).play();
                    q.orphan();
                } else {
                    videoUrl = "";
                    for (content in yt.media$group.media$content) {
                        if (yt.media$group.media$content[content].type === "application/x-shockwave-flash") {
                            videoUrl = yt.media$group.media$content[content].url;
                        }
                    }

                    objTemplateString = '<object width="425" height="344">' +
                                        '<param name="movie" value="${url}"></param>' +
                                        '<param name="allowFullScreen" value="true"></param>' +
                                        '<embed src="${url}" ' +
                                        'type="application/x-shockwave-flash" allowfullscreen="true" ' +
                                        'width="425" height="344"></embed></object>';

                    obj = rd.template(objTemplateString, {
                        url: videoUrl
                    });

                    //XXX The videoId is necessarily going to be unique in this page
                    player = dojo.create("div", {
                        "class": "player",
                        "id" : "youtube-" + videoId,
                        "style" : "display: none;",
                        innerHTML: obj
                    });

                    dojo.query(evt.target).parents(".youTube").addContent(player);
    
                    fx.wipeIn({
                        node: player,
                        duration: 300
                    }).play();
                }
                dojo.stopEvent(evt);
            }
        }
    });
});

