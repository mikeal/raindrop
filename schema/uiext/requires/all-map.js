function(doc) {
  if (doc._id.indexOf("uiext!") == 0 && doc.requires) {
    emit(doc.requires, null);
  }
}
