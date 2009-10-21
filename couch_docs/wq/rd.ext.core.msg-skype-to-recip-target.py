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

# Emit rd.msg.recip-target schemas for skype chats.

def handler(src_doc):
    # fetch the list of identities which mean 'me' - hopefully one is a
    # 'skype' one :)
    my_identities = get_my_identities()
    skype_users = src_doc['skype_chat_members']
    has_me = False
    for su in skype_users:
        if su in my_identities:
            has_me = True
            break
    if src_doc['skype_from_handle'] in my_identities:
        val = 'from'
    elif has_me and len(skype_users)==2:
        # between me an 1 other - that is 'direct'
        val = 'direct'
    elif has_me:
        val = 'group'
    else:
        # no such thing as a 'broadcast' message for skype - presumably this
        # is a replicated message from someone else or something...
        val = None
    if val is not None:
        timestamp = src_doc['skype_timestamp']
        items = {'target' : val,
                 'timestamp': timestamp,
                 'target-timestamp': [val, timestamp],
                 }
        emit_schema('rd.msg.recip-target', items)
