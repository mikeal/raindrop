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
