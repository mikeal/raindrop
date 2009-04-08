function(doc) {
    if (doc.type=='anno/tags' && doc.tags) {
        for (var i = 0; i < doc.tags.length; i++)
            emit(doc.tags[i], doc._id);
    }
}
