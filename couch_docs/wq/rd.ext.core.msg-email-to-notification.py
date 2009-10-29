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

re_list = {
    "twitter": re.compile('\@postmaster\.twitter\.com'),
    "facebook": re.compile('notification[^@]*@facebookmail.com')
}

def handler(src_doc):
    frm = src_doc.get('from')
    
    #Skip docs with no from, or a different from than what is expected.
    if not frm or len(frm) != 2:
        return

    sender = frm[1]

    #Compare from ids with regexps that match a notification sender.
    if sender:
        type = None
        for key in re_list:
            if re_list[key].search(sender):
                type = key
                break

    if type:
        items = {'type' : type,
                 'timestamp': src_doc['timestamp'],
                 'type-timestamp': [type, src_doc['timestamp']],
                 }
        emit_schema('rd.msg.notification', items)
