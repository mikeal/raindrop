function(doc) {
    if (doc.type && doc.type=='anno/tags' && doc.tags) {
        var id = doc._id;
        var emit_id = id.substr(0, id.indexOf('!')) + '!message';
        for (var i = 0; i < doc.tags.length; i++)
            emit(doc.tags[i], null);
    }
}
