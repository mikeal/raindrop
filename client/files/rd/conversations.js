dojo.provide("rd.conversations");

dojo.require("couch");
dojo.require("rd.contact");

rd.conversations = {
  byContact: function(/*String*/contactId) {
    //summary: updates display to show messages related to
    //a given contact. Assumes there is a rdw.Stories widget
    //in the page to show the messages.

    //Get the list of identities for the user.
    rd.contact.get(contactId, dojo.hitch(this, function(contact) {
      //Pull out the identity IDs
      var ids = rd.map(contact.identities, function(identity) {
        return identity.identity_id;
      });

      //Use megaview to select all messages based on the identity
      //IDs. This is a bit tricky since we can only get messages for
      //a given identity ID, so have to do multiple calls.
      //TODO: just using the twitter identity for now, to test megaview.
      var id = null;
      rd.forEach(ids, function(iid) {
        if(iid[0] == "twitter"){
          id = iid;
        }
      });

      if (!id) {
        return;
      }

      couch.db("raindrop").view("raindrop!megaview!all/_view/all", {
        startkey: ["message", "from", id, 0],
        endkey: ["message", "from", id, 9999999999],
        include_docs: true,
        success: dojo.hitch(this, function(json) {
          //Get the list of message IDs.
          if(json.rows.length) {
            var messageDocIds = [];
            for (var i = 0, row; row = json.rows[i]; i++) {
              messageDocIds.push(row.id);
            }
          }

          //Load the conversations based on these message IDs.
          if(!messageDocIds.length) {
            return;
          }
          couch.db("raindrop").allDocs({
            keys: messageDocIds,
            include_docs: true,
            success: dojo.hitch(this, function(json) {
              //Sort the docs by time, most recent first.
              json.rows.sort(function(a, b) {
                //Make sure values are docs, to help out rdw.Stories which
                //expects the value to have the conversation_id.
                a.value = a.doc;
                b.value = b.doc;

                //Then do the sort.
                return a.doc.timestamp > b.doc.timestamp ? -1 : 1;            
              });

              //Now show the conversations in the view.
              dijit.byId("Stories").docs(json.rows);
            })
          });          
        })      
      });
    }));
  }
};

//Register to listen for protocol links for contacts.
rd.sub("rd-protocol-contact", rd.conversations, "byContact");
