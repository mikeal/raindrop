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

  //Limit to number of messages. If value is -1, then it means
  //show all.
  messageLimit: -1,

  //A style to add to any messages that are replies.
  replyStyle: "reply",
  
  templateString: '<li class="Story" dojoAttachPoint="containerNode"></li>',

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

  /**
   * Adds a message to this group.
   *
   * @param messageBag {object} the collection of message schemas for a message.
   */
  addMessage: function(messageBag) {
    this.msgs.push(messageBag);
    if (this._displayed) {
      this.display();
    }
  },

  display: function() {
    //summary: displays the messages in the story.

    //Clean up any existing widgets.
    this.destroyAllSupporting();

    // Sort by date
    this.msgs.sort(this.msgSort);

    //Create the messages.
    var limit = this.messageLimit > -1 ? this.messageLimit : this.msgs.length;
    for (var i = 0, msg; (i < limit) && (msg = this.msgs[i]); i++) {
      this.addSupporting(new rdw.Message({
        messageBag: msg,
        type: i == 0 ? "" : this.replyStyle
      }, dojo.create("div", null, this.containerNode)));
    };
  }
});
