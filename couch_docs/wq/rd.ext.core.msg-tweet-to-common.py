import re
# A 'converter' - takes a rd.msg.tweet.raw as input and creates various
# schema outputs for that message
re_tags = re.compile(r'#(\w+)')

def handler(doc):
    # body schema
    body = doc['twitter_text']
    bdoc = {'from': ['twitter', doc['twitter_user']],
            'from_display': doc['twitter_user_name'],
            'body': body,
            'body_preview': body[:140],
            # we shoved GetCreatedAtInSeconds inside the func tweet_to_raw 
            # to fake having this property that doesn't come with AsDict
            'timestamp': doc['twitter_created_at_in_seconds']
    }
    emit_schema('rd.msg.body', bdoc)
    # and a conversation schema
    conversation_id = 'twitter-%s' % doc.get('twitter_in_reply_to_status_id', doc['twitter_id'])
    cdoc = {'conversation_id': conversation_id}
    emit_schema('rd.msg.conversation', cdoc)
    # and tags
    tags = re_tags.findall(body)
    if tags:
        tdoc = {'tags': tags}
        emit_schema('rd.tags', tdoc)
