function(doc) {
  if ((doc._id.indexOf("ui!") == 0 || doc._id.indexOf("uiext!") == 0)
    && doc.provide && doc.location) {
    emit(doc.provide, doc.location);
  }
}
