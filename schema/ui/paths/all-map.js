function(doc) {
  if ((doc._id.indexOf("ui!") == 0 || doc._id.indexOf("uiext!") == 0)
    && doc.modulePaths) {
    emit(doc.modulePaths, null);
  }
}
