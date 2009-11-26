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

    references = set()
    if 'references' in headers:
        # 'references' is a bit special though - the provider of the source
        # schema has already split them!
        for ref in headers['references']:
            references.add(ref)
    if 'in-reply-to' in headers:
        references.add(headers['in-reply-to'])
    # the self-message...
    references.add(self_header_message_id)
    logger.debug("references: %s", '\n\t'.join(references))
    
    keys = (get_rdkey_for_email(mid) for mid in references)
    find_and_emit_conversation(keys)
