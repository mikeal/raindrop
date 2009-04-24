function(doc) {
  if (doc.type == 'message' && doc.mailing_list)
    emit(doc.mailing_list.id, doc.mailing_list);
}
