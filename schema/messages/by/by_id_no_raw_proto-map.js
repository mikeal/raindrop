function(doc) {
  var id = doc['_id'];
  var type = doc.type;

  //Include all msg-related documents, except for
  //proto and raw messages since they should not be
  //used for the front-end.
  if (id.indexOf('msg!') == 0
      && type
      && type.indexOf("raw") != 0
      && type.indexOf("proto") != 0) {
    [msg, base, msgtype] = id.split('!', 2);
    emit(msg+'!'+base, doc['type']);
  }
}
