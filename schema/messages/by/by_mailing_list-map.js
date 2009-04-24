function(doc) {
  if (doc.type && doc.type == "message" && doc.mailing_list)
    emit(doc.mailing_list.id, doc._rev);
}
