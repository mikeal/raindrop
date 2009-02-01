function(doc) {
  if (doc.type == "message") {
    if (doc.timestamp)
      emit(doc.conversation_id, null);
  }
}