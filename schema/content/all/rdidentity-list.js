function(head, req) {
  var row;
  send('{"rows": [');

  var identity = req.query.identity || "";
  var type = req.query.type || "";

  //Generate case-insensitive regexp matching at the start
  //of strings or word boundaries.
  var re = new RegExp("(\\b|^)" + identity.replace(/\\/g, "\\\\"), "i");

  var prefix = "";
  while((row = getRow(true))) {
    var id_id = row.value.rd_key[1];
    if ((!type || id_id[0] == type) && re.test(id_id[1])) {
        send(prefix + toJSON(row));
        if (!prefix) {
          prefix = ",";
        }
    }
  };
  send("]}");
};
