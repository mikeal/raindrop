function(doc) {
  if(doc.type
    && !doc._ignore_megaview
    && doc.type.indexOf("account") != 0
    && doc.type.indexOf("ghost") != 0
    && doc.type.indexOf("raw") == -1
    && doc.type.indexOf("workqueue") != 0
    && doc.type.indexOf("ui") != 0) {
    for (var prop in doc) {
        //Skip text fields that are big (better served by full
        //text search), private props and raindrop-housekeeping
        //props.
        if (((typeof doc[prop] == "string") && doc[prop].length > 140)
             || prop.charAt(0) == "_"
             || prop.indexOf("raindrop") == 0) {
          continue;
        }
        emit([doc.type, prop, doc[prop], (doc.timestamp || 0)], null)
    }
  }
}
