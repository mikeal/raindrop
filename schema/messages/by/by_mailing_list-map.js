function(doc) {
  if (doc.type && doc.type == "message" && doc.mailing_list)
    emit(doc.mailing_list.id, {'conversation_id': doc.conversation_id});
}
