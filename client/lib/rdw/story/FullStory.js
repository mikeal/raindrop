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

dojo.provide("rdw.story.FullStory");

dojo.require("rdw.Story");
dojo.require("rdw.story.FullMessage");

dojo.declare("rdw.story.FullStory", [rdw.Story], {
  //The name of the constructor function (module) that should be used
  //to show individual messages.
  messageCtorName: "rdw.story.FullMessage",

  //A style to add to any messages that are replies.
  replyStyle: "",

  titleTemplate: '<div class="fullMessageTitle">${title}</div>',

  postCreate: function() {
    //summary: dijit lifecycle method, after template is in the DOM.
    this.inherited("postCreate", arguments);

    //Inject the title
    this.title = this.msgs[0]["rd.msg.body"].subject;
    dojo.place(dojo.string.substitute(this.titleTemplate, {
      title: this.title || ""
    }), this.domNode, "first");

    dojo.addClass(this.domNode, "rdwStoryFullStory");
  }
});
