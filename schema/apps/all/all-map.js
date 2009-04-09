function(doc) {
  if (doc._id.indexOf("app!app/") == 0) {
    emit(doc._id, null);
  }
}
