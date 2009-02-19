
/* copy most of noun_type_contact */
var noun_type_raindrop_contact = {
  _name: "raindrop contact",
  contactList: null,
  callback:function(contacts) {
    noun_type_raindrop_contact.contactList = noun_type_raindrop_contact.contactList.concat(contacts);
  },

  suggest: function(text, html) {
    
    if (noun_type_raindrop_contact.contactList == null) {
      noun_type_raindrop_contact.contactList = [];
      getRainDropContacts( noun_type_raindrop_contact.callback );
    }

    if( text.length < 1 ) return [];

    var suggestions  = [];
    for ( var c in noun_type_raindrop_contact.contactList ) {
      var contact = noun_type_raindrop_contact.contactList[c];

      if ((contact["name"].match(text, "i")) || (contact["value"].match(text, "i"))){
	      suggestions.push(CmdUtils.makeSugg(contact["name"], null, contact));
	      if (suggestions.length > 5) return suggestions;
	    }
    }

    return suggestions;
  }
};

/* grab all contacts from the raindrop system */
function getRainDropContacts( callback ){
  
  var url = "http://localhost:5984/contacts/_view/contacts/all";

  var params = {
    "include_docs" : "true",
  };
  
  jQuery.get(url, params, function(data) {

    var contacts = [];
    for each( var row in data.rows ){

      var contact = { "name" : row.doc.name,
                      "doc" : row.doc,
                      "value" : "" };

      for each( var idx in row.doc.identities ) {
        contact["value"] +=  idx.value + " ";
      }

      contacts.push(contact);
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

  name: "where",
  modifiers: {is: noun_type_raindrop_contact},
  url: "http://localhost:5984/junius/files/index.xhtml#{QUERY}",
  icon: "http://localhost:5984/favicon.ico",
  description: "Finds your contacts location from <a href=\"http://localhost:5984/junius/files/index.xhtml\">rain drop</a>.",
  preview: function(pblock, directObject, modifiers){
    var host = "http://localhost:5984";
    var contact = modifiers.is.data;

    if ( ! contact ) return;

    pblock.innerHTML = "" +
                      '<h2>' + contact.name + '</h2>' +
                      '<img src="' + host + '/contacts/' + contact.doc["_id"] + 
                      '/default"/>';
                      
    pblock.innerHTML += '<ul>';

    for each ( var idx in contact.doc.identities )
      pblock.innerHTML += '<li style="list-style:none;">' + idx.value + '</li>';

    pblock.innerHTML += "</ul>";

    if (! contact.doc.location) {
      /* No location information, let them know and 
         exit from the rest of the code */
      pblock.innerHTML += "<strong>I don't know where this person is... :(</strong>";
      return;
    }
    
    pblock.innerHTML += '<h4>' + contact.doc.location + '</h4>';

    pblock.innerHTML += "<span id='loading'>Mapping...</span>";


    var mapUrl = "http://maps.google.com/staticmap?";
    var API_KEY = "ABQIAAAAO0oNFUXoUNx4MuxcPwakNhR3yUCx-o6JvWtDFa7jNOakHN7MrBSTsaKtGJjaVMeVURIpTa3cD1qNfA";
    // This API key is for https://people.mozilla.com only."

    var default_params = {
      size: "500x300",
      key: API_KEY,
      zoom : 13,
      sensor : false
    };

    var mapURL = mapUrl + jQuery.param( default_params );
    var doc = context.focusedWindow.document;
    var img = doc.createElement( "img" );
    jQuery(pblock).append( img );

    CmdUtils.geocodeAddress( contact.doc.location, function(points){
      if( points != null){

        jQuery( "#loading:visible", pblock).slideUp();

        var params = {
          lat: points[0].lat,
          "long": points[0].long,
        };

        img.src = mapURL + CmdUtils.renderTemplate( "&center=${lat},${long}", params );

        jQuery( pblock ).animate( {height: "+=6px"} );
      }
    });

  }
});


CmdUtils.CreateCommand({
  homepage: "http://www.mozillamessaging.com/",
  author: { name: "Bryan Clark", email: "clarkbw@mozillamessaging.com"},
  license: "GPL/MPL/",

  name: "raindrops",
  synonyms: ["emails"],
  modifiers: {from: noun_type_raindrop_contact},
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
        '<h3>${c["name"]} <span style="color:gray;font-size:smaller;">${c["value"]}</span></h3>' +
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

