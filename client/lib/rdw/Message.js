dojo.provide("rdw.Message");

dojo.require("rdw._Base");
dojo.require("rd.identity");
dojo.require("rd.contact");
dojo.require("rdw.gravatar");
dojo.require("rdw.contactDropDown");
dojo.require("rd.friendly");
dojo.require("rd.hyperlink");

dojo.declare("rdw.Message", [rdw._Base], {
  //Suggested values for type are "topic" and "reply"
  type: "topic",

  //The names of the helper widgets that
  //handle reply and forward. By extending
  //rdw.Message, you can modify the widgets used
  //for these actions.
  replyWidget: "rdw.ReplyForward",
  forwardWidget: "rdw.ReplyForward",

  //Holds the aggregated message object.
  //Warning: this is a prototype property: be sure to
  //set it per instance.
  messageBag: {},

  normalTemplate: dojo.cache("rdw.templates", "Message.html"),
  unknownUserTemplate: dojo.cache("rdw.templates", "MessageUnknown.html"),

  blankImgUrl: dojo.moduleUrl("rdw.resources", "blank.png"),
  unknownImgUrl: dojo.moduleUrl("rdw.resources", "unknown.png"),

  postMixInProperties: function() {
    //summary: dijit lifecycle method
    this.inherited("postMixInProperties", arguments);

    //Set the properties for this widget based on messageBag
    //properties.
    var msgBag = this.messageBag;
    var msgDoc = msgBag['rd.msg.body'];

    this.fromId = msgDoc.from[1];
    this.fromName = msgDoc.from_display || this.fromId;
    this.subject = rd.hyperlink.add(rd.escapeHtml(msgDoc.subject || ""));

    //TODO: make message transforms extensionized.
    this.message = rd.hyperlink.add(rd.escapeHtml(msgDoc.body_preview));
    if(msgDoc.from[0] == "twitter") {
      this.message = rd.hyperlink.addTwitterUsers(this.message);
      this.message = rd.hyperlink.addTwitterTags(this.message);
    }

    this.time = msgDoc.timestamp;

    /* XXX this timestamp needs a lot more thought to show the right kind of 
       time info and we probably also want to some standard the hCard formatting */
    var fTime = rd.friendly.timestamp(msgDoc.timestamp);
    this.utcTime = fTime["utc"];
    this.friendlyTime = fTime["friendly"];
    this.additionalTime = fTime["additional"];
    
    this.userPicUrl = this.blankImgUrl;
    //If the fromId has an @ in it, try to use a gravatar for it.
    if (this.fromId && this.fromId.indexOf("@") != -1) {
      this.userPicUrl = rdw.gravatar.get(this.fromId);
    }

    //Determine if the sender is known and switch templates if necessary.
    this.known = msgBag["rd.msg.ui"].known;
    if (this.known) {
      this.templateString = this.normalTemplate;
    } else {
      this.templateString = this.unknownUserTemplate;
    }
  },

  postCreate: function() {
    //summary: dijit lifecycle method
    this.inherited("postCreate", arguments);

    this.subscribe("rd-contact-updated", "onContactUpdated");

    if (!this.known) {
      //This identity is unknown. Try to make a suggestion for
      //who it might be.
      var from = this.messageBag['rd.msg.body'].from[1];
      rd.contact.matches(from, dojo.hitch(this, function(contacts) {
        this.matches = contacts;

        //hold on to matches.
        if (this.matches.length) {
          //Matches, show first one in the list.
          rd.escapeHtml(dojo.string.substitute(this.i18n.whoKnown, {
            name: this.matches[0].name
          }), this.whoNode);
        } else {
          //No matches, just show unknown message.
          rd.escapeHtml(this.i18n.whoUnknown, this.whoNode);
        }
      }));
    }

    //If twitter user, get their profile pic.
    var msgBag = this.messageBag;
    var msgDoc = msgBag['rd.msg.body'];
    var from = msgDoc.from;
    rd.identity.get(from, dojo.hitch(this, function(user) {
      if (this.userPicNode && user.image) {
        this.userPicNode.src = user.image;
      }
      if (user.name && this.fromNameNode) {
        this.fromNameNode.innerHTML = rd.escapeHtml(user.name);
      }
      //Don't worry about errors, just will not show pic.
    }), function(err){console.error(err)});
  },

  onToolClick: function(evt) {
    //summary: handles clicks for tool actions. Uses event
    //delegation to publish the right action.
    var href = evt.target.href;
    if (href && (href = href.split("#")[1])) {
      if (href == "know") {
        rdw.contactDropDown.open(evt.target, this, this.fromName, this.matches);
      } else if (href == "reply" || href == "forward") {
          //Dynamically load the module that will handle
          //the Reply/Forward action.
          var module = this[href + "Widget"];
          dojo["require"](module);
          dojo.addOnLoad(dojo.hitch(this, function() {
            module = dojo.getObject(module);

            //If we have an existing response widget, despose of it properly.
            if (this.responseWidget) {
              this.removeSupporting(this.responseWidget)
              this.responseWidget.destroy();
            }

            //Create the new response widget.
            this.responseWidget = new module({
              owner: this,
              replyType: href,
              messageBag: this.messageBag
            });
            this.addSupporting(this.responseWidget);

            //Put the response widget in the toolDisplay
            this.responseWidget.placeAt(this.toolDisplayNode);

            //Hide the reply/forward controls.
            this.toolsNode.style.display = "none";
          }));
      }
      evt.preventDefault();
    }
  },

  onContactSelected: function(/*Object*/contact) {
    //summary: handles a contact selection from the rdw.contactDropDown.
    rdw.contactDropDown.close();

    //Create the email identity record, then attach it to the contact.
    rd.identity.createEmail(
      this.messageBag,
      dojo.hitch(this, function(identity) {
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
      }),
      dojo.hitch(this, function(error) {
        //error. TODO: make this better, inline.
        alert(error);
      })
    );
  },

  responseClosed: function() {
    //summary: Called by this.responseWidget's instance, if it knows
    //that it has been destroyed.
    this.removeSupporting(this.responseWidget);

    //Show the reply/forward controls.
    this.toolsNode.style.display = "";
  },

  onContactUpdated: function(/*Object*/contact) {
    //summary: called when a contact is updated (more likely a new contact or
    //old contact associated with an identity)
    var idtys = contact.identities;
    if (idtys && idtys.length) {
      var from = this.messageBag["rd.msg.body"] && this.messageBag["rd.msg.body"].from;
      for (var i = 0, idty; idty = idtys[i]; i++) {
        var id = idty.rd_key[1];
        if (id[1] == from[1] && id[0] == from[0]) {
          //update this Message object's UI to show the new state.
          //TODO: this may cause problems if some container holds
          //on to this widget, since we will be changing the instance.
          this.messageBag["rd.msg.ui"].known = true;
          rd._updateInstance(this, dojo.getObject(this.declaredClass));
        }
      }
    }
  }
});
