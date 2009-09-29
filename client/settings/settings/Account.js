dojo.provide("settings.Account");

dojo.require("rd.api");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.declare("settings.Account", [dijit._Widget, dijit._Templated], {
  //The couchdb doc.
  doc: null,

  //HTML template for simple cases.
  simpleAccount: dojo.cache("settings", "AccountSimple.html"),

  kindProps: {
    gmail: {
      _name: "Gmail",
      _domain: "mail.google.com/",
      _userNameSuffix: "@gmail.com",
      proto: "imap",
      port: 993,
      ssl: true
    },
    twitter: {
      _name: "Twitter",
      _domain: "twitter.com/",
      _userNameSuffix: "",
      proto: "twitter"
    }
  },

  commonDocProps: {
    username: "",
    name: "",
    password: "",
    rd_megaview_expandable: "identities",
    rd_schema_id: "rd.account"
  },

  postMixInProperties: function() {
    this.inherited("postMixInProperties", arguments);

    this.kindDocProps =  this.kindProps[this.doc.kind];

    if (!this.doc._id) {
      this.doc = this.generateDoc(this.doc);
    }

    //Choose the right template. For now, just always use simple account.
    this.templateString = this.simpleAccount;
  },

  generateDoc: function(doc) {
    //fills in missing doc info so a proper save can be done.
    dojo.mixin(doc, this.commonDocProps);
    
    //Skip properties with underscores, those are used for non-couch purposes.
    for (var prop in this.kindDocProps) {
      if (prop.indexOf("_") != 0) {
        doc[prop] = this.kindDocProps[prop];
      }
    }

    return doc;
  },

  onSave: function(evt) {
    //If username has changed, then delete the old document and generate
    //a new doc?
    dojo.stopEvent(evt);

    var userName = dojo.trim(this.userNameNode.value || "");
    var password = this.passwordNode.value;
    if (userName) {
      this.doc.password = password;
      this.doc.name = userName;
      this.doc.username = userName + this.kindDocProps._userNameSuffix;
      this.doc.rd_key = [
        "raindrop-account",
        "account!" + this.doc.name + "-" + this.doc.kind
      ];

      this.doc.identities = [
        [(this.doc.proto == "imap" ? "email" : this.doc.proto), this.doc.username]
      ];

      rd.api().put({
        doc: this.doc
      })
      .ok(this, function(doc) {
        //Update the rev.
        this.doc._rev = doc._rev;
        
        if (this.doc.kind == "gmail") {
          //Need to create an smtp record too.
          //TODO: make this extensible.
          //First see if there is an existing record
          //and delete it.
          rd.api().megaview({
            key: ["rd.account", "proto", "smtp"],
            reduce: false,
            include_docs: true
          })
          .ok(this, function(json) {
            if (json.rows.length) {
              rd.api().deleteDoc({
                doc: json.rows[0].doc
              })
              .ok(this, function() {
                this.saveSmtpDoc();
              })
            } else {
              this.saveSmtpDoc();
            }
          })
        } else {
          this.accountSaved();
        }
      })
      .error(this, "onError");
    }
  },

  saveSmtpDoc: function() {
    rd.api().put({
      doc: {
        host: "smtp.gmail.com",
        id: "smtp",
        identities: [
          ["email", this.doc.username]
        ],
        name: "smtp",
        port: 587,
        proto: "smtp",
        rd_key: [
          "raindrop-account",
          "account!smtp"
        ],
        rd_megaview_expandable: [
          "identities"
        ],
        rd_schema_id: "rd.account",
        rd_source: null,
        ssl: false,
        username: this.doc.username,
        password: this.doc.password
      }
    })
    .ok(this, function() {
      this.accountSaved();
    });
  },

  onDelete: function(evt) {
    dojo.stopEvent(evt);

    if (this.doc._id){
      rd.api().deleteDoc({
        doc: this.doc
      })
      .ok(this, function() {
        this.userNameNode.value = "";
        this.passwordNode.value = "";
        this.userNameDisplayNode.innerHTML = "";
        this.showMessage("Account Deleted");
      });
    }
  },

  onError: function(err) {
    alert(err);
  },
  
  accountSaved: function() {
    this.showMessage("Account Saved");
    rd.escapeHtml(this.doc.name, this.userNameDisplayNode, "only");
  },

  showMessage: function(message) {
    rd.escapeHtml(message, this.messageNode, "only");
    setTimeout(dojo.hitch(this, function() {
      this.messageNode.innerHTML = "&nbsp;";
    }), 5000);
  }
});
