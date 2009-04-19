function(doc) {
  if (doc._id.indexOf("ui!") == 0) {
    emit(doc._id, null);
  }
}
