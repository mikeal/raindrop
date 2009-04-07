function(doc) {
    if (doc.type && doc.type=='proto/skype-chat') {
        emit([doc.skype_chatname, null], null);
    } else if (doc.type && doc.type=='proto/skype-msg') {
        emit([doc.skype_chatname, doc.skype_id], null);
    }
}
