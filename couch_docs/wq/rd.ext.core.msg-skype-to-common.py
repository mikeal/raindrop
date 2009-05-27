# A 'converter' - takes a rd/msg/skypemsg/raw as input and creates various
# schema outputs for that message - specifically 'body' and 'conversation'
def handler(doc):
    subject = doc['skype_chat_friendlyname']
    # Currently 'body' also defines 'envelope' type items
    bdoc = {'from': ['skype', doc['skype_from_handle']],
            'subject': subject,
            'body': doc['skype_body'],
            'body_preview': doc['skype_body'][:140],
            'timestamp': doc['skype_timestamp'], # skype's works ok here?
            }
    emit_schema('rd/msg/body', bdoc)
    # and a conversation schema
    cdoc = {'conversation_id': doc['skype_chatname']}
    emit_schema('rd/msg/conversation', cdoc)
