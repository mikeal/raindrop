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

dojo.provide("inflowgrid.story.FullStory");

dojo.require("inflowgrid.Story");
dojo.require("rdw.story.FullStory");
dojo.require("inflowgrid.story.FullMessage");

dojo.declare("inflowgrid.story.FullStory", [rdw.story.FullStory], {
  //The name of the constructor function (module) that should be used
  //to show individual messages.
  messageCtorName: "inflowgrid.story.FullMessage",

  titleTemplate: '<div class="fullMessageTitle">${title}</div><div class="toolBox"><a class="archive" href="#archive">Archive</a><a class="spam" href="#spam">Spam</a><a class="delete" href="#delete">Delete</a></div>',
  
  templateString: inflowgrid.Story.prototype.templateString
});
