function(doc) {
  if (doc.type=='core/error/msg')
    // we use include_docs on this view, so get the ID magically...
    emit(doc.raindrop_seq, doc.raindrop_sources);
}
