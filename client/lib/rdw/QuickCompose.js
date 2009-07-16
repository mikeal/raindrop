dojo.provide("rdw.QuickCompose");

dojo.require("dijit.form.ComboBox");

dojo.require("rdw._Base");
dojo.require("rd.contact");
dojo.require("rd.account");
dojo.require("rd.store");

dojo.declare("rdw.QuickCompose", [rdw._Base], {
  templatePath: dojo.moduleUrl("rdw.templates", "QuickCompose.html"),

  blankImgUrl: dojo.moduleUrl("rdw.resources", "blank.png"),

  //The types of account services that QuickCompose supports for sending out messages.
  //You can modify this prototype property to add new values, or change the
  //values on instantiation. Note that changing on instantion means assigning
  //a new object to the instance's allowedSenders property. Otherwise, you
  //will modify the prototype property for all instances. The values correspond
  //to the account types on the account object from rd.account.
  allowedSenders: {
    twitter: 1,
    imap: 1
  },

  //The preferred sender to use as default when creating the QuickCompose.
  preferredSender: "imap",
  
  //types of sender identities that require the To field to show up.
  //See notes for allowedSenders for how to modify this object.
  showTo: {
    imap: 1
  },

  //The types of account services that should show a subject field.
  showSubject: {
    imap: 1
  },

  postMixInProperties: function() {
    //summary: dijit lifecycle method.
    this.inherited("postMixInProperties", arguments);

    this.userPicUrl = this.blankImgUrl;
    
    this.yourName = "Your Name";
    this.yourAddress = "you@example.com";
    
    this.sendButtonText = this.i18n.send;

    if (!this.supportingWidgets) {
      this.supportingWidgets = [];
    }
  },

  postCreate: function() {
    //summary: dijit lifecycle method.
    this.inherited("postCreate", arguments);

    //See if a twitter icon can be pulled in for the user.
    rd.account.all(dojo.hitch(this, function(accounts) {
      //Build up a list of identity IDs, to find a contact to use for showing
      //things like a profile picture.
      var ids = [], empty = {};
      this.senders = {};
      for (var prop in accounts) {
        if (!(prop in empty)) {
          ids.push([prop, accounts[prop].id]);
          if (prop in this.allowedSenders) {
            //Add to list of senders this QuickCompose can handle.
            this.senders[prop] = accounts[prop].id;
          }
        }
      }

      rd.contact.byIdentity(ids, dojo.hitch(this, function(contacts) {
        //Use the first contact available.
        this.contact = (contacts && contacts[0]);
        if (this.contact) {
          if (this.contact.image) {
            this.pictureNode.src = this.contact.image;
          }
          if (this.contact.name) {
            rd.escapeHtml(this.contact.name, this.nameNode, "only");
          }

          //Build up a data store object, only using senders that
          //are known by QuickCompose to support sending.
          var sendList = [];
          for (var prop in this.senders) {
            sendList.push({
              name: prop + ": " + this.senders[prop]
            })
          }

          //Set up default value for the sender box.
          var value = this.senders[this.preferredSender] ?
              this.preferredSender + ": " + this.senders[this.preferredSender]
            :
              sendList[0].name;

          //Put the list of sender identities in a combo box
          this.addressComboBox = new dijit.form.ComboBox({
            store: rd.toIfrs(sendList),
            value: value,
            "class": this.addressNode.className,
            onChange: dojo.hitch(this, "onSenderAddressChange")
          }, this.addressNode);
          //Add to supporting widgets so widget destroys do the right thing.
          this.supportingWidgets.push(this.addressComboBox);

          //Update To field
          this.updateFields(value);
        }
        
      }));
    }));
  },

  onFocusTextArea: function(evt) {
    //summary: expand the text area from it's simple entry space
    dojo.style(this.textAreaNode, "height", "12ex");
  },

  onSubmit: function(evt) {
    //summary: focus the text area if send is pressed w/ nothing to send
    var body = dojo.trim(this.textAreaNode.value);
    //TODO: need to account for multiple senders.
    var to = dojo.trim(this.toInputNode.value);

    if (body == "" || to == "") {
      this.textAreaNode.focus();
    } else {
      this.updateStatus("Sending message.");

      var sender = this.parseSender(this.addressComboBox.attr("value"));
      var svc = sender.service;
      var senderId = sender.id;
      var subject = dojo.trim(this.subjectInputNode.value);

      //Fix imap to be "email" for the purposes of outgoing message doc.
      if (svc == "imap") {
        svc = "email";
      }

      var message = {
        rd_key: ["manually_created_doc", 1],
        rd_schema_id: "rd.msg.outgoing.simple",
        from: [svc, sender.id],
        //TODO: pull out the to_display somehow. Maybe update rd.account
        //to fetch that info along with the ID.
        from_display: sender.id,
        to: [
          ["email", to]
        ],
        //TODO: how to get proper to_display value?
        to_display: [to],
        body: body,
        subject: subject,
        outgoing_state: "outgoing"
      };

      //TODO: temporary hack to limit posting to just email
      if (svc == "email") {
        dojo.store.put(
          message,
          dojo.hitch(this, function(message) {
            this.updateStatus("Message sent.");
          }),
          dojo.hitch(this, function(error) {
            this.updateStatus("An error occurred");
          })
        );
      } else {
        this.updateStatus("Unsupported message service");
      }
    }
    dojo.stopEvent(evt);
  },

  onSenderAddressChange: function(/*String*/value) {
    this.updateFields(value);
  },

  updateFields: function(/*String*/sender) {
    //summary: updates the display of the subject/to boxes depending on the
    //type of sender name. Note "sender" is a string formatted as "service: username",
    //so it needs to be parsed to get the right info.
    var svc = this.parseSender(sender).service;
    if (svc) {
      dojo.style(this.toNode, "display", this.showTo[svc] ? "" : "none");
      if (!this.showTo[svc]) {
        this.toInputNode.value = "";
      }

      dojo.style(this.subjectNode, "display", this.showSubject[svc] ? "" : "none");
      if (!this.showSubject[svc]) {
        this.subjectInputNode.value = "";
      }
    }
  },

  parseSender: function(/*String*/sender) {
    //summary: parses a sender string of "service: username"
    var ret = {};
    var sep = sender.indexOf(": ");
    if (sep != -1) {
      ret.service = sender.substring(0, sep);
      ret.id = sender.substring(sep + 2, sender.length);
    }

    return ret;
  },

  updateStatus: function(/*String*/message) {
    //summary: updates QuickCompose with a status message on the action(s)
    //QuickCompose is performing.
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
      this.statusTimeout = 0;
    }

    rd.escapeHtml(message, this.statusNode, "only");
    this.statusTimeout = setTimeout(dojo.hitch(this, function(){
      this.statusNode.innerHTML = "";
    }), 5000);
  }
});
