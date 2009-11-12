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

dojo.provide("rdw.QuickCompose");

dojo.require("dijit.form.FilteringSelect");

dojo.require("rdw._Base");
dojo.require("rd.api.me");

dojo.declare("rdw.QuickCompose", [rdw._Base], {
  templatePath: dojo.moduleUrl("rdw.templates", "QuickCompose.html"),

  //The widget to use for address selection for the From value.
  fromSelector: "dijit.form.FilteringSelect",

  //The widget to use for person selector for the To value.
  toSelector: "rdw.DataSelector",

  //Optional message that this compose is related to.
  msg: null,

  //Sets up styles and states to show the QuickCompose as expanded.
  startExpanded: false,

  //The types of account services that QuickCompose supports for sending out messages.
  //You can modify this prototype property to add new values, or change the
  //values on instantiation. Note that changing on instantion means assigning
  //a new object to the instance's allowedServices property. Otherwise, you
  //will modify the prototype property for all instances. The values correspond
  //to the account types on the account objects from rd.account schema docs.
  allowedServices: {
    twitter: 1,
    email: 1
  },

  //The preferred service to use as default when creating the QuickCompose.
  preferredService: "twitter",

  postMixInProperties: function() {
    //summary: dijit lifecycle method.
    this.inherited("postMixInProperties", arguments);

    this.yourName = "Your Name";
    this.yourAddress = "you@example.com";
    
    this.sendButtonText = this.i18n.send;
  },

  postCreate: function() {
    //summary: dijit lifecycle method.
    this.inherited("postCreate", arguments);

    var ids = [], accountsById = {}, accountsByType = {};
    this.senders = {};

    //See if a twitter icon can be pulled in for the user.
    rd.api().me()
    .filter(this, function(idty) {
      var idtyId = idty.rd_key[1];
      ids.push(idtyId);
      if (idtyId[0] in this.allowedServices) {
        //Add to list of senders this QuickCompose can handle.
        this.senders[idtyId[0]] = idtyId[1];

        //Allow each sender type to do specific init actions
        //for UI binding.
        var init = this[idtyId[0] + "Init"];
        if (init) {
          init.call(this);
        }
        //Store a quick account lookup by account ID
        if (idtyId[1]) {
          accountsById[idtyId[1]] = idty;
          accountsByType[idtyId[0]] = idty;
        }

        return idty;
      }
      return null;
    })
    .contact()
    .ok(this, function(contacts) {
      //Use the first contact available.
      this.contact = (contacts && contacts[0]);
      if (this.contact) {
        if (this.contact.name) {
          rd.escapeHtml(this.contact.name, this.nameNode, "only");
        }

        if (this.msg) {
          //Sender is restricted, just show it.
          //First get the account to use for sending.
          //By seeing who the message was sent to.
          var body = this.msg && this.msg.schemas["rd.msg.body"];
          if (body && body.to) {
            for (var i = 0, to; to = body.to[i]; i++) {
              this.sender = accountsById[to[1]];
              if (this.sender) {
                var fromSvc = to[0];
                break;
              }
            }
          }

          if (!this.sender) {
            //Make a good guess based on the from address.
            var fromSvc = this.msg.schemas["rd.msg.body"].from[0];
            this.sender = dojo.delegate(accountsByType[fromSvc]);
            if (!this.sender.id && this.sender.rd_key) {
              this.sender.id = this.sender.rd_key[1][1];
              this.sender.service = this.sender.rd_key[1][0];
            }
          }

          var senderDisplay = fromSvc + ": " + this.sender.id;
          rd.escapeHtml(senderDisplay, this.addressNode, "only");
        } else {
          //Allow user to select a sender.
          //Build up a data store object, only using senders that
          //are known by QuickCompose to support sending.
          var sendList = [];
          for (var prop in this.senders) {
            sendList.push({
              name: prop + ": " + this.senders[prop]
            })
          }

          //Set up default value for the sender box.
          senderDisplay = this.senders[this.preferredService] ?
              this.preferredService + ": " + this.senders[this.preferredService]
            :
              sendList[0].name;

          this.sender = this.parseSender(senderDisplay);

          dojo["require"](this.fromSelector);
          dojo.addOnLoad(dojo.hitch(this, function(){
            //Put the list of sender identities in a combo box
            var ctor = dojo.getObject(this.fromSelector);

            this.fromSelectorWidget = new ctor({
              store: rd.toIfrs(sendList, "name", "name"),
              searchAttr: "name",
              value: senderDisplay,
              "class": this.addressNode.className,
              onChange: dojo.hitch(this, "onSenderAddressChange")
            }, this.addressNode);

            //Add to supporting widgets so widget destroys do the right thing.
            this.addSupporting(this.fromSelectorWidget);
          }));
        }

        //Update To field
        this.updateFields(senderDisplay);
      }
    });
    
    if (this.startExpanded) {
      this.onFocusTextArea();
    }
  },

  destroy: function() {
    //summary: dijit lifecycle method.
    var widgets = ["toSelectorWidget", "fromSelectorWidget"];
    for (var i = 0, widget; widget = widgets[i]; i++) {
      if (this[widget]) {
        this[widget].destroy();
        delete this[widget];
      }
    }

    this.inherited("destroy", arguments);
  },

  onFocusTextArea: function(evt) {
    //summary: expand the text area from it's simple entry space
    dojo.addClass(this.domNode, "expanded");

    //Clear hint message.
    if (!this._hintCleared) {
      this._hintCleared = true;
      this.textAreaNode.value = "";
    }
  },

  onCloseClick: function(evt) {
    rd.pub("rd-QuickCompose-closed", this);
    dojo.stopEvent(evt);
  },

  onSubmit: function(evt) {
    //summary: focus the text area if send is pressed w/ nothing to send
    var body = dojo.trim(this.textAreaNode.value);
    //TODO: need to account for multiple senders.
    var to = dojo.trim(this.toSelectorWidget.attr("value"));

    if (body == "" || to == "") {
      this.textAreaNode.focus();
    } else {
      this.updateStatus("Sending message.");

      var sender = this._determineSender();
      var svc = sender.service;
      var senderId = sender.id;
      var subject = dojo.trim(this.subjectInputNode.value);

      var fields = {
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
      var schema_item = {
        //TODO: make a better rd_key.
        rd_key: ["manually_created_doc", (new Date()).getTime()],
        rd_schema_id: "rd.msg.outgoing.simple",
        items: fields
      };

      //TODO: temporary hack to limit posting to just email
      if (svc == "email") {
        dojo.store.createSchemaItem(
          schema_item,
          dojo.hitch(this, function(message) {
            this.updateStatus("&#x2714; Message sent.");
          }),
          dojo.hitch(this, function(error) {
            this.updateStatus("&#10007; An error occurred");
          })
        );
      } else {
        this.updateStatus("&#10007; Unsupported message service");
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

    var oldSvc = this.sender.service;
    var senderObj = this.parseSender(sender)
    var svc = senderObj.service;
    if (svc) {
      //Save the sender for later use.
      this.sender = senderObj;

      //Call inactive method for previous sender service.
      var func = this[oldSvc + "Inactive"];
      if (func) {
        func.call(this);
      }

      //Switch the class on the element to allow showing/hiding/styling
      //the widget differently based on type.
      if (oldSvc) {
        dojo.removeClass(this.domNode, oldSvc);
      }
      dojo.addClass(this.domNode, svc);

      //Update To input, first by making sure selector widget is available.
      dojo["require"](this.toSelector);
      dojo.addOnLoad(dojo.hitch(this, "initToSelector"));

      //Call active method for current sender service.
      var func = this[svc + "Active"];
      if (func) {
        func.call(this);
      }
    }
  },

  initToSelector: function() {
    //summary: work to do when the selector widget is known to be loaded and
    //an instance needs to be inited.

    //Remove previous selector.
    if (this.toSelectorWidget) {
      this.removeSupporting(this.toSelectorWidget);
      var parentNode = this.toSelectorWidget.domNode.parentNode;
      this.toSelectorWidget.destroy();
      this.toInputNode = dojo.create("input", {
        type: "text",
        "class": "toInput"
      }, parentNode);
    }

    this.toSelectorWidget = new (dojo.getObject(this.toSelector))({
      type: "identityContact",
      subType: (this.sender.service)
    }, this.toInputNode);

    this.addSupporting(this.toSelectorWidget);
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
  },

  _determineSender: function() {
    //summary: looks at the selector widget or HTML to get the sender name,
    //and parse into a usable object.
    var senderValue = this.fromSelectorWidget ?
      this.fromSelectorWidget.attr("value")
    :
      this.addressNode.innerHTML;

    return this.sender = this.parseSender(senderValue);
  },

  //****** Start twitter methods.************//
  twitterInit: function() {
    //summary: specific init function for binding to the UI for twitter actions.
    this.connect(this.textAreaNode, "onkeyup", "twitterOnKeyUp");
  },

  twitterActive: function() {
    //summary: specific twitter call for when twitter service is active in QuickCompose.
    dojo.removeClass(this.countNode, "error");
    this._isTwitterOver = false;
    this.twitterCheckCount();
  },

  twitterInactive: function() {
    //summary: specific twitter call for when twitter service is no longer active QuickCompose.
    dojo.removeClass(this.countNode, "error");
    this.countNode.innerHTML = "";
  },

  twitterOnKeyUp: function(/*Event*/evt) {
    //summary: twitter check for max character count. Only do the count if
    //twitter is the active service.
    if (this.sender.service == "twitter") {
      this.twitterCheckCount();
    }
  },

  twitterLimit: 140,

  twitterCheckCount: function() {
    //summary: check the character count in the textarea.
    var count = this.twitterLimit - this.textAreaNode.value.length;
    if (count < 0) {
      dojo.addClass(this.countNode, "error");
      this._isTwitterOver = true;
    } else if (this._isTwitterOver) {
      dojo.removeClass(this.countNode, "error");
      this._isTwitterOver = false;
    }
    this.countNode.innerHTML = count;
  }
  //****** End twitter methods.************//
});
