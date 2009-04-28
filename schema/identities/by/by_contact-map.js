function(doc) {
  if (doc.type=='contacts')
    for each (var [contact_id, rel] in doc.contacts) {
      emit([contact_id, rel], doc.identity_id);
    }
}
