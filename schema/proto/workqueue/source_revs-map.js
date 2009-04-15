function(doc) {
    if (doc.raindrop_sources)
        emit(doc._id, doc.raindrop_sources);
}
