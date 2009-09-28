dojo.provide("inflow.Story");

dojo.require("rdw.Story");
dojo.require("inflow.Message");

dojo.declare("inflow.Story", [rdw.Story], {
  templateString: '<div class="rdwStory" dojoAttachEvent="onclick: onClick"> \
                    <div class="messages" dojoAttachPoint="containerNode"></div> \
                    <div class="toolAction" dojoAttachPoint="toolDisplayNode"> \
                    </div> \
                  </div>',

  //The name of the constructor function (module) that should be used
  //to show individual messages.
  messageCtorName: "inflow.Message"

});
