dojo.provide("rdw.ext.MailingList");

//Only require inflow if this is the inflow app.
dojo.requireIf(rd.appName == "inflow", "inflow");

dojo.require("rd.conversation");
dojo.require("rd.MegaviewStore");

dojo.require("rdw.DataSelector");
dojo.require("rdw.Organizer");
dojo.require("rdw.Summary");
dojo.require("rdw.Stories");

dojo.require("rd.tag");
dojo.require("rd.store");
dojo.require("rdw.MailingListSummary");

//Tell the inflow to change to message view for mailing lists.
if (rd.appName == "inflow") {
  rd.applyExtension("rdw.ext.MailingList", "inflow", {
    add: {
      storyTopics: [
        "rd-protocol-mailingList"
      ]
    }
  });
}

//Allow a "mailingList" method on the rd.conversation data API.
rd.applyExtension("rdw.ext.MailingList", "rd.conversation", {
  add: {
    mailingList: function(/*String*/listId, /*Number*/limit, /*Function*/callback, /*Function*/errback) {
      //summary: gets the most recent mailing list messages up to limit, then pulls
      //the conversations associated with those messages. Conversation with
      //the most recent message will be first.
      rd.store.megaview({
        key: ["rd.msg.email.mailing-list", "list_id", listId],
        reduce: false,
        limit: limit,
        success: dojo.hitch(this, function(json) {
          //Get message keys
          var keys = [];
          for (var i = 0, row; row = json.rows[i]; i++) {
            keys.push(row.value.rd_key);
          }
  
          this.messageKey(keys, callback, errback);
        })
      });
    }
  }
});

//Allow mailingList queries via the rd.MegaviewStore dojo.data store.
rd.applyExtension("rd.ext.MailingList", "rd.MegaviewStore", {
  addToPrototype: {
    schemaQueryTypes: [
      "mailingList"
    ],
    mailingListQuery: function(/*String*/query, /*Number*/ count) {
      //summary: does a mailingList query for the "mailingList" schemaQueryType.
      //console.log("mailingListQuery", query, count);
      var dfd = new dojo.Deferred();
  
      var args = {
        startkey: ["rd.mailing-list", "id", query],
        endkey: ["rd.mailing-list", "id", query + "\u9999"],
        reduce: false,
        ioPublish: false,
        success: dojo.hitch(this, function(json) {
          var items = [];
          for (var i = 0, row; row = json.rows[i]; i++) {
            var name = row.key[2];
            if (!name) {
              continue;
            }
            items.push({
              id: row.value.rd_key[1],
              type: "mailingList",
              name: row.key[2]
            });
          }
          this._addItems(items);
          dfd.callback();
        }),
        error: function(err) {
          dfd.errback(err);
        }
      };
  
      if (count && count != Infinity) {
        args.limit = count;
      }
  
      rd.store.megaview(args);
      return dfd;
    }
  }
});

//Allow DataSelector to use mailingList in the all selector, and to
//handle mailingList selections.
rd.applyExtension("rdw.ext.MailingList", "rdw.DataSelector", {
  addToPrototype: {
    allType: [
      "mailingList"
    ],

    mailingListSelected: function(/*String*/list) {
      //summary: dispatch function when a mailingList is selected.
      rd.setFragId("rd:mailingList:" + list);  
    }
  }
});

//Apply a modification to the Organizer to show mailing lists.
rd.applyExtension("rdw.ext.MailingList", "rdw.Organizer", {
  addToPrototype: {
    listOrder: [
      "listMailingList"
    ],

    listMailingList: function() {
      //summary: shows a list of mailing lists available for viewing.
      rd.tag.lists(dojo.hitch(this, function(ids) {
        var html = "";
        for (var i = 0, id; id = ids[i]; i++) {
          html += dojo.string.substitute('<li type="mailingList:${id}" class="mailingList dojoDndItem"><a title="${id}" href="#rd:mailingList:${id}" >${name}</a></li>', {
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

//Modify rdw.Summary to allow showing a summary
//for mailing lists.
rd.applyExtension("rdw.ext.MailingList", "rdw.Summary", {
  addToPrototype: {
    topics: {
      "rd-protocol-mailingList": "mailingList"
    },

    mailingList: function(/*String*/listId) {
      //summary: responds to rd-protocol-mailingList topic.
      this.addSupporting(new rdw.MailingListSummary({
          id: listId
        }, dojo.create("div", null, this.domNode)));
    }
  }
});

//Modify rdw.Stories to allow showing mailing lists.
rd.applyExtension("rdw.ext.MailingList", "rdw.Stories", {
  addToPrototype: {
    topics: {
      "rd-protocol-mailingList": "mailingList"
    },
    homeGroups: [
      "rdw.story.MailingList"
    ],

    mailingList: function(/*String*/listId) {
      //summary: responds to rd-protocol-mailingList topic.
      rd.conversation.mailingList(listId, this.messageLimit, dojo.hitch(this, "updateConversations", "summary"));
    }
  }
});
