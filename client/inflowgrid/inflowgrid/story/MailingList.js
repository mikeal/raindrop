dojo.provide("inflowgrid.story.MailingList");

dojo.require("rdw.story.MailingList");

dojo.declare("inflowgrid.story.MailingList", [rdw.story.MailingList], {
  templateString: '<li class="inflowgridStoryMailingList"> \
                    <div class="mailingList" dojoAttachPoint="containerNode"><span dojoAttachPoint="nameNode" class="MailingListTitle"></span></div> \
                  </li>',

  /**
   * The name of the module to use for showing individual messages.
   */
  messageCtorName: "inflowgrid.story.MailingListMessage"
});
