function(doc) {
  if (doc.type == "message") {
    for each (var contact_id in doc.involves_contact_ids)
      emit([contact_id, doc.timestamp], doc.conversation_id);
  }
}