function(doc) {
  if(doc.type
    && doc.type.indexOf("account") != 0
    && doc.type.indexOf("ghost") != 0
    && doc.type.indexOf("raw") == -1
    && doc.type.indexOf("workqueue") != 0
    && doc.type.indexOf("ui") != 0) {
    for (var prop in doc) {
        if(prop.indexOf("_") != 0 && prop.indexOf("body") != 0 && prop.indexOf("raindrop") != 0) {
          emit([prop, doc[prop], doc.type, (doc.timestamp || 0)], doc._id)
      }
    }
  }
}
