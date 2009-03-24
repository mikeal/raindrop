function(keys, values, rereduce) {
  var output = {};
  output.count = values.length;
  for (var idx in values) {
    for (var elm in values[idx]) {
      output[elm] = values[idx][elm];
    }
  }
  return output;
}