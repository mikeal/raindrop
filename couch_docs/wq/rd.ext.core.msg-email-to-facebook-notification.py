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

def handler(schema):
    if not 'headers' in schema or not 'from' in schema['headers']:
        return

    headers = schema['headers']

    # A mail from facebook.
    # Use X-Facebook-Notify to figure out if facebook notification.
    # Right now, only treat type of "friend" as a notification, but
    # may need to change this in the future.
    if not 'x-facebook-notify' in headers:
        return

    facebookType = headers['x-facebook-notify'][0]
    if not facebookType:
        return

    if facebookType.startswith('friend;'):
        type ='facebook'
        items = {'type' : type,
                 'timestamp': schema['timestamp'],
                 'type-timestamp': [type, schema['timestamp']],
                 }
        emit_schema('rd.msg.notification', items)
