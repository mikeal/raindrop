function(doc) {
  if (doc.type == 'message') {
    if (doc.headers && doc.headers["List-Id"]) {
      var parts = doc.headers["List-Id"].match(/[\W\w\s]*<(.+)>.*/);
      emit([parts[1], doc.timestamp], doc.conversation_id);
    }
  }
}
