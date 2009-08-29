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
    imap_flags = []

    for item in doc['infos']:
        msg_id = item['ENVELOPE'][-1]
        rdkey = get_rdkey_for_email(msg_id)
        keys.append(['rd.core.content', 'key-schema_id', [rdkey, 'rd.msg.seen']])
        imap_flags.append((rdkey, item['FLAGS']))

    result = open_view(keys=keys, reduce=False, include_docs=True)
    # turn the result into a dict also keyed by rdkey
    couch_docs = {}
    for row in result['rows']:
        couch_docs[tuple(row['value']['rd_key'])] = row['doc']
    # find what is different...
    to_up = []
    nnew = 0
    for rdkey, flags in imap_flags:
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
            seen_couch = doc['seen']
            if seen_now != seen_couch:
                doc['seen'] = seen_now
                to_up.append(doc)
    if to_up:
        update_documents(to_up)
    logger.info("wrote %d new and %d updated 'seen' records", nnew, len(to_up))
