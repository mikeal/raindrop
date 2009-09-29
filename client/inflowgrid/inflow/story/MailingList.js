dojo.provide("inflow.story.MailingList");

dojo.require("rdw.story.MailingList");

dojo.declare("inflow.story.MailingList", [rdw.story.MailingList], {
  templateString: '<li class="inflowStoryMailingList"> \
                    <div class="mailingList" dojoAttachPoint="containerNode"><span dojoAttachPoint="nameNode" class="MailingListTitle"></span></div> \
                  </li>',

  /**
   * The name of the module to use for showing individual messages.
   */
  messageCtorName: "inflow.story.MailingListMessage"
});
