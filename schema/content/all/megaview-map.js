function(doc) {
  if (doc.rd_schema_id
    && !doc.rd_ignore_megaview // XXX - afaik this is never set by anyone...
    && doc.rd_schema_id.indexOf("workqueue") != 0
    && doc.rd_schema_id.indexOf("ui") != 0) { // ui extensions should be ok here?
    // every row we emit for this doc uses an identical 'value'.
    var row_val = {'_rev': doc._rev,
                   'rd_key' : doc.rd_key,
                   'rd_ext' : doc.rd_ext_id,
                   'rd_schema_id' : doc.rd_schema_id,
                  }
    // first emit some core 'pseudo-schemas'.
    emit(['rd/core/content', 'key', doc.rd_key], row_val);
    emit(['rd/core/content', 'schema_id', doc.rd_schema_id], row_val);
    emit(['rd/core/content', 'key-schema_id', [doc.rd_key, doc.rd_schema_id]], row_val);
    emit(['rd/core/content', 'ext_id', doc.rd_ext_id], row_val);
    emit(['rd/core/content', 'ext_id-schema_id', [doc.rd_ext_id, doc.rd_schema_id]], row_val);
    // don't emit the revision from the source...
    if (doc.rd_source)
      emit(['rd/core/content', 'source', doc.rd_source[0]], row_val);
    else
      emit(['rd/core/content', 'source', null], row_val);
    
    if (doc.rd_schema_confidence)
      emit(['rd/core/content', 'rd_schema_confidence', doc.rd_schema_confidence],
           row_val);

    for (var prop in doc) {
        //Skip text fields that are big (better served by full
        //text search), private props and raindrop-housekeeping
        //props.
        if ( prop.charAt(0) == "_"
             || prop.indexOf("rd_") == 0
             || prop.indexOf("raindrop") == 0) {
          continue;
        }
        
      var val;
      // don't emit long string values, but do still emit a row with NULL
      // so it can be found.
      if ((typeof doc[prop] == "string") && doc[prop].length > 140)
        val = null;
      else
        val = doc[prop];
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
          emit([doc.rd_schema_id, prop, val[i]], row_val);
      } else {
        emit([doc.rd_schema_id, prop, val], row_val);
      }
    }
  }
}
