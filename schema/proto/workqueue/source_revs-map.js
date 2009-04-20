function(doc) {
    if (doc.raindrop_sources)
        emit(doc._id, [doc._rev, doc.raindrop_sources]);
}
