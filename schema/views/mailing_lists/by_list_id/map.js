function(doc) {
  if (doc.type == 'message') {
    if (doc.headers && doc.headers["List-Id"]) {
      var parts = doc.headers["List-Id"].match(/([\W\w]*)\s*<(.+)>.*/);
      var values = {
        "List-Id" : doc.headers["List-Id"],
        "id" : parts[2],
        "name" : parts[1]
      };
      for each (var headerId in ["List-Post","List-Archive","List-Help",
                                 "List-Subscribe","List-Unsubscribe"]) {
        if (doc.headers[headerId])
          values[headerId] = doc.headers[headerId];
      }
      emit(parts[2], values);
    }
  }
}