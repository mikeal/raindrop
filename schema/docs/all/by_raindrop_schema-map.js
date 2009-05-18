function(doc) {
    if (doc.rd_schema_id)
        emit(doc.rd_schema_id, doc._rev);
}
