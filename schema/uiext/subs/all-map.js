function(doc) {
  if (doc._id.indexOf("uiext!") == 0 && doc.subscriptions) {
    emit(doc.subscriptions, null);
  }
}
