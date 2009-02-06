/* copy most of noun_type_contact */
var noun_type_rdcontact = {
  _name: "rdcontact",
  contactList: null,
  callback:function(contacts) {
    noun_type_contact.contactList = noun_type_contact.contactList.concat(contacts);
  },

  suggest: function(text, html) {
    
    if (noun_type_contact.contactList == null) {
      noun_type_contact.contactList = [];
      getRainDropContacts( noun_type_contact.callback );
      var suggs = noun_type_email.suggest(text, html);
      return suggs.length > 0 ? suggs : [];
    }

    if( text.length < 1 ) return [];

    var suggestions  = [];
    for ( var c in noun_type_contact.contactList ) {
      var contact = noun_type_contact.contactList[c];
      
      if ((contact["name"].match(text, "i")) || (contact["email"].match(text, "i"))){
	      suggestions.push(CmdUtils.makeSugg(contact["name"], "<span class='selection'>" + contact["email"] + "</span>", contact));
	    }
    }

    var suggs = noun_type_email.suggest(text, html);
    // TODO the next line would be a lot clearer as an if() {} statement.
    suggs.length > 0 ? suggestions.push(suggs[0]) : null;

    return suggestions.splice(0, 5);
  }
};

/* grab all contacts from the raindrop system */
function getRainDropContacts( callback ){
  
  var url = "http://localhost:5984/contacts/_all_docs";

  var params = {
      "include_docs" : true,
  };
  
  jQuery.get(url, params, function(data) {

    var contacts = [];
    for each( var line in data.rows ){
      
      var name = line.doc.name; 
      for each( var idx in line.doc.identities ) {
        if ( idx.kind == "email" ) {
          var contact = {};
          contact["name"] = name;
          contact["email"] =  idx.value;
          contact["doc"] = line.doc
          contacts.push(contact);
        }
      }
    }
    callback(contacts);
  }, "json");

}

/*
function getUbiquity(){
  var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                     .getInterface(Components.interfaces.nsIWebNavigation)
                     .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                     .rootTreeItem
                     .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                     .getInterface(Components.interfaces.nsIDOMWindow);
  
  return mainWindow.gUbiquity;  
}

jQuery("#RainDropQuery", CmdUtils.getDocument()).mousedown(function(event){
  CmdUtils.log("trying to open");
  CmdUtils.log(CmdUtils.getDocument());
  getUbiquity().openWindow(event.target);
  event.stopPropagation();
})
*/

var MAX_TIMESTAMP = 4000000000;

CmdUtils.CreateCommand({
  homepage: "http://www.mozillamessaging.com/",
  author: { name: "Bryan Clark", email: "clarkbw@mozillamessaging.com"},
  license: "GPL/MPL/",

  name: "raindrops",
  synonyms: ["emails"],
  modifiers: {from: noun_type_rdcontact},
  url: "http://localhost:5984/junius/files/index.xhtml#{QUERY}",
  icon: "http://localhost:5984/favicon.ico",
  description: "Searches <a href=\"http://localhost:5984/junius/files/index.xhtml\">rain drop</a> for messages matching your words.",
  preview: function(pblock, directObject, modifiers){

    var contact = modifiers.from.data;
    
    var url = "http://localhost:5984/messages/_view/by_involves/by_involves";
    var params = {
                  "startkey" : '["' + contact.doc._id + '",0]',
                  "endkey"   : '["' + contact.doc._id + '",' + MAX_TIMESTAMP + ']',
                  "limit" : 5,
                  "include_docs" : true,
    };

    CmdUtils.previewGet( pblock, url, params, function(data) {

      var previewData = {
          results: data.rows,
          c: contact,
      };

      // JavaScript Templates
      // http://code.google.com/p/trimpath/wiki/JavaScriptTemplates
      pblock.innerHTML = CmdUtils.renderTemplate(
        '<h3>${c.name} <span style="color:gray;font-size:smaller;">${c.email}</span></h3>' +
        '<ul style="list-style:none;">' +
        '{for row in results}' + 
          '<li style="margin:0.8ex 0px;">' + 
            '<div style="">${row.doc.headers.Subject}</div>' +
            '<div style="color:gray;font-size:x-small;white-space:nowrap;overflow:hidden">${row.doc.bodyPart.data.substring(0,128)}</div>' +
          '</li>' + 
        '{/for}' +
        '</ul>',
        previewData);

    }, "json");

  }
});

