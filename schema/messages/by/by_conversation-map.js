function(doc) {
  if (doc.type && doc.type=='anno/tags' && doc.conversation_id) {
    var id = doc._id;
    var emit_id = id.substr(0, id.indexOf('!')) + '!message';
    emit(doc.conversation_id, emit_id);
  }
}
