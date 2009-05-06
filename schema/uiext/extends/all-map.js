function(doc) {
  if (doc._id.indexOf("uiext!") == 0 && doc.extends) {
    emit(doc.extends, null);
  }
}
