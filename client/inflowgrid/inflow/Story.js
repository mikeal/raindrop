dojo.provide("inflow.Story");

dojo.require("rdw.Story");

dojo.declare("inflow.Story", [rdw.Story], {
  templateString: '<div class="rdwStory" dojoAttachEvent="onclick: onClick"> \
                    <div class="messages" dojoAttachPoint="containerNode"></div> \
                    <div class="toolAction" dojoAttachPoint="toolDisplayNode"> \
                    </div> \
                  </div>'
});
