function(doc) {
    if (doc.type=='proto/imap') {
        // imap uses a storage_key field which is already [foldername, uid]
        // we include [flags, _rev] as the value so the protocol impl can see
        // if things have changed.
        emit(doc.storage_key, [doc.imap_flags, doc._rev]);
    }
}
