# An extension which converts message flags to a schema processed by the
# imap protocol to reflect the new flags back to the imap server.

def handler(doc):
    # Our source schema is also written as the message is incoming, so
    # skip messages not destined to be sent.
    if doc['outgoing_state'] != 'outgoing':
        return

    # query a view to find out what the folder and UID of the item is.
    rdkey = doc['rd_key']
    key = ["rd.core.content", "key-schema_id", [rdkey, 'rd.msg.location']]
    result = open_view(key=key, reduce=False, include_docs=True)
    # A single message may appear in multiple places...
    for row in result['rows']:
        # Check it really is for an IMAP account.  The 'source' for imap
        # accounts is ['imap', acct_name]
        loc_doc = row['doc']
        if loc_doc['source'][0] != 'imap':
            logger.info('outgoing item not for imap acct (source is %r)',
                        loc_doc['source'])
            continue
        # It is for IMAP - write a schema with the flags adjustments...
        folder = loc_doc.get('location_sep', '/').join(loc_doc['location'])
        uid = loc_doc['uid']
        logger.debug("setting flags for %r: folder %r, uuid %s", rdkey, folder, uid)

        items = {'account': loc_doc['source'][1],
                 'folder': folder,
                 'uid': uid,}
        if doc['seen']:
            items['flags_add']=['\\Seen']
        else:
            items['flags_remove']=['\\Seen']

        emit_schema('rd.proto.outgoing.imap-flags', items)
