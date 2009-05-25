function(doc) {
    // we want to include null rows...
    if (doc.rd_source !== undefined)
        emit(doc.rd_source, doc._rev);
}
