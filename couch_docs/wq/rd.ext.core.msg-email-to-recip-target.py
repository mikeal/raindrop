# Emit rd.msg.recip-target schemas for emails.

def handler(src_doc):
    # We make our lives easier by using the rd.msg.body schema, but only
    # do emails...
    if src_doc['rd_key'][0] != 'email':
        return

    my_identities = get_my_identities()
    to = src_doc.get('to', [])
    val = None
    if src_doc.get('from') in my_identities:
        val = 'from'
    # only us on the 'to' line?  That is 'direct'...
    elif len(to)==1 and to[0] in my_identities:
        val = 'direct'
    else:
        look = to + src_doc.get('cc', [])
        for maybe in look:
            if maybe in my_identities:
                val = 'group'
                break
        else:
            val = 'broadcast'
    # XXX - should this be part of the model?  That a schema can nominate
    # fields to be 'combined'?  Or is that just part of the schema defn?
    items = {'target' : val,
             'timestamp': src_doc['timestamp'],
             'target-timestamp': [val, src_doc['timestamp']],
             }
    emit_schema('rd.msg.recip-target', items)
