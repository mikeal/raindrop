dojo.provide("rdw.story.FullStory");

dojo.require("rdw.Story");
dojo.require("rdw.story.FullMessage");

dojo.declare("rdw.story.FullStory", [rdw.Story], {
  //The name of the constructor function (module) that should be used
  //to show individual messages.
  messageCtorName: "rdw.story.FullMessage",

  //A style to add to any messages that are replies.
  replyStyle: "",

  titleTemplate: '<div class="fullMessageTitle">${title}</div><div class="toolBox"><a class="archive" href="#archive">Archive</a><a class="spam" href="#spam">Spam</a><a class="delete" href="#delete">Delete</a></div>',

  postCreate: function() {
    //summary: dijit lifecycle method, after template is in the DOM.
    this.inherited("postCreate", arguments);

    //Inject the title
    this.title = this.msgs[0]["rd.msg.body"].subject;
    dojo.place(dojo.string.substitute(this.titleTemplate, {
      title: this.title || ""
    }), this.domNode, "first");

    dojo.addClass(this.domNode, "rdwStoryFullStory");
    this.toolsNode.style.display = "none";
  }
});
