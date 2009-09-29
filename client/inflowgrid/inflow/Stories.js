dojo.provide("inflow.Stories");

dojo.require("rdw.Stories");
dojo.require("inflow.Story");

dojo.declare("inflow.Stories", [rdw.Stories], {
  //Widget used for story objects.
  storyCtorName: "inflow.Story",

  templateString: '<div class="rdwStories" dojoAttachEvent="onclick: onClick, onkeypress: onKeyPress">'
                + '  <div dojoAttachPoint="listNode"></div>'
                + '  <div dojoAttachPoint="convoNode"></div>'
                + '</div>'
});
