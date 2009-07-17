# Emit rd.msg.recip-target schemas for emails.

# A set of email addresses which mean 'me'.
my_identities = None

def handler(src_doc):
    # We make our lives easier by using the rd.msg.body schema, but only
    # do emails...
    if src_doc['rd_key'][0] != 'email':
        return

    global my_identities
    if my_identities is None:
        my_identities = set()
        keys=[['rd.account', 'kind', 'imap'], ['rd.account', 'kind', 'smtp']]
        result = open_view(keys=keys, reduce=False, include_docs=True)
        for row in result['rows']:
            if 'doc' in row and 'username' in row['doc']:
                un = row['doc']['username']
                my_identities.add(('email', un))
                logger.debug('found email address %r', un)
        logger.info('found %d email identities', len(my_identities))

    to = src_doc['to']
    val = None
    # only us on the 'to' line?  That is 'direct'...
    if len(to)==1 and tuple(to[0]) in my_identities:
        val = 'direct'
    else:
        look = to + src_doc.get('cc', [])
        for maybe in look:
            if tuple(maybe) in my_identities:
                val = 'group'
                break
        else:
            val = 'broadcast'
    if val:
        # XXX - should this be part of the model?  That a schema can nominate
        # fields to be 'combined'?  Or is that just part of the schema defn?
        items = {'target' : val,
                 'timestamp': src_doc['timestamp'],
                 'target-timestamp': [val, src_doc['timestamp']],
                 }
        emit_schema('rd.msg.recip-target', items)
