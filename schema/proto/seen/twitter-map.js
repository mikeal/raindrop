function(doc) {
    if (doc.type=='proto/twitter') {
        // Twitter uses an incrementing ID per user, and allows us to fetch
        // only tweets since that ID.  This allows us to use map/reduce to
        // find the exact ID we need per user.
        emit(doc.twitter_user.toString(), doc.twitter_id);
    }
}
