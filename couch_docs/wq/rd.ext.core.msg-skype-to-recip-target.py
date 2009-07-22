# Emit rd.msg.recip-target schemas for skype chats.

def handler(src_doc):
    # fetch the list of identities which mean 'me' - hopefully one is a
    # 'skype' one :)
    my_identities = get_my_identities()
    skype_users = src_doc['skype_chat_members']
    has_me = False
    for su in skype_users:
        if su in my_identities:
            has_me = True
            break
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
