function(doc) {
  if (doc.type== 'rawMessage' && doc.subtype == "rfc822")
    if (doc.storage_path && doc.storage_id)
      emit([doc.account_id, doc.storage_path, doc.storage_id], null);
}
