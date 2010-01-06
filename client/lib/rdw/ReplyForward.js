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

/*jslint nomen: false, plusplus: false */
/*global run: false, setTimeout: false */
"use strict";

run("rdw/ReplyForward",
["rd", "dojo", "rdw/QuickCompose", "dijit/form/Textarea"],
function (rd, dojo, QuickCompose, Textarea) {

    return dojo.declare("rdw.ReplyForward", [QuickCompose], {
        //Valid replyTypes: "reply" and "forward"
        replyType: "reply",
    
        //Owner widget that is showing this instance.
        //Used to tell owner if we destroy ourselves.
        owner: null,

        /**
         * Dijit lifecycle method, before template generated
         */
        postMixInProperties: function () {
            this.inherited("postMixInProperties", arguments);
            this.sendButtonText = this.i18n[this.replyType];
        },

        /** Dijit lifecycle method, after template in DOM */
        postCreate: function () {
            this.inherited("postCreate", arguments);
    
            //Add an extra class for specific styling as well as a class name
            //to identify the widget.
            dojo.addClass(this.domNode, "rdwReplyForward");
            dojo.addClass(this.domNode, this.replyType);
    
            //Make the textarea expand to fit its content.
            this.textArea = this.addSupporting(new Textarea({}, this.textAreaNode));
            this.textAreaNode = this.textArea.domNode;
        },

        /**
         * Override of QuickCompose method. Set the to, subject and
         * body appropriately here.
         * @param {String} sender
         */
        updateFields: function (sender) {
            this.inherited("updateFields", arguments);
    
            var body = this.msg.schemas["rd.msg.body"], subject;
    
            //Set To field
            this.defaultFromAddr = body.from[1];
    
            //Set Subject
            subject = body.subject;
            if (subject) {
                subject = this.i18n[this.replyType + "SubjectPrefix"] + subject;
            } else {
                dojo.style(this.subjectInputNode, "display", "none");
            }
            rd.escapeHtml(subject || "", this.subjectInputNode);
        
            //Set body.
            //TODO: this is really hacky. Need a nice, localized time with
            //the person's name, better quoting, etc... the \n\n is bad too.
            //this.textAreaNode.value = body.body.replace(/^/g, "> ").replace(/\n/g, "\n> ") + "\n\n";
            //For now just set to empty for quick reply, but probably need quoting for full message view.
            this.textAreaNode.value = "";
            setTimeout(dojo.hitch(this, function () {
                this.onFocusTextArea();
                this.textAreaNode.focus();
            }));
    
            //TODO: do we need to store mail headers in the outgoing document to get
            //replies to thread correctly in other email clients?
        },

        /** Override of QuickCompose, so the to can be preset. */
        initToSelector: function () {
            this.inherited("initToSelector", arguments);
            this.toSelectorWidget.attr("value", this.defaultFromAddr);
        },

        /**
         * Handles clicks to close icon, destroying this widget.
         * @param {Event} evt
         */
        onCloseClick: function (evt) {
            //Tell cooperating widget so this widget is displayed properly.
            if (this.owner) {
                this.owner.responseClosed();
            }
    
            this.destroy();
    
            dojo.stopEvent(evt);
        }
    });
});
