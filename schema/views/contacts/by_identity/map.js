function(doc) {
  if (doc.type == "contact") {
    for each (var identity in doc.identities) {
      emit([identity.kind, identity.value], doc);
    }
  }
}