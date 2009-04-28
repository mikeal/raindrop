function(doc) {
  if (doc.type == 'identity') {
    emit([doc.identity_id[0], doc.identity_id[1], !!doc.image], doc._id);
  }
}
