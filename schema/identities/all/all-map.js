function(doc) {
  if (doc.type == 'identity') {
    emit(doc.identity_id, null);
  }
}
