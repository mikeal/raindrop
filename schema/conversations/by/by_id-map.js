// emits message ids by conversation ID, so we can map a message
//to a conversation ID.

function(doc) {
  if (doc.type == 'message' && doc.conversation_id) {
    emit(doc._id, doc.conversation_id);
  }
}
