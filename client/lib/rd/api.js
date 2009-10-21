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

dojo.provide("rd.api");

dojo.require("rd.api.Api");
dojo.require("rd.api.identity");
dojo.require("rd.api.contact");
dojo.require("rd.api.me");
dojo.require("rd.api.message");
dojo.require("rd.api.conversation");

//The real action is in rd.api.Api, due to load order issues.
//We want to load all the rd.api.* extensions first, but they depend
//on rd.api.extend, which if defined in this file will not be available
//when the extension modules execute.