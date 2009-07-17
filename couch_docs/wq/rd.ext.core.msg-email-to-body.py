from email.utils import mktime_tz, parsedate_tz, parseaddr
from email._parseaddr import AddressList
from email.message import Message

def decode_body_part(docid, body_bytes, charset=None):
    # Convert a 'text/*' encoded byte string to *some* unicode object,
    # ignoring (but logging) unicode errors we may see in the wild...
    # TODO: This sucks; we need to mimick what firefox does in such cases...
    try:
        body = body_bytes.decode(charset or 'ascii')
    except UnicodeError, exc:
        # No need to make lots of log noise for something beyond our
        # control...
        logger.debug("Failed to decode body in document %r from %r: %s",
                     docid, charset, exc)
        # no charset failed to decode as declared - just go straight to
        # latin-1! (is 'ignore' needed here?)
        body = body_bytes.decode('latin-1', 'ignore')
    return body


def extract_preview(body):
    lines = body.split('\n')
    # get rid of blank lines
    lines = [line.strip() for line in lines if line.strip()]
    preview_lines = []

    for (i, line) in enumerate(lines):
        if not line.startswith('>') and line.endswith(':') and \
            i+1 < len(lines)-1 and lines[i+1].startswith('>'):
            continue
        preview_lines.append(line)
    trimmed_preview_lines = []
    for (i, line) in enumerate(preview_lines):
        if line.startswith('>'):
            if trimmed_preview_lines and trimmed_preview_lines[-1] != '[...]':
                trimmed_preview_lines.append('[...]')
        else:
            trimmed_preview_lines.append(line)
    if trimmed_preview_lines and trimmed_preview_lines[0] == '[...]':
        trimmed_preview_lines = trimmed_preview_lines[1:]
    preview_body = '\n'.join(trimmed_preview_lines)
    return preview_body[:140] + (preview_body[140:] and '...') # cute trick

def fill_identity_info(val, identity_list, display_list):
    a = AddressList(val)
    for name, addr in a.addresslist:
        identity_list.append(['email', addr.lower()])
        display_list.append(name)

def handler(doc):
    # a 'rfc822' stores 'headers' as a dict
    headers = doc['headers']
    # for now, 'from' etc are all tuples of [identity_type, identity_id]
    callbacks = []
    ret = {}
    if 'from' in headers:
        name, addr = parseaddr(headers['from'])
        ret['from'] = ['email', addr.lower()]
        ret['from_display'] = name

    if 'to' in headers:
        id_list = ret['to'] = []
        disp_list = ret['to_display'] = []
        fill_identity_info(headers['to'], id_list, disp_list)

    if 'cc' in headers:
        id_list = ret['cc'] = []
        disp_list = ret['cc_display'] = []
        fill_identity_info(headers['cc'], id_list, disp_list)

    if 'subject' in headers:
        ret['subject'] = headers['subject']
    if 'date' in headers:
        dval = headers['date']
        if dval:
            try:
                ret['timestamp'] = mktime_tz(parsedate_tz(dval))
            except (ValueError, TypeError), exc:
                logger.debug('Failed to parse date %r in doc %r: %s',
                             dval, doc['_id'], exc)
                # later extensions will get upset if no attr exists
                # XXX - is this still true?  We should fix those extensions!
                ret['timestamp'] = 0

    # body handling
    if doc.get('multipart'):
        infos = doc['multipart_info']
    else:
        attach = doc['_attachments']['body']
        infos = [{'content_type': attach['content_type'],
                  'name': 'body'}]

    parts = []
    docid = doc['_id']
    for info in infos:
        # Use the email package to help parse the charset...
        m = Message()
        m['content-type'] = info['content_type']
        charset = m.get_content_charset()
        ct = m.get_content_type()
        if ct == 'text/plain':
            name = info['name']
            content = open_schema_attachment(doc, name)
            parts.append(decode_body_part(docid, content, charset))

        # else: we should annotate the object with non-plaintext
        # attachment information XXX
    ret['body'] = '\n'.join(parts)

    ret['body_preview'] = extract_preview(ret['body'])
    try:
        # If the provider could supply tags then pass them on
        ret['tags'] = doc['tags']
    except KeyError:
        pass
    emit_schema('rd.msg.body', ret)
