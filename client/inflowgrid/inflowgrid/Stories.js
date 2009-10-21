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

dojo.provide("inflowgrid.Stories");

dojo.require("rdw.Stories");
dojo.require("inflowgrid.Story");
dojo.require("inflowgrid.story.FullStory");

dojo.declare("inflowgrid.Stories", [rdw.Stories], {
  //Widget used for story objects.
  storyCtorName: "inflowgrid.Story",

  //The widget to use to show a full story.
  fullStoryCtorName: "inflowgrid.story.FullStory",

  //List of modules that may want to group messages in the home view.
  //It is assumed that moduleName.prototype.canHandle(messageBag) is defined
  //for each entry in this array.
  homeGroups: [
    "inflowgrid.story.TwitterTimeLine"
  ],

  templateString: '<div class="rdwStories" dojoAttachEvent="onclick: onClick, onkeypress: onKeyPress">'
                + '  <div dojoAttachPoint="listNode"></div>'
                + '  <div dojoAttachPoint="convoNode"></div>'
                + '</div>'
});
