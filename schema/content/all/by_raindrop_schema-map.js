function(doc) {
    if (doc.rd_schema_id)
        // XXX - rename to 'by_schema_and_key' or something???
        emit([doc.rd_schema_id, doc.rd_key], doc._rev);
}
