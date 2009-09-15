dojo.provide("rdw.Notify");
dojo.require("rdw._Base");

//A widget that shows a loading indicator whenever there is an outstanding
//IO request.
dojo.declare("rdw.Notify", [rdw._Base], {
  templateString: '<div class="rdwNotify" dojoAttachEvent="onclick: onClick"> \
                     <div class="anim" dojoAttachPoint="animNode"> \
                       <div class="arrow" ></div> \
                       <div class="messageWrap"> \
                       <span class="message" dojoAttachPoint="messageNode"></span> \
                       <a class="undo" dojoAttachPoint="undoNode" href="#undo">undo</a> \
                       </div> \
                     </div> \
                   </div>',

  //The list of topics to accept.
  topics: {
    "rd-notify-delete": "del"    
  },

  //How many milliseconds to show the notification
  displayMillis: 5000,

  animEasing: function(/* Decimal? */n){
    //summary: easing function for animations. This is a copy of
    //dojo.fx.easing.expoOut
    return (n == 1) ? 1 : (-1 * Math.pow(2, -10 * n) + 1);
  },

  resetAnim: function(/*DOMNode*/node) {
    //summary: resets the animation properties.
    dojo.style(node, {
      top: -30,
      opacity: 0
    });
  },

  startAnim: function(/*DOMNode*/node) {
    //summary: starts the animation and returns the animation
    //object.
    var anim = dojo.anim(
      node,
      {
        top: 0,
        opacity: 1
      },
      2000,
      this.animEasing,
      
      dojo.hitch(this, function() {
        //Remove the animation styles to let
        //stylesheet have the final say.
        dojo.style(node, {
          top: "",
          opacity: ""
        });

        //Show the message for a bit, then start the
        //animation back.
        setTimeout(dojo.hitch(this, function() {
          dojo.anim(
            node,
            {
              top: -30,
              opacity: 0
            },
            2000,
            this.animEasing,
            dojo.hitch(this, function() {
              this.animEnd();
            })
          ).play();
        }), this.displayMillis);
      })
    );

    anim.play();
    this.anim = anim;
  },

  postCreate: function() {
    //summary: dijit lifecycle method, after template is in the DOM.
    this.domNode.style.display = "none";

    //Listen for notify events.
    var empty = {};
    for (var prop in this.topics) {
      if (!(prop in empty)) {
        this._sub(prop, this.topics[prop]);
      }
    }
  },

  _sub: function(/*String*/topicName, /*String*/funcName) {
    //summary: subscribes to the topicName and dispatches to funcName,
    //saving off the info for undo actions.
    this.subscribe(topicName, dojo.hitch(this, function() {
      //Remember the topic name for triggering the undo action.
      this.currentTopic = topicName;
      this.currentTopicArgs = arguments;

      return this[funcName].apply(this, arguments);
    }));
  },

  onClick: function(/*Event*/evt) {
    //summary: figure out if undo action was triggered.
    var href = evt.target.href;
    if (href && (href = href.split("#")[1])) {
      if (href == "undo") {
        //Trigger undo.
        dojo.publish(this.currentTopic + "-undo", this.currentTopicArgs);
        dojo.stopEvent(evt);
      }
    }
  },

  animEnd: function() {
    this.domNode.display = "none";
    delete this.anim;
  },

  showNotify: function(/*String*/message, /*Boolean*/hideUndo) {
    //summary: shows the notify message for a bit.
    
    //Stop any in-process animation.
    if (this.anim) {
      this.anim.stop();
    }

    this.resetAnim(this.animNode);

    //Insert content into the notification.
    rd.escapeHtml(message, this.messageNode, "only");
    this.undoNode.style.display = hideUndo ? "none" : "";

    //Show the master node.
    this.domNode.style.display = "";

    //Start the animation.
    this.startAnim(this.animNode);
  },
  
  del: function(/*Array*/ msgs) {
    //summary: A story was deleted.
    var title = msgs[0]["rd.msg.body"];
    if (title) {
      title = title.subject || "";
    }

    this.showNotify(dojo.string.substitute(this.i18n.storyDeleted, {
      title: title
    }));
  }
});
