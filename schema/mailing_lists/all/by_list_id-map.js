function(doc) {
  if (doc.type == 'message' && doc.mailing_list && doc.mailing_list.id)
    /* not every list has a name but they all need an ID */
    emit([doc.mailing_list.id, doc.mailing_list.name || doc.mailing_list.id], 1);
}
