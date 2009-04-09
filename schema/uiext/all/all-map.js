function(doc) {
  if (doc._id.indexOf("app!") == 0 && doc.provide && doc.location) {
    emit(doc.provide, doc.location);
  }
}
