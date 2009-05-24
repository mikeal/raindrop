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
      var val = doc[prop];
      // If the doc has a special attribute rd_megaview_expandable and this
      // property is in it, then that attribute is an array that each
      // elt can be expanded - eg 'tags'. We can't do this unconditionally as
      // things like identity_ids don't make sense expanded. Note we may also
      // want to unpack real objects?
      var expand;
      var look = doc.rd_megaview_expandable || [];
      for (var i=0; i<look.length && !expand; i++) {
        if (prop==look[i]) {
          expand = true;
        }
      }
      if (expand) {
        for (var i=0; i<doc[prop].length; i++)
          emit([doc.rd_schema_id, prop, doc[prop][i]],
               {'_rev': doc._rev,
                'rd_key' : doc.rd_key,
                'rd_ext' : doc.rd_ext,
               });
      } else {
        emit([doc.rd_schema_id, prop, doc[prop]],
             {'_rev': doc._rev,
              'rd_key' : doc.rd_key,
              'rd_ext' : doc.rd_ext,
             });
      }
    }
  }
}
