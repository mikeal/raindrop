//Use a reduce since we just want a count of each schema, mostly just to
//list the schema_ids in the database.
function(keys, values, rereduce) {
    if (rereduce)
        return sum(values)
    else
        return values.length;
}
