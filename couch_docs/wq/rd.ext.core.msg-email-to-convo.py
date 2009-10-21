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

if __debug__:
    # used only by assertions for sanity checking...
    from raindrop.proto.imap import get_rdkey_for_email

# Creates 'rd.msg.conversation' schemas for emails...
def handler(doc):
    # a 'rfc822' stores 'headers' as a dict, with each entry being a list.
    # We only care about headers which rfc5322 must appear 0 or 1 times, so
    # flatten the header values here...
    headers = dict((k, v[0]) for (k, v) in doc['headers'].iteritems())
    self_header_message_id = headers.get('message-id')
    # check something hasn't got confused...
    assert get_rdkey_for_email(self_header_message_id) == tuple(doc['rd_key']), doc

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
    logger.debug("header_message_ids: %s ", header_message_ids)
    logger.debug("references: %s", '\n\t'.join(references))
    # Open a view trying to locate an existing conversation for any of these
    # headers.
    keys = [['rd.core.content', 'key-schema_id', [['email', mid], 'rd.msg.conversation']]
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
            logger.debug('emitting convo schema referenced message %r', rdkey)
            emit_schema('rd.msg.conversation', items, rd_key=rdkey)

    # make sure current doc gets emitted in case it was
    # not part of the uniq_header_message_ids
    if doc['rd_key'][1] not in uniq_header_message_ids:
        logger.debug('emitting convo schema for my document %(rd_key)r', doc)
        emit_schema('rd.msg.conversation', items, rd_key=doc['rd_key'])
