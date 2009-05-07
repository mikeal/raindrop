function(doc) {
  if (doc.type == 'identity' && doc.image) {
    emit(doc.identity_id, null);
  }
}
