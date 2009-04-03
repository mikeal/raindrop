function(keys, values)
{
    // we just need the largest ID we've ever seen.
    // *sob* - where is max()?
    ret = 0;
    for each (var v in values)
        if (v > ret)
            ret = v;
    return ret;
}
