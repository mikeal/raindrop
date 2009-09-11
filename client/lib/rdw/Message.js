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
    this.known = !!msgBag["rd.msg.ui.known"];
    if (this.known) {
      this.templateString = this.normalTemplate;
    } else {
      this.templateString = this.unknownUserTemplate;
    }
    
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
      var from = this.messageBag['rd.msg.body'].from[1];
      rd.escapeHtml(this.i18n.whoUnknown, this.whoNode);
    }
  },

  onActionClick: function(evt) {
    //summary: handles clicks for actions. Uses event
    //delegation to publish the right action.
    var href = evt.target.href;
    if (href && (href = href.split("#")[1])) {
      if (href == "know") {
        rdw.contactDropDown.open(evt.target, this, this.fromName, this.matches);
        evt.preventDefault();
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
  }
});
