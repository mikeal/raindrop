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

dojo.provide("rdw.ext.mailingList.SummaryGroup");

dojo.require("rd.api");
dojo.require("rdw._Base");

rd.addStyle("rdw.ext.mailingList.SummaryGroup");

dojo.declare("rdw.ext.mailingList.SummaryGroup", [rdw._Base], {
  // The ID of the mailing list.  This must be passed to the constructor
  // so postCreate can use it to retrieve the document from the datastore.
  mlId: null,

  templatePath: dojo.moduleUrl("rdw.ext.mailingList", "SummaryGroup.html"),

  postCreate: function() {
    //summary: dijit lifecycle method after template insertion in the DOM.
    this.inherited("postCreate", arguments);
    rdw.ext.mailingList.model.register(this.mlId, this);
  },
  
  destroy: function() {
    //summary: dijit lifecycle method, when destroying the dijit.
    rdw.ext.mailingList.model.unregister(this.mlId, this);
    this.inherited("destroy", arguments);
  },

  onMailingListSummaryUpdate: function(doc) {
    this.doc = doc;
    dojo.attr(this.subscriptionStatusNode, "status", doc.status);
    dojo.attr(this.subscriptionActionNode, "status", doc.status);

    //Archive is not a required field, check for it
    if (doc.archive) {
        this.archiveNode.href = doc.archive[0];
    }

    // TODO: make this localizable.
    switch(doc.status) {
      case "subscribed":
        rd.escapeHtml("Subscribed", this.subscriptionStatusNode, "only");
        rd.escapeHtml("Unsubscribe", this.subscriptionActionNode, "only");
        break;
      case "unsubscribe-pending":
      case "unsubscribe-confirmed":
        rd.escapeHtml("Unsubscribe Pending", this.subscriptionStatusNode, "only");
        //XXX Future
        //rd.escapeHtml("Cancel Unsubscribe", this.subscriptionActionNode, "only");
        break;
      case "unsubscribed":
        rd.escapeHtml("Unsubscribed", this.subscriptionStatusNode, "only");
        //XXX Future
        //rd.escapeHtml("Re-Subscribe", this.subscriptionActionNode, "only");
        break;
    }
  },

 /**
   * Get a regex that matches URLs in text.  It correctly excludes punctuation
   * at the ends of URLs, so in the text "See http://example.com." it matches
   * "http://example.com", not "http://example.com.".  It is based on the regex
   * described in http://www.perl.com/doc/FMTEYEWTK/regexps.html.
   *
   * XXX Put this somewhere more general, as it isn't specific to mailing lists.
   *
   * @param schemes {Array} an optional array of protocol schemes to match.
   * If absent, the regex will match http and https.
   *
   * @private
   */
  _getLinkExtractorRegex: function(schemes) {
    schemes = schemes ? schemes : ["http", "https"];

    var scheme = "(?:" + schemes.join("|") + ")";
    var ltrs = '\\w';
    var gunk = '/#~:.?+=&%@!\\-';
    var punc = '.:?\\-';
    var any  = ltrs + gunk + punc;

    return new RegExp(
      "\\b(" + scheme + ":[" + any + "]+?)(?=[" + punc + "]*[^" + any + "]|$)",
      "gi"
    );
  },

  /**
   * Unsubscribe from a mailing list.
   *
   * This method parses the List-Unsubscribe headers of email messages
   * from lists to determine how to issue the unsubscription request.  Here are
   * some examples of the kinds of headers it should know how to handle
   * (backslash escape characters represent literal characters in the headers):
   *
   * Mailman: <http://sqlite.org:8080/cgi-bin/mailman/listinfo/sqlite-users>, \n\t
   *          <mailto:sqlite-users-request@sqlite.org?subject=unsubscribe>
   *
   * W3C: <mailto:www-style-request@w3.org?subject=unsubscribe>
   *
   * Google Groups: <http://googlegroups.com/group/raindrop-core/subscribe>, \n\t
   *                <mailto:raindrop-core+unsubscribe@googlegroups.com>
   *
   * Majordomo2: ?
   *
   * @param list {object} the list from which to unsubscribe
   */
  onSubscription: function() {
    // Don't do anything unless the user is subscribed to the list.
    if (this.doc.status != "subscribed")
      return;

    // TODO: do all this in the mailing list extractor extension so we know
    // whether or not we understand how to unsubscribe from this mailing list
    // right from the start and can enable/disable the UI accordingly.
    // TODO: If we can't unsubscribe the user, explain it to them nicely.
    if (!this.doc.unsubscribe)
      throw "can't unsubscribe from mailing list; no unsubscribe info";
    var regex = this._getLinkExtractorRegex(["mailto"]);
    var match = regex.exec(this.doc.unsubscribe);
    if (match == null)
      throw "can't unsubscribe from mailing list; no mailto: URL";
    //alert("unsubscribe URL: " + match[0]);

    if (!confirm("Are you sure you want to unsubscribe from " + this.doc.id + "?  " +
                 "You won't receive messages from the mailing list anymore, " +
                 "and if you resubscribe later you won't receive the messages " +
                 "that were sent to the list while you were unsubscribed."))
      return;

    // TODO: retrieve the list from the store again and make sure its status
    // is still "subscribed" and we're still able to unsubscribe from it.

    this.doc.status = "unsubscribe-pending";
    this._put(
      dojo.hitch(this, function(doc) {
        this._updateView();
        this._unsubscribe(match[0]);
      }),
      dojo.hitch(this, function(error) {
        // TODO: update the UI to notify the user about the problem.
        //alert("error updating list: " + error);
      })
    );
  },

  _unsubscribe: function(/*String*/spec) {
    var url = new dojo._Url(spec);
    //alert("scheme: " + url.scheme + "; authority: " + url.authority +
    //      "; path: " + url.path +   "; query: " + url.query +
    //      "; fragment " + url.fragment);

    // url.path == the email address
    // url.query == can contain subject and/or body parameters

    var params = url.query ? dojo.queryToObject(url.query) : {};

    var message = {
      //TODO: make a better rd_key.
      rd_key: ["manually_created_doc", (new Date()).getTime()],
      rd_schema_id: "rd.msg.outgoing.simple",
      from: this.doc.identity,
      // TODO: use the user's name in the from_display.
      from_display: this.doc.identity[1],
      to: [["email", url.path]],
      to_display: [url.path],
      // Hopefully the mailto: URL has provided us with the necessary subject
      // and body.  If not, we guess "subscribe" for both subject and body.
      // TODO: make better guesses based on knowledge of the mailing list
      // software being used to run the mailing list.
      subject: params.subject ? params.subject : "unsubscribe",
      body: params.body ? params.body : "unsubscribe",
      outgoing_state: "outgoing"
    };

    dojo.store.put(
      message,
      dojo.hitch(this, function(message) {
        //alert("unsubscribe request sent");
      }),
      dojo.hitch(this, function(error) {
        alert("error sending unsubscribe request: " + error);
        // TODO: set the list's status back to "subscribed".
      })
    );
  }
});
