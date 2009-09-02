# Takes the raw IMAP flags from an IMAP server and converts them to
# raindrop schema items which convey the same information.
# XXX - currently only '\\Seen' is supported...
from raindrop.proto.imap import get_rdkey_for_email

def handler(doc):
    # This is dealing with the 'imap folder state cache doc' - it stores
    # all meta-data about all items in a folder; so one document holds the
    # state for many messages.  We first need to determine which are
    # different...
    keys = []
    rdkeys = []
    imap_flags = []
    folder_name = doc['rd_key'][1][1]

    for item in doc['infos']:
        msg_id = item['ENVELOPE'][-1]
        rdkey = get_rdkey_for_email(msg_id)
        rdkeys.append(rdkey)
        keys.append(['rd.core.content', 'key-schema_id', [rdkey, 'rd.msg.seen']])
        imap_flags.append((rdkey, item['FLAGS']))
    result = open_view(keys=keys, reduce=False, include_docs=True)

    # turn the result into a dict also keyed by rdkey
    couch_docs = {}
    for row in result['rows']:
        couch_docs[tuple(row['value']['rd_key'])] = row['doc']

    # work out which of these rdkeys actually exist in our db.
    existing_rdkeys = set()
    keys = []
    for rdkey in rdkeys:
        keys.append(['rd.core.content', 'key-schema_id', [rdkey, 'rd.msg.rfc822']])
    result = open_view(keys=keys, reduce=False, include_docs=True)
    for row in result['rows']:
        existing_rdkeys.add(tuple(row['value']['rd_key']))

    # find what is different...
    nnew = 0
    to_up = []
    # Note it is fairly common to see multiples with the same msg ID in, eg
    # a 'drafts' folder, so skip duplicates to avoid conflicts.
    seen_keys = set()
    for rdkey, flags in imap_flags:
        if rdkey in seen_keys:
            logger.info('skipping duplicate message in folder %r: %r',
                        folder_name, rdkey)
            continue
        if rdkey not in existing_rdkeys:
            logger.debug('skipping message not yet in folder %r: %r',
                         folder_name, rdkey)
            continue
        seen_keys.add(rdkey)
        seen_now = "\\Seen" in flags
        try:
            doc = couch_docs[rdkey]
        except KeyError:
            # new message
            items = {'seen' : seen_now,
                     'outgoing_state' : 'incoming',
                     }
            emit_schema('rd.msg.seen', items, rdkey)
            nnew += 1
        else:
            # If the state in couch is anything other than 'incoming'', it
            # represents a request to change the state on the server (or the
            # process of trying to update the server).
            if doc.get('outgoing_state') != 'incoming':
                logger.info("found outgoing 'seen' state request in doc %(_id)r", doc)
                continue
            seen_couch = doc['seen']
            if seen_now != seen_couch:
                doc['seen'] = seen_now
                to_up.append(doc)
    if to_up:
        update_documents(to_up)
    logger.info("folder %r needs %d new and %d updated 'seen' records",
                folder_name, nnew, len(to_up))
