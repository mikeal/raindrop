function(doc) {
  if (doc.rd_schema_id == 'rd/identity/contacts')
    for each (var [contact_id, rel] in doc.contacts) {
      // Although rd_key[0] must always be 'identity', we still return
      // the entire key to try and keep the abstraction at the 'rd_key'
      // level (ie, if we remove 'identity' the front-end etc will just
      // need to re-add it should it want to lookup a schema for the ID...)
      emit([contact_id, rel], doc.rd_key);
    }
}
