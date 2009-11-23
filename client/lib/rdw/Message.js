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

dojo.provide("rdw.Message");

dojo.require("rdw._Base");
dojo.require("rd.friendly");
dojo.require("rd.hyperlink");
dojo.require("rd.api");

dojo.declare("rdw.Message", [rdw._Base], {
  //Suggested values for type are "topic" and "reply"
  type: "topic",

  //Allows the message to have focus.
  tabIndex: 0,

  //Holds the aggregated message object.
  //Warning: this is a prototype property: be sure to
  //set it per instance.
  msg: null,

  templateString: dojo.cache("rdw.templates", "Message.html"),

  //The link for the expanding to full conversation.
  expandLink: "",

  postMixInProperties: function() {
    //summary: dijit lifecycle method
    this.inherited("postMixInProperties", arguments);

    //Set the properties for this widget based on msg
    //properties.
    var schemas = this.msg.schemas;
    var msgDoc = schemas['rd.msg.body'];

    this.fromId = (msgDoc.from && msgDoc.from[1]) || "";
    this.fromName = msgDoc.from_display || this.fromId;
    this.subject = rd.hyperlink.add(rd.escapeHtml(msgDoc.subject || ""));

    //TODO: make message transforms extensionized.
    this.message = rd.hyperlink.add(rd.escapeHtml(msgDoc.body_preview));

    this.time = msgDoc.timestamp;

    /* XXX this timestamp needs a lot more thought to show the right kind of 
       time info and we probably also want to some standard the hCard formatting */
    var fTime = rd.friendly.timestamp(msgDoc.timestamp);
    this.utcTime = fTime["utc"];
    this.localeTime = fTime["locale"];
    this.friendlyTime = fTime["friendly"];
    this.additionalTime = fTime["additional"];

    //Determine if the sender is known and switch templates if necessary.
    var known = !!schemas["rd.msg.ui.known"];
    if (!known && this.fromNode) {
      //This identity is unknown. Try to make a suggestion for who it might be.
      dojo.addClass(this.fromNode, "unknown");
    }

    //Set up the link for the full conversation view action, and set the subject.
    var convoId = schemas
                && schemas["rd.msg.conversation"]
                && schemas["rd.msg.conversation"].conversation_id;
    if (convoId) {
      this.expandLink = "rd:conversation:" + convoId;
      convoId = "#rd:conversation:" + convoId;
    }
  },

  postCreate: function() {
    //summary: dijit lifecycle method
    this.inherited("postCreate", arguments);
  },

  onClick: function(evt) {
    //summary: handles clicks. Uses event
    //delegation to publish the right action.
    var target = evt.target;
    var href = target.href;
    if (href && (href = href.split("#")[1])) {
      if (href == "quote") {
        if (dojo.hasClass(target, "collapsed")) {
          rd.escapeHtml(this.i18n.hideQuotedText, target, "only");
          dojo.query(target).next(".quote").style({
            display: "block"
          });
          dojo.removeClass(target, "collapsed");
        } else {
          rd.escapeHtml(this.i18n.showQuotedText, target, "only");
          dojo.query(target).next(".quote").style({
            display: "none"
          });
          dojo.addClass(target, "collapsed");          
        }
        dojo.stopEvent(evt);
      }
    }
  },

  formatQuotedBody: function() {
    //Looks at the rd.msg.body.quoted schema for quoted blocks and formats them.
    //If no rd.msg.body.quoted exists, the message body will be used.
    var quoted = this.msg.schemas["rd.msg.body.quoted"];
    
    //No quoted, fallback to body text.
    if (!quoted) {
      var text = this.prepBodyPart(this.msg.schemas["rd.msg.body"].body);
    } else {
      var parts = quoted.parts || [];
      text = "";
      for (var i = 0, part; part = parts[i]; i++) {
        if (part.type == "quote") {
          //Add in a collapsible wrapper around the text.
          //The awkward use of single quotes for attributes is to
          //get around encoding issue with dijit.
          text += "<a href='#quote' class='quoteToggle collapsed'>" + this.i18n.showQuotedText + "</a>"
               + "<div class='quote' style='display: none'>"
               + this.prepBodyPart(part.text)
               + "</div>";
        } else {
          text += this.prepBodyPart(part.text);
        }
      }
    }

    return text;
  },

  prepBodyPart: function(/*String*/text) {
    //summary: does final formatting of a body part for display, HTML sanitation/transforms.
    //TODO: make this extensible, or pull out hyperlinking as an extension?
    return rd.hyperlink.add(rd.escapeHtml(text).replace(/\n/g, "<br>"));
  }
});
