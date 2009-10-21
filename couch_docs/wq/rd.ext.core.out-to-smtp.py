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

from email.utils import formataddr
from email.Message import Message

# For now we just go directly from the simple outgoing schema to an
# outgoing SMTP blob in one hit...

def handler(doc):
    # If all the addresses aren't email addresses, we pass...
    check = [doc['from']] + doc['to'] + doc.get('cc', []) + doc.get('bcc', [])
    for c in check:
        if c[0] != 'email':
            logger.info('skipping %(_id)r - not all email addresses', doc)
            return
    # all addresses are emails - so off we go...
    smtp_items = {}
    m = Message()
    (_, addr) = doc['from']
    smtp_items['smtp_from'] = addr
    m.add_header('From', formataddr((doc['from_display'], doc['from'][1])))

    smtp_to = smtp_items['smtp_to'] = []
    for (_, addr), name in zip(doc.get('to', []), doc.get('to_display', [])):
        m.add_header('To', formataddr((name, addr)))
        smtp_to.append(addr)
    for (_, addr), name in zip(doc.get('cc', []), doc.get('cc_display', [])):
        m.add_header('CC', formataddr((name, addr)))
        smtp_to.append(addr)
    for (_, addr), name in zip(doc.get('bcc', []), doc.get('bcc_display', [])):
        m.add_header('BCC', formataddr((name, addr)))
        smtp_to.append(addr)

    m.add_header("Subject", doc['subject'])
    # for now body is plain-text as-is.
    m.set_payload(doc['body'], 'utf-8')
    attach_info = {'smtp_body': {'data': m.as_string()}}
    emit_schema('rd.msg.outgoing.smtp', smtp_items, attachments=attach_info)
