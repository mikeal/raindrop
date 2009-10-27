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
dojo.require("rd.contact");
dojo.require("rdw.gravatar");
dojo.require("rdw.contactDropDown");
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
  messageBag: {},

  templateString: dojo.cache("rdw.templates", "Message.html"),

  postMixInProperties: function() {
    //summary: dijit lifecycle method
    this.inherited("postMixInProperties", arguments);

    //Set the properties for this widget based on messageBag
    //properties.
    var msgBag = this.messageBag;
    var msgDoc = msgBag['rd.msg.body'];

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
    this.friendlyTime = fTime["friendly"];
    this.additionalTime = fTime["additional"];

    //Determine if the sender is known and switch templates if necessary.
    this.known = !!msgBag["rd.msg.ui.known"];
    
    //Set up the link for the full conversation view action
    var convoId = msgBag
                && msgBag["rd.msg.conversation"]
                && msgBag["rd.msg.conversation"].conversation_id;
    if (convoId) {
      this.expandLink = "rd:conversation:" + convoId;
    }
  },

  postCreate: function() {
    //summary: dijit lifecycle method
    this.inherited("postCreate", arguments);

    this.subscribe("rd-contact-updated", "onContactUpdated");

    if (!this.known) {
      //This identity is unknown. Try to make a suggestion for
      //who it might be.
      dojo.addClass(this.domNode, "unknown");

      var body = this.messageBag['rd.msg.body'];
      var from = body.from && body.from[1];
      if (from) {
        rd.escapeHtml(this.i18n.whoUnknown, this.whoNode);
      }
    }
  },

  onClick: function(evt) {
    //summary: handles clicks. Uses event
    //delegation to publish the right action.
    var target = evt.target;
    var href = target.href;
    if (href && (href = href.split("#")[1])) {
      if (href == "know") {
        rdw.contactDropDown.open(evt.target, this, this.fromName, this.matches);
        evt.preventDefault();
      } else if (href == "quote") {
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

  onContactSelected: function(/*Object*/contact) {
    //summary: handles a contact selection from the rdw.contactDropDown.
    rdw.contactDropDown.close();

    //Create the email identity record, then attach it to the contact.
    rd.api().createEmailIdentity({
      messageBag: this.messageBag
    })
    .ok(this, function(identity) {
      //identity created, now attach it to the contact.
      rd.contact.addIdentity(
        contact,
        identity,
        dojo.hitch(this, function() {
        }),
        dojo.hitch(this, function(error) {
          //error. TODO: make this better, inline.
          alert(error);
        })
      );
    })
    .error(this, function(error) {
      //error. TODO: make this better, inline.
      alert(error);
    });
  },

  onContactUpdated: function(/*Object*/contact) {
    //summary: called when a contact is updated (more likely a new contact or
    //old contact associated with an identity)
    var idtys = contact.identities;
    if (idtys && idtys.length) {
      var from = this.messageBag["rd.msg.body"] && this.messageBag["rd.msg.body"].from;
      if (!from) {
        return;
      }
      for (var i = 0, idty; idty = idtys[i]; i++) {
        var id = idty.rd_key[1];
        if (id[1] == from[1] && id[0] == from[0]) {
          //update this Message object's UI to show the new state.
          //TODO: this may cause problems if some container holds
          //on to this widget, since we will be changing the instance.
          this.messageBag["rd.msg.ui.known"] = {
            rd_schema_id: "rd.msg.ui.known"
          };
          rd._updateInstance(this, dojo.getObject(this.declaredClass));
        }
      }
    }
  },

  formatQuotedBody: function() {
    //Looks at the rd.msg.body.quoted schema for quoted blocks and formats them.
    //If no rd.msg.body.quoted exists, the message body will be used.
    var quoted = this.messageBag["rd.msg.body.quoted"];
    
    //No quoted, fallback to body text.
    if (!quoted) {
      var text = this.prepBodyPart(this.messageBag["rd.msg.body"].body);
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
