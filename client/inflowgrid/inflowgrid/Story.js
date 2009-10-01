dojo.provide("inflowgrid.Story");

dojo.require("rdw.Story");
dojo.require("inflowgrid.Message");

dojo.declare("inflowgrid.Story", [rdw.Story], {
  templateString: '<div class="rdwStory" dojoAttachEvent="onclick: onClick"> \
                    <div class="messages" dojoAttachPoint="containerNode"></div> \
                    <div class="toolAction" dojoAttachPoint="toolDisplayNode"> \
                    </div> \
                  </div>',

  //The name of the constructor function (module) that should be used
  //to show individual messages.
  messageCtorName: "inflowgrid.Message"

});
