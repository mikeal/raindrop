/* used to do the grouped queries of all documents in a message chain */

function(doc) {
  var id = doc['_id'];
  if (id.indexOf('msg!') == 0) { // XXX hack?
    [msg, base, msgtype] = id.split('!', 2);
    emit(msg+'!'+base, doc['type']);
  }
}
