function(keys, values, rereduce) {
  var keySet = {}, i, j;
  if (!rereduce) {
    for (i = 0; i < keys.length; i++)
      keySet[keys[i][0][0]] = true;
  }
  else {
    for (i = 0; i < values.length; i++) {
      var inSet = values[i];
      for (j = 0; j < inSet.length; j++)
        keySet[inSet[j]] = true;
    }
  }
  var out = [];
  for (var key in keySet)
    out.push(key);
  out.sort();
  return out;
}