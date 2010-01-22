def handler(doc):
    if doc['num_syncs'] != 1:
        return
    
    key = ['rd.account', 'proto', 'smtp']
    result = open_view(key=key, reduce=False, include_docs=True)
    rows = result['rows']
    if not rows:
        logger.warn("can't find an smtp account from which to send welcome email")
        return
    acct = rows[0]['doc']

    # write a simple outgoing schema
    addy = acct['username']
    body = 'no really - welcome!  Raindrop just synchronized %d of your messages' % doc['new_items']
    item = {'body' : body,
            'from' : ['email', addy],
            'from_display': 'raindrop',
            'to' : [
                       ['email', addy],
                   ],
            'to_display' : ['you'],
            'subject': "Welcome to raindrop",
            # The 'state' bit...
            'sent_state': None,
            'outgoing_state': 'outgoing',
    }
    emit_schema('rd.msg.outgoing.simple', item)
    logger.info("queueing welcome mail to '%s'", addy)
