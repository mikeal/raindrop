function(doc) {
  if (doc.type == "message") {
    if (doc.tags) {
      for (var i = 0; i < doc.tags.length; i++)
        emit([doc.tags[i], doc.timestamp], doc.conversation_id);
    }
  }
}