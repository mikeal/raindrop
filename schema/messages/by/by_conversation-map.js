// emits conversation ids by id, so we can look up all messages in a conversation

function(doc) {
  if (doc.type == 'message' && doc.conversation_id) {
    emit(doc.conversation_id, null);
  }
}
