function(doc) {
  // this will look both at real messages and at ghost messages
  if (doc.header_message_id) {
    emit(doc.header_message_id, null);
  }
}
