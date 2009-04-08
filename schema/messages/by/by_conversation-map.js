function(doc) {
  if (doc.type=='anno/tags' && doc.conversation_id) {
    var id = doc._id;
    var [msg, pid, doc_type] = id.split('!', 2);
    emit(doc.conversation_id, msg + "!" + pid + "!message");
  }
}
