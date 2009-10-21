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

import re

# Creates 'rd.msg.conversation' schemas for certain Delivery Status Notifications
#
# Creating conversation schema's means that the emails are linked to the original
# sent email.  Eventually we want to turn these messages into notifications as
# the real messages have obviously been written by klingons and were never
# intended for humans to read.  Future notifications would have options for
# resending the message, writing a new message or contacting the person via
# alternate means. i.e. continuing trying to communicate with the person
#
# Here are the type of Delivery Status Notifications we are currently handling
#   * Failed Recipients
#   * ...
def handler(doc):
    if 'x-failed-recipients' in doc['headers']:
        failed_recipient(doc)
    return

def failed_recipient(doc):
    # failed_recipient is the email address(es) that was the intended target
    # which for whatever reason doesn't exist
    # we want to grab this because:
    #  1. We could look through the address book for similar identities
    #  2. In the UI we could offer a message "You tried to email X but the address appears incorrect"
    # XXX however currently we do nothing with it
    failed_recipient = doc['headers']['x-failed-recipients'][0]
    logger.debug("found DSN failed recipient message intended for %s", failed_recipient)

    body = open_schema_attachment(doc, 'body')
    # Scan Message Body for the original message id
    # e.g.  Message-ID: <4A6A2D5F.3000601@sleet.mozillamessaging.com>
    match = re.search('Message-ID:\s*<(.+)>.*', body)
    if (match):
        logger.debug("found Message-ID header in DSN message '%s'", match.group(1))
        id = match.group(1)
        create_conversation_from_failed_id(id,doc)
    else:
        logger.info("No match found for DSN messsage")
        return

# XXX this is mostly copied and pasted from the rd.ext.core.msg-email-to-convo.py
# and it would be nice if that was reused somehow instead of c&p'd
def create_conversation_from_failed_id(failed_message_id, doc):
    keys = ['rd.core.content', 'key-schema_id',
            [['email', failed_message_id], 'rd.msg.conversation']]
    result = open_view(keys=keys, reduce=False, include_docs=True)
    # build a map of the keys we actually got back.
    rows = [r for r in result['rows'] if 'error' not in r]
    if rows:
        assert 'doc' in rows[0], rows
        convo_id = rows[0]['doc']['conversation_id']
        logger.debug("FOUND CONVERSATION header_message_id %s with conversation_id %s",
                     failed_message_id, convo_id)
    else:
        logger.debug("CREATING conversation_id %s", failed_message_id)
        convo_id = failed_message_id

    emit_schema('rd.msg.conversation', {'conversation_id': convo_id},
                rd_key=doc['rd_key'])
