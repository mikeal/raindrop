# Emit rd.msg.recip-target schemas for skype chats.

# A set of skype ids which mean 'me' - usually only 1, but you never know...
my_identities = None

def handler(src_doc):
    global my_identities
    if my_identities is None:
        my_identities = set()
        key=['rd.account', 'kind', 'skype']
        result = open_view(key=key, reduce=False, include_docs=True)
        for row in result['rows']:
            if 'doc' in row and 'username' in row['doc']:
                un = row['doc']['username']
                my_identities.add(un)
                logger.debug('found skype ID %r', un)
        logger.info('found %d skype identities', len(my_identities))

    assert src_doc['rd_schema_id'] == 'rd.msg.skypemsg.raw'

    skype_users = src_doc['skype_chat_members']
    has_me = len(my_identities.union(set(skype_users))) != 0
    if src_doc['skype_from_handle'] in my_identities:
        val = 'from'
    elif has_me and len(skype_users)==2:
        # between me an 1 other - that is 'direct'
        val = 'direct'
    elif has_me:
        val = 'group'
    else:
        # no such thing as a 'broadcast' message for skype - presumably this
        # is a replicated message from someone else or something...
        val = None
    if val is not None:
        timestamp = src_doc['skype_timestamp']
        items = {'target' : val,
                 'timestamp': timestamp,
                 'target-timestamp': [val, timestamp],
                 }
        emit_schema('rd.msg.recip-target', items)
