dojo.provide("rdw.MailingListSummary");

dojo.require("rdw._Base");

dojo.declare("rdw.MailingListSummary", [rdw._Base], {
  // The ID of the mailing list.  This must be passed to the constructor
  // so postCreate can use it to retrieve the document from the datastore.
  id: null,

  // The CouchDB document for the mailing list.  Retrieved upon postCreate.
  // Warning: this is a prototype property; be sure to set it per instance.
  doc: {},

  // Nodes in the template.  Attached to instances via dojoAttachPoint.
  // Commented out because it isn't clear if they can/should be declared.
  //titleNode: null,
  //subscriptionToolNode: null,

  templatePath: dojo.moduleUrl("rdw.templates", "MailingListSummary.html"),

  postMixInProperties: function() {
    //summary: dijit lifecycle method before template is created.
    this.inherited("postMixInProperties", arguments);
  },

  postCreate: function() {
    //summary: dijit lifecycle method after template insertion in the DOM.

    this._get(
      dojo.hitch(this, function() {
        this._display();
      }),
      dojo.hitch(this, function(error) {
        // XXX Display some message to the user about the error retrieving
        // the mailing list from the datastore?
      })
    );
  },

  _display: function() {
    rd.escapeHtml(this.doc.id, this.titleNode, "only");

    // TODO: make this localizable.
    // TODO: make this reflect the status of the subscription.
    switch(this.doc.status) {
      case "subscribed":
        rd.escapeHtml("Unsubscribe", this.subscriptionToolNode, "only");
        break;
      case "unsubscribe-pending":
        // TODO: disable the link when in this state.
        rd.escapeHtml("Unsubscribe Pending", this.subscriptionToolNode, "only");
        break;
    }
  },

  /**
   * Get the mailing list document from the datastore.
   *
   * @param callback {Function} success callback. Will receive an object.
   * @param errback {Function} optional error callback. Will receive an error
   * object as an argument, but that error object is not strictly defined.
   */
  _get: function(/*Function*/callback, /*Function*/errback) {
    rd.store.megaview({
      key: ['rd.mailing-list', 'id', this.id],
      reduce: false,
      include_docs: true,
      success: dojo.hitch(this, function(json) {
        if (json.rows.length > 0)
          this.doc = json.rows[0].doc;
        callback();
      }),
      error: errback
    });
  },

  /**
   * Put the mailing list document into the datastore.
   *
   * @param callback {Function} success callback. Will receive an object.
   * @param errback {Function} optional error callback. Will receive an error
   * object as an argument, but that error object is not strictly defined.
   */
  _put: function(/*Function*/callback, /*Function*/errback) {
    // XXX Do we have to update our copy of the document in the callback
    // because its _rev has changed?
    dojo.store.put(this.doc, callback, errback);
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

  _extractParams: function(query) {
    var params = {};

    for each (var param in query.split("&")) {
      var name, value;

      if (param.indexOf("=") != -1) {
        var components = param.split("=");
        name = components[0];
        value = decodeURIComponent(components[1]);
      }
      else {
        name = param;
        value = null;
      }

      // TODO: make this support multiple same-named params (put their values
      // into an array?).
      params[name] = value;
    }

    return params;
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
    // TODO: do all this in the mailing list extractor extension so we know
    // whether or not we understand how to unsubscribe from this mailing list
    // right from the start and can enable/disable the UI accordingly.
    if (!this.doc.unsubscribe)
      throw "can't unsubscribe from mailing list; no unsubscribe info";
    var regex = this._getLinkExtractorRegex(["mailto"]);
    var match = regex.exec(this.doc.unsubscribe);
    if (match == null)
      throw "can't unsubscribe from mailing list; no mailto: URL";
    //alert("unsubscribe URL: " + match[0]);

    // TODO: retrieve the list from the store again and make sure its status
    // is still "subscribed" and we're still able to unsubscribe from it.

    this.doc.status = "unsubscribe-pending";
    this._put(
      dojo.hitch(this, function(doc) {
        this._display();
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

    var params = this._extractParams(url.query);

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
        alert("unsubscribe request sent");
      }),
      dojo.hitch(this, function(error) {
        alert("error sending unsubscribe request: " + error);
        // TODO: set the list's status back to "subscribed".
      })
    );
  },

  destroy: function() {
    //summary: dijit lifecycle method.
    this.inherited("destroy", arguments);
  }

});
