/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Raindrop.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Messaging, Inc..
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * */

dojo.provide("rdw.ext.mailingList.ext");

//Only require inflow if this is the inflow app.
dojo.requireIf(rd.appName == "inflow", "inflow");

dojo.require("rd.conversation");
dojo.require("rd.MegaviewStore");

dojo.require("rdw.DataSelector");
dojo.require("rdw.Organizer");
dojo.require("rdw.Summary");
dojo.require("rdw.SummaryGroup");
dojo.require("rdw.Conversations");
dojo.require("rdw.Widgets");

dojo.require("rd.tag");
dojo.require("rd.api");
dojo.require("rdw.ext.mailingList.Summary");
dojo.require("rdw.ext.mailingList.SummaryGroup");

//Allow a "mailingList" method on the rd.conversation data API.
rd.applyExtension("rdw.ext.mailingList.ext", "rd.conversation", {
  add: {
    mailingList: function(/*String*/listId, /*Number*/limit, /*Function*/callback, /*Function*/errback) {
      //summary: gets the most recent mailing list messages up to limit, then pulls
      //the conversations associated with those messages. Conversation with
      //the most recent message will be first.
      rd.api().megaview({
        key: ["rd.msg.email.mailing-list", "list_id", listId],
        reduce: false,
        limit: limit
      })
      .ok(this, function(json) {
        //Get message keys
        var keys = [];
        for (var i = 0, row; row = json.rows[i]; i++) {
          keys.push(row.value.rd_key);
        }

        this.messageKey(keys, callback, errback);
      });
    }
  }
});

//Allow mailingList queries via the rd.MegaviewStore dojo.data store.
rd.applyExtension("rdw.ext.mailingList.ext", "rd.MegaviewStore", {
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
        ioPublish: false
      };
  
      if (count && count != Infinity) {
        args.limit = count;
      }
  
      rd.api().megaview(args)
      .ok(this, function(json) {
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
      })
      .error(dfd);
      return dfd;
    }
  }
});

//Allow DataSelector to use mailingList in the all selector, and to
//handle mailingList selections.
rd.applyExtension("rdw.ext.mailingList.ext", "rdw.DataSelector", {
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
rd.applyExtension("rdw.ext.mailingList.ext", "rdw.Organizer", {
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

//Modify rdw.Summary to allow showing a summary
//for mailing lists.
rd.applyExtension("rdw.ext.mailingList.ext", "rdw.Summary", {
  addToPrototype: {
    mailingList: function(/*String*/listId) {
      //summary: responds to rd-protocol-mailingList topic.
      this.addSupporting(new rdw.ext.mailingList.Summary({
          listId: listId
        }, dojo.create("div", null, this.domNode)));
    }
  }
});

//Modify rdw.Summary to allow showing a summary
//for mailing lists.
rd.applyExtension("rdw.ext.mailingList.ext", "rdw.SummaryGroup", {
  addToPrototype: {
    topics: {
      "rd-protocol-mailingList": "mailingList"
    },

    mailingList: function(/*String*/listId) {
      //summary: responds to rd-protocol-mailingList topic.
      this.addSupporting(new rdw.ext.mailingList.SummaryGroup({
          listId: listId
        }, dojo.create("div", null, this.domNode)));
    }
  }
});

//Modify rdw.Conversations to allow loading mailing lists.
rd.applyExtension("rdw.ext.mailingList.ext", "rdw.Conversations", {
  addToPrototype: {
    topics: {
      "rd-protocol-mailingList": "mailingList"
    },

    mailingList: function(/*String*/listId) {
      //summary: responds to rd-protocol-mailingList topic.
      rd.conversation.mailingList(listId, this.conversationLimit, dojo.hitch(this, function(conversations) {  
        this.updateConversations("summary", conversations);
        if (this.summaryWidget.mailingList) {
          this.summaryWidget.mailingList(listId);
        }
      }));
    }
  }
});

//Modify rdw.Widgets to allow showing mailing lists.
rd.applyExtension("rdw.ext.mailingList.ext", "rdw.Widgets", {
  addToPrototype: {
    convoModules: [
      "rdw.ext.mailingList.Group"
    ]
  },

  after: {
    onHashChange: function(value) {
      //Hide the twitter group widgets when viewing the twitter stream,
      //otherwise make sure they are visible.
      var widgets = dijit.registry.byClass("rdw.ext.mailingList.Group"),
          parts = value.split(":"),
          isList = parts[1] === "mailingList",
          listId = parts[2];

      widgets.forEach(function(widget) {
        widget.domNode.style.display = (isList && widget.listId === listId ? "none" : "");
      });
    }
  }
});
