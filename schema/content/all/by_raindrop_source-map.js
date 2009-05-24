function(doc) {
    if (doc.rd_source)
        emit(doc.rd_source, doc._rev);
}