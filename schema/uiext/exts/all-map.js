function(doc) {
  if (doc._id.indexOf("uiext!") == 0 && doc.exts) {
    emit(doc.exts, null);
  }
}
