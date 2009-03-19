function(doc) 
{
    var root_id = doc._id.split("!", 1)[0];
    emit(root_id, null);
}
