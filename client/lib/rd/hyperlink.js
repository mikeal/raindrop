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

run("rd/hyperlink",
function () {

    return {
        /**
         * Tries to find hyperlinks in the text and adds an anchor for them,
         * by default making the link open in a new window.
         * @param {String} text
         */
        add: function (text) {
            //TODO: need to make this more robust. Woefully inadequate.
            //Needs to account for things already hyperlinked, and needs to be more robust
            //on testing the end of a hyperlink. Also test for things like mozilla.com, without
            //protocol on the front.
            //TODO: using single quotes on the href attributes due to an escape thing with
            //dijits, but should be able to sort that out in near future.
            return text.replace(/http(s)?:\S+/g, "<a href='$&' target='_blank'>$&</a>");
        },

        /**
         * Adds hyperlinks to twitter user IDs.
         * @param {String} text
         */
        addTwitterUsers: function (text) {
            //TODO: probably needs to be more robust.
            return text.replace(/\@(\w+)/g, "<a class='username' type='twitter' title='twitter.com/$1' href='http://twitter.com/$1' target='_blank'>@$1</a>");
        },

        /**
         * Adds hyperlinks to twitter tags
         * @param {String} text
         */
        addTwitterTags: function (text) {
            // TODO: we evetually want to link to our own tag search/browse system that 
            // works to pull in the twitter search as well
            return text.replace(/\#(\w+)/g, "<a class='tag' type='twitter' title='search twitter.com for tag #$1' href='http://search.twitter.com/search?q=%23$1' target='_blank'>#$1</a>");
        }
    }
});
