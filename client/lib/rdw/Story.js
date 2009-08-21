dojo.provide("rdw.Story");
dojo.require("rdw._Base");
dojo.require("rdw.Message");

dojo.declare("rdw.Story", [rdw._Base], {
  //Holds the couch documents for this story.
  //Warning: this is a prototype property: be sure to
  //set it per instance.
  msgs: [],

  //Flag for displaying the messages as soon as the
  //instance is created. If false, then the display()
  //method will need to be called at the appropriate time.
  displayOnCreate: true,

  //The name of the constructor function (module) that should be used
  //to show individual messages.
  messageCtorName: "rdw.Message",

  //Limit to number of messages. If value is -1, then it means
  //show all.
  messageLimit: -1,

  //A style to add to any messages that are replies.
  replyStyle: "reply",

  //The names of the helper widgets that
  //handle reply and forward. By extending
  //rdw.Message, you can modify the widgets used
  //for these actions.
  replyWidget: "rdw.ReplyForward",
  forwardWidget: "rdw.ReplyForward",
  
  templateString: '<li class="Story"> \
                    <div class="messages" dojoAttachPoint="containerNode"></div> \
                    <div class="toolAction" dojoAttachPoint="toolDisplayNode"> \
                    </div> \
                    <div class="tools" dojoAttachPoint="toolsNode" dojoAttachEvent="onclick: onToolClick"> \
                      <a class="reply" dojoAttachPoint="replyNode" href="#reply">${i18n.reply}</a> \
                    </div> \
                  </li>',

  moreMessagesTemplate: '<a class="moreMessages" href="#more">${message}</a>',


  msgSort: function (a,b) {
    //summary: default message sorting is by timestamp, most
    //recent message is last. This method should not use
    //the "this" variable.
    return a["rd.msg.body"].timestamp > b["rd.msg.body"].timestamp
  },

  postCreate: function() {
    //summary: dijit lifecycle method
    this.inherited("postCreate", arguments);
    if (this.displayOnCreate) {
      this.display();
    }
  },

  onToolClick: function(evt) {
    //summary: handles clicks for tool actions. Uses event
    //delegation to publish the right action.
    var href = evt.target.href;
    if (href && (href = href.split("#")[1])) {
      if (href == "reply" || href == "forward") {
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
              messageBag: this.lastDisplayedMsg
            });

            this.addSupporting(this.responseWidget);

            //Put the response widget in the toolDisplay
            this.responseWidget.placeAt(this.toolDisplayNode);
            
            //Hide the reply node since the reply tool is showing
            this.replyNode.style.display = "none";
          }));
      }
      evt.preventDefault();
    }
  },

  /**
   * Adds a message to this group.
   *
   * @param messageBag {object} the collection of message schemas for a message.
   */
  addMessage: function(messageBag) {
    if (messageBag) {
      this.msgs.push(messageBag);
    }
    if (this._displayed) {
      this.display();
    }
  },

  display: function() {
    //summary: displays the messages in the story.

    //Set the state as displayed, in case widgets are refreshed for extensions.
    this.displayOnCreate = true;
    this._displayed = true;

    //Clean up any existing widgets.
    this.destroyAllSupporting();

    // Sort by date
    this.msgs.sort(this.msgSort);

    //Create the messages.
    var limit = this.messageLimit > -1 ? this.messageLimit : this.msgs.length;
    dojo["require"](this.messageCtorName);
    dojo.addOnLoad(dojo.hitch(this, function() {
      var ctor = dojo.getObject(this.messageCtorName);
      for (var i = 0, msg; (i < limit) && (msg = this.msgs[i]); i++) {
        //Hold on to last viewed message to feed to reply/forward actions.
        this.lastDisplayedMsg = msg;
        this.addSupporting(new ctor({
          messageBag: msg,
          type: i == 0 ? "" : this.replyStyle
        }, dojo.create("div", null, this.containerNode)));
      };

      //If any left over messages, then show that info.
      if (this.toolsNode) {
        if (this.msgs[limit - 1] && limit < this.msgs.length) {
          var count = this.msgs.length - limit;
          var html = dojo.string.substitute(this.moreMessagesTemplate, {
            message: dojo.string.substitute(this.i18n.moreMessages, {
              count: count,
              messagePlural: (count == 1 ? this.i18n.messageSingular : this.i18n.messagePlural)
            })
          })
          dojo.place(html, this.toolsNode, "first");
        }
      }
    }));
  },

  responseClosed: function() {
    //summary: Called by this.responseWidget's instance, if it knows
    //that it has been destroyed.
    this.removeSupporting(this.responseWidget);

    //Show the reply node since the reply tool is gone.
    this.replyNode.style.display = "";
  }
});
