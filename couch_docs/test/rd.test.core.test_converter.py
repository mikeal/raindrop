# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is Raindrop.
#
# The Initial Developer of the Original Code is
# Mozilla Messaging, Inc..
# Portions created by the Initial Developer are Copyright (C) 2009
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#

from email.message import Message
from email.utils import formatdate
import time

from raindrop.proto import test as test_proto

num_converted = 0

# A 'converter' - takes a proto/test as input and creates a
# 'rd.msg.rfc822 schema as output, which in turn will force the
# email schema converters to run to create body etc schemas.
def handler(src):
    """Takes a 'proto/test' as input and creates a 'rd.msg.rfc822' schema"""
    # for the sake of testing the error queue, we cause an error on
    # every 3rd message we process.
    global num_converted
    num_converted += 1
    if test_proto.test_next_convert_fails or \
       (test_proto.test_next_convert_fails is None and num_converted % 3 == 0):
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
               'date' : formatdate(time.mktime(time.gmtime())),
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
    emit_schema('rd.msg.rfc822', data, attachments=attachments)

    # emit a 'flags' schema too just for fun
    emit_schema('rd.msg.flags', {'seen': False})
    # emit a 'tags' schema too just for fun
    emit_schema('rd.tags', {'tags': ['test1', 'test2']})

    if test_proto.test_emit_identities:
        # and assertions about the existance of a couple of identities...
        # We want every 'test message' to result in 2 identities - one
        # unique to the message and one common across all.
        # invent relationships called 'public' and 'personal'...
        items = [
            (['test_identity', str(me)], 'personal'),
        ]
        if test_proto.test_emit_common_identities:
            items.append((['test_identity', 'common'], 'public'))
        emit_related_identities(items, {'name':'test protocol'})
