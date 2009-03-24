// This is intended to be a generic view, usable by all accounts for all 
// *raw* message types.
// Key is always: doc_subtype, account_id, storage_spec_key, and
// 'startkey' and 'endkey' can be used to select specific message
// subtypes for a particular account.
// Storage key is any value which is determined by each message subtype.
function(doc) {
  if (doc.type == 'rawMessage' && doc.subtype && doc.account_id && doc.storage_key)
      emit([doc.subtype, doc.account_id, doc.storage_key], null);
}
