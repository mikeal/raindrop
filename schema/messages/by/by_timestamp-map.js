// emits conversation ids (and message ids) by timestamp, to figure out what's
// recent.

function(doc) {
  if (doc.type == "message" && doc.conversation_id) {
    emit(doc.timestamp, {'conversation_id': doc.conversation_id});
  }
}
