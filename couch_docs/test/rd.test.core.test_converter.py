from email.message import Message

num_converted = 0
test_next_convert_fails = None
test_emit_identities = False
test_emit_common_identities = False


# A 'converter' - takes a proto/test as input and creates a
# 'rd/msg/rfc822 schema as output, which in turn will force the
# email schema converters to run to create body etc schemas.
def handler(src):
    """Takes a 'proto/test' as input and creates a 'rd/msg/rfc822' schema"""
    # for the sake of testing the error queue, we cause an error on
    # every 3rd message we process.
    global num_converted
    num_converted += 1
    if test_next_convert_fails or \
       (test_next_convert_fails is None and num_converted % 3 == 0):
        raise RuntimeError("This is a test failure")

    # for the sake of testing, we fetch the raw attachment just to compare
    # its value.
    attach_content = open_schema_attachment(src, "raw-attach")
    if attach_content != 'test\0blob':
        raise RuntimeError(attach_content)

    me = src['storage_key']
    # Use the email package to construct a synthetic rfc822 stream.
    msg = Message()
    headers = {'from': 'From: from%(storage_key)d@test.com',
               'subject' : 'This is test document %(storage_key)d',
               'message-id' : 'TestMessage%(storage_key)d',
    }
    for h in headers:
        msg[h] = headers[h] % src

    body = u"Hello, this is test message %(storage_key)d (with extended \xa9haracter!)" % src
    msg.set_payload(body.encode('utf-8'), 'utf-8')
    attachments = {"rfc822" : {"content_type" : 'message',
                               "data" : msg.as_string(),
                             }
                  }
    
    data = {}
    data['_attachments'] = attachments
    emit_schema('rd/msg/rfc822', data)

    # emit a 'flags' schema too just for fun
    emit_schema('rd/msg/flags', {'seen': False})

    if test_emit_identities:
        # and assertions about the existance of a couple of identities...
        # We want every 'test message' to result in 2 identities - one
        # unique to the message and one common across all.
        # invent relationships called 'public' and 'personal'...
        items = [
            (('test_identity', str(me)), 'personal'),
        ]
        if test_emit_common_identities:
            items.append((('test_identity', 'common'), 'public'))
        emit_related_identities(items, {'name':'test protocol'})
