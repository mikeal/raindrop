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

/*jslint plusplus: false, nomen: false */
/*global run: false */
"use strict";

run("rdw/ext/twitter/ext",
["rd", "dojo", "dijit", "rd/api"],
function (rd, dojo, dijit, api) {

    run.modify("rdw/Summary", "rdw/ext/twitter/ext-rdw/Summary",
        ["rdw/Summary"],
        function () {
            rd.applyExtension("rdw/ext/twitter/ext", "rdw/Summary", {
                addToPrototype: {
                    twitter: function () {
                        rd.escapeHtml("Twitter Timeline", this.domNode);
                    }
                }
            });
        }
    );

    run.modify("rdw/SummaryGroup", "rdw/ext/twitter/ext-rdw/SummaryGroup",
        ["rdw/SummaryGroup"],
        function () {
            rd.applyExtension("rdw/ext/twitter/ext", "rdw/SummaryGroup", {
                addToPrototype: {
                    topics: {
                        "rd-protocol-twitter": "twitter"
                    },
                
                    twitter: function () {
                        this.domNode.innerHTML = "Twitter Timeline";
                    }
                }
            });
        }
    );

    run.modify("rdw/InflowSummaryGroup", "rdw/ext/twitter/ext-rdw/InflowSummaryGroup",
        ["rdw/InflowSummaryGroup"],
        function () {
            rd.applyExtension("rdw/ext/twitter/ext", "rdw/InflowSummaryGroup", {
                before: {
                    //Do this before the rd.api.subscribe call happens.
                    postCreate: function () {
                        this.twitterCountNode = dojo.create("li", null, this.containerNode);
                    }
                },
            
                after: {
                    //TODO: this might need to be done differently. Instead of looping
                    //over all conversations again, maybe have InflowSummaryGroup call a
                    //method for each convo in conversations, but that path has lots of
                    //function calls, so may be faster just to iterate over the whole list again.
                    onApiUpdate: function (conversations) {
                        var i, j, convo, id, unread = 0;
                        if (conversations && conversations.length) {
                            for (i = 0; (convo = conversations[i]); i++) {
                                for (j = 0; (id = convo.message_ids[j]); j++) {
                                    if (id[0] === "tweet") {
                                        unread += 1;
                                    }
                                }
                            }
                        }
                        //TODO: not localized.
                        dojo.place('<span class="count">' + unread + '</span> new tweet' + (unread !== 1 ? 's' : ''), this.twitterCountNode, "only");
                    }
                }
            });
        }
    );

    run.modify("rdw/Conversations", "rdw/ext/twitter/ext-rdw/Conversations",
        ["rdw/Conversations", "rdw/ext/twitter/Conversation"],
        function () {
            rd.applyExtension("rdw/ext/twitter/ext", "rdw/Conversations", {
                addToPrototype: {
                    convoModules: [
                        "rdw/ext/twitter/Conversation"
                    ],
        
                    fullConvoModules: [
                        "rdw/ext/twitter/Conversation"
                    ],
        
                    topics: {
                        "rd-protocol-twitter": "twitter"
                    },
        
                    topicConversationCtorNames: {
                        "rd-protocol-twitter": "rdw/ext/twitter/Conversation"
                    },
        
                    /** Responds to requests to show all twitter messages */
                    twitter: function () {
                        api({
                            url: 'inflow/conversations/twitter',
                            limit: this.conversationLimit,
                            message_limit: this.messageLimit
                        })
                        .ok(dojo.hitch(this, function (conversations) {
                            this.updateConversations("summary", conversations); 
                            if (this.summaryWidget.twitter) {
                                this.summaryWidget.twitter();
                            }
                        }));
                    }
                }
            });
        }
    );

    run.modify("rdw/Widgets", "rdw/ext/twitter/ext-rdw/Widgets",
        ["rdw/Widgets", "rdw/ext/twitter/Group"],
        function () {
            rd.applyExtension("rdw/ext/twitter/ext", "rdw/Widgets", {
                addToPrototype: {
                    convoModules: [
                        "rdw/ext/twitter/Group"
                    ]
                },
            
                after: {
                    onHashChange: function (value) {
                        //Hide the twitter group widgets when viewing the twitter stream,
                        //otherwise make sure they are visible.
                        var widgets = dijit.registry.byClass("rdw.ext.twitter.Group"),
                            display = value === "rd:twitter" ? "none" : "";
                        widgets.forEach(function (widget) {
                            widget.domNode.style.display = display;
                        });
                    }
                }
            });
        }
    );
});
