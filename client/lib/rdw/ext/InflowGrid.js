dojo.provide("rdw.ext.InflowGrid");

//Only do the extensions for the inflowgrid app
if (rd.appName == "inflowgrid") {
  dojo["require"]("rdw._Base");
  dojo["require"]("inflowgrid.Organizer");
  dojo["require"]("inflowgrid.Stories");

  dojo["requireLocalization"]("inflowgrid", "i18n", "ROOT");

  rd.applyExtension("rdw.ext.InflowGrid", "rdw._Base", {
    after: {
      postMixInProperties: function() {
        this.i18n = dojo.i18n.getLocalization("inflowgrid", "i18n");
      }
    }
  });

  //Apply a modification to the Organizer to show mailing lists.
  rd.applyExtension("rdw.ext.InflowGrid", "inflowgrid.Organizer", {
    addToPrototype: {
      listOrder: [
        "listMailingList"
      ],
  
      listMailingList: function() {
        //summary: shows a list of mailing lists available for viewing.
        rd.tag.lists(dojo.hitch(this, function(ids) {
          var html = "";
          for (var i = 0, id; id = ids[i]; i++) {
            html += dojo.string.substitute('<option value="rd:mailingList:${id}">${name}</option>', {
              id: id,
              //TODO: use the mailing list doc's "name" property if available.
              name: id.split(".")[0]
            });
          }

          if (html) {
            this.addItems("listMailingList", "Mailing Lists", dojo._toDom(html));
  
            //Listen to set current selection state.
            this.subscribeSelection("mailingList");
          }
        }));
      }
    }
  });

  //Modify rdw.Stories to allow showing mailing lists.
  rd.applyExtension("rdw.ext.InflowGrid", "inflowgrid.Stories", {
    addToPrototype: {
      topics: {
        "rd-protocol-mailingList": "mailingList"
      },
      homeGroups: [
        "inflowgrid.story.MailingList"
      ],
  
      mailingList: function(/*String*/listId) {
        //summary: responds to rd-protocol-mailingList topic.
        rd.conversation.mailingList(listId, this.messageLimit, dojo.hitch(this, "updateConversations", "summary"));
      }
    }
  });

}
