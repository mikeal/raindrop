# Creates 'rd/msg/conversation' schemas for emails...
def handler(doc):
    headers = doc['headers']
    self_header_message_id = headers.get('message-id')
    if not self_header_message_id:
        logger.warn("doc %r has no message id!", doc['_id'])
        return

    if 'references' in headers:
        header_message_ids = headers['references']
    elif 'in-reply-to' in headers:
        header_message_ids = [headers['in-reply-to']]
    else:
        header_message_ids = []
    # save off the list of referenced messages (XXX - but this isn't used?)
    references = header_message_ids[:]
    # see if the self-message already exists...
    header_message_ids.append(self_header_message_id)
    uniq_header_message_ids = set(header_message_ids)
    logger.debug("header_message_id: %s ", header_message_ids)
    logger.debug("references: %s", '\n\t'.join(references))
    # Open a view trying to locate an existing conversation for any of these
    # headers.
    keys = [['rd/core/content', 'key-schema_id', [['email', mid], 'rd/msg/conversation']]
            for mid in uniq_header_message_ids]
    result = open_view(keys=keys, reduce=False,
                       include_docs=True)
    # build a map of the keys we actually got back.
    rows = [r for r in result['rows'] if 'error' not in r]
    if rows:
        assert 'doc' in rows[0], rows
        convo_id = rows[0]['doc']['conversation_id']
        logger.debug("FOUND CONVERSATION header_message_id %s with conversation_id %s",
                     self_header_message_id, convo_id)
        seen_ids = set(r['value']['rd_key'][1] for r in rows)
    else:
        logger.debug("CREATING conversation_id %s", header_message_ids[0])
        convo_id = header_message_ids[0]
        seen_ids = None

    items = {'conversation_id': convo_id}
    # create convo records for any messages which don't yet exist -
    # presumably that includes me too!
    for hid in uniq_header_message_ids:
        if seen_ids is None or hid not in seen_ids:
            rdkey = ['email', hid]
            emit_schema('rd/msg/conversation', items, rd_key=rdkey)
