function(keys, values) {
  return values.length ? Math.max.apply(Math, values) : 0;
}
