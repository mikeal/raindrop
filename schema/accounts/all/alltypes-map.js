function(doc) {
  if (doc.type == "account") {
    emit(doc.username, doc.kind);
  }
}