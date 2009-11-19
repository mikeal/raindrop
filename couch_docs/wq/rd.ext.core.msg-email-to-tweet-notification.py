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

# Emit rd.msg.recip-target schemas for emails.
import re

# TODO, try to secure these against impersonation. May need to check
# more than just from address:
# http://trac.mozillamessaging.com/raindrop/ticket/71
twitterRegExp = re.compile('\@postmaster\.twitter\.com(>)?$')

def handler(schema):
    if not 'headers' in schema or not 'from' in schema['headers']:
        return

    headers = schema['headers']
    frm = headers['from']

    frm = frm[0]
    if not frm:
        return

    if twitterRegExp.search(frm):
        # A mail from twitter.
        # Use X-TwitterEmailType to figure out if a direct message or an follow
        # messagehttp://apiwiki.twitter.com/FAQ
        # X-TwitterEmailType will be 'is_following' or 'direct_message'.
        if not 'x-twitteremailtype' in headers:
            return

        twitterType = headers['x-twitteremailtype'][0]
        if not twitterType:
            return

        if twitterType == "is_following":
            type ='twitter'
            items = {'type' : type,
                     'timestamp': schema['timestamp'],
                     'type-timestamp': [type, schema['timestamp']],
                     }
            emit_schema('rd.msg.notification', items)
