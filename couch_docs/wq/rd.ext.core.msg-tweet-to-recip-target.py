# Emit rd.msg.recip-target schemas for tweets and twitter private messages.

def handler(src_doc):
    my_identities = get_my_identities()

    if src_doc['rd_schema_id'] == 'rd.msg.tweet.raw':
        if src_doc['twitter_user'] in my_identities:
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
        if src_doc['twitter_sender_screen_name'] in my_identities:
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
