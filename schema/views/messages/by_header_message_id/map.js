function(doc) {
  if (doc.type == "message" && doc.subtype == "rfc822") {
    emit(doc.header_message_id, null);
  }
}