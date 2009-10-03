
# Creates 'rd.msg.conversation' schemas for rss entries...
def handler(doc):
    # do not bother if no unique link.
    if not 'link' in doc:
        return

    items = {
        'conversation_id': doc['link']
    }

    emit_schema('rd.msg.conversation', items, rd_key=doc['rd_key'])
