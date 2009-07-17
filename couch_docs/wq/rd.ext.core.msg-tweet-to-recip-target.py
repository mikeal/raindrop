# Emit rd.msg.recip-target schemas for tweets and twitter private messages.

# A set of twitter ids which mean 'me' - usually only 1, but you never know...
my_identities = None

def handler(src_doc):
    global my_identities
    if my_identities is None:
        my_identities = set()
        key=['rd.account', 'kind', 'twitter']
        result = open_view(key=key, reduce=False, include_docs=True)
        for row in result['rows']:
            if 'doc' in row and 'username' in row['doc']:
                un = row['doc']['username']
                my_identities.add(un)
                logger.debug('found twitter ID %r', un)
        logger.info('found %d twitter identities', len(my_identities))

    if src_doc['rd_schema_id'] == 'rd.msg.tweet.raw':
        if src_doc['sender_screen_name'] in my_identities:
            val = 'from'
        elif 'twitter_in_reply_to_screen_name' in src_doc and \
           src_doc['twitter_in_reply_to_screen_name'] in my_identities:
            # sent to me and others...
            val = 'group'
        else:
            val = 'broadcast' # regular tweet not aimed at me...
        # a normal tweet.
    elif src_doc['rd_schema_id'] == 'rd.msg.tweet-direct.raw':
        # direct message - it would be unusual to have a direct message not
        # targetted at one of our accounts, but you never know..
        if src_doc['sender_screen_name'] in my_identities:
            val = 'from'
        elif src_doc['twitter_recipient_screen_name'] in my_identities:
            val = "direct"
        else:
            logger.info("Unusual - a direct message for %r, but we are %r",
                        src_doc['twitter_recipient_screen_name'], my_identities)
            val = None
    else:
        raise RuntimeError("Not expecting doc %r" % src_doc)
    if val is not None:
        timestamp = src_doc['twitter_created_at_in_seconds']
        items = {'target' : val,
                 'timestamp': timestamp,
                 'target-timestamp': [val, timestamp],
                 }
        emit_schema('rd.msg.recip-target', items)
