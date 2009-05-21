function(doc) {
  if (doc.rd_schema_id == 'rd/identity/contacts')
    for each (var [contact_id, rel] in doc.contacts) {
      emit([contact_id, rel], doc.rd_key);
    }
}
