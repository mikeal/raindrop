function(doc) {
  if (doc.type == 'contact') {
    emit(doc.contact_id, null);
  }
}
