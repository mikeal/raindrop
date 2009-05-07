function(doc) {
  if (doc.type == 'message' && doc.mailing_list && 
      doc.mailing_list.id && doc.mailing_list.name)
    emit([doc.mailing_list.id, doc.mailing_list.name], 1);
}
