function(doc) {
  // A doc type of 'contacts' is what holds the relationship from our
  // identity back to the contact...
  if (doc.type == "contacts") {
    for each (var [contact_id, rel] in doc.contacts) {
      emit(doc.identity_id, [contact_id, rel])
    }
  }
}
