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
