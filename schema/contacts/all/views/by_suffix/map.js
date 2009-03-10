function(doc) {
  if (doc.type == "contact") {
    var i, suffix;
    for (i = 0; i < doc.name.length; i++) {
      suffix = doc.name.substring(i);
      if (suffix && suffix[0] != " ")
        emit(suffix, null);
    }
    for each (var identity in doc.identities) {
      for (i = 0; i < identity.value.length; i++)
        suffix = identity.value.substring(i);
      if (suffix && suffix[0] != " ")
        emit(suffix, null);
    }
  }
}