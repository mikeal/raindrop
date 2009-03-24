function(doc) {
  if (doc.type == "account") {
    emit(null, doc);
  }
}