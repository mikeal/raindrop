function(doc) {
  if (doc.rd_schema_id
    && !doc.rd_ignore_megaview
    && doc.rd_schema_id.indexOf("raw") == -1
    && doc.rd_schema_id.indexOf("workqueue") != 0
    && doc.rd_schema_id.indexOf("ui") != 0) {
    for (var prop in doc) {
        //Skip text fields that are big (better served by full
        //text search), private props and raindrop-housekeeping
        //props.
        if (((typeof doc[prop] == "string") && doc[prop].length > 140)
             || prop.charAt(0) == "_"
             || prop.indexOf("rd_") == 0
             || prop.indexOf("raindrop") == 0) {
          continue;
        }
        emit([doc.rd_schema_id, prop, doc[prop]],
             {'_rev': doc._rev,
              'rd_key' : doc.rd_key,
              'rd_ext' : doc.rd_ext,
             });
    }
  }
}
