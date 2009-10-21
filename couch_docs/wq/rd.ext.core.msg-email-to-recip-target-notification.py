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

re_list = [
    re.compile('\@postmaster\.twitter\.com'),
    re.compile('notification[^@]*@facebookmail.com')
]

def handler(src_doc):
    frm = src_doc.get('from')
    
    #Skip docs with no from, or a different from than what is expected.
    if not frm or len(frm) != 2:
        return

    sender = frm[1]

    #Compare from ids with regexps that match a notification sender.
    if sender:
        qualifies = False
        for regex in re_list:
            if regex.search(sender):
                qualifies = True
                break

    if qualifies:
        items = {'target' : 'notification',
                 'timestamp': src_doc['timestamp'],
                 'target-timestamp': ['notification', src_doc['timestamp']],
                 }
        emit_schema('rd.msg.recip-target', items)
