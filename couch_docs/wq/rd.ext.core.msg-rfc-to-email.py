# This is an extension which converts a message/raw/rfc822 to a
# message/raw/rfc822

from email import message_from_string
from email.utils import unquote
from email.header import decode_header

def decode_header_part(value, fallback_charset='latin-1'):
    assert isinstance(value, tuple)
    rawval = value[0]
    charset = value[1] or fallback_charset
    try:
        # hrm - 'replace' isn't necessary for latin-1 - it never fails?
        return unicode(rawval, charset, 'replace')
    except LookupError:
        # XXX charset is unknown to Python.
        logger.warning("character-set '%s' is unknown - falling back to %s",
                       charset, fallback_charset)
        return unicode(rawval, fallback_charset, 'ignore')


def _safe_convert_header(val):
    # decode_header returns a list of tuples with guessed encoding values
    # we try to decode the list of strings using suggested encoding or latin1.
    # XXX - email.Errors.HeaderParseError is possible next, but don't
    # handle it until we have put enough thought into what to do about it!
    parts = decode_header(val)
    return u"".join(decode_header_part(part) for part in parts)

def extract_message_id(message_id_string, acceptNonDelimitedReferences):
  # this is a port of my fix for bug 466796, the comments should be ported
  #  too if we keep this logic...
  whitespaceEndedAt = None
  firstMessageIdChar = None
  foundLessThan = False
  message_len = len(message_id_string)
  i = 0
  while i < message_len:
    char = message_id_string[i]
    # do nothing on whitespace
    if char in r' \r\n\t':
      pass
    else:
      if char == '<':
        i += 1 # skip over the '<'
        firstMessageIdChar = i
        foundLessThan = True
        break
      if whitespaceEndedAt is None:
        whitespaceEndedAt = i
    i += 1

  # if we hit a '<', keep going until we hit a '>' or the end
  if foundLessThan:
    while i < message_len:
      char = message_id_string[i]
      if char == '>':
        # it's valid, update reference, making sure to stop before the '>'
        return [message_id_string[firstMessageIdChar:i],
            message_id_string[i+1:]]
      i += 1

  # if we are at the end of the string, we found some non-whitespace,
  #  and the caller requested that we accept non-delimited whitespace,
  #  give them that as their reference.  (otherwise, leave it empty)
  if acceptNonDelimitedReferences and whitespaceEndedAt:
    return [message_id_string[whitespaceEndedAt:], '']
  return [None, '']

def extract_message_ids(message_id_string):
  references = []
  while message_id_string:
    ref, message_id_string = extract_message_id(message_id_string,
                                                not references)
    if ref:
      references.append(ref)
  return references

def sanitize_attach_name(name):
    if not name:
        return name
    # hrmph - what are good rules?  I see a space :)
    return name.split()[0]

def attach_from_msg(msg):
    ct = msg.get_content_type()
    cs = msg.get_content_charset()
    if cs:
        ct += "; charset=" + cs
    return {'content_type': ct,
            'data': msg.get_payload(decode=True),
            }
    
# Given a raw rfc822 message stream, return a list of useful schema instances
# describing that message.
# Returns a list of (schema_id, schema_fields) tuples.
def doc_from_bytes(docid, rdkey, b):
    msg = message_from_string(b)
    doc = {}
    mp = doc['multipart'] = msg.is_multipart()
    headers = doc['headers'] = {}
    # Given we have no opportunity to introduce an object which can ignore
    # the case of headers, we lowercase the keys
    for hn in msg.keys():
        vals = msg.get_all(hn)
        if vals:
            # first do any charset etc conversion...
            vals = [_safe_convert_header(v) for v in vals]
            if hn.lower() == 'references':
                # email.utils.unquote will do bad things to references headers (stripping
                # initial and trailing <>'s, so we don't want to use it for the
                # references header-- but other fields seem ok.  We split the references
                # into a list here because why not.
                headers[hn.lower()] = [extract_message_ids(vals[0])]
            else:
                headers[hn.lower()] = [unquote(v) for v in vals]
            # a sanity check and to help debug an obscure bug which seemed to
            # cause the wrong 'source' doc being passed!
            if __debug__ and rdkey[0]=='email' and hn.lower()=='message-id':
                from raindrop.proto.imap import get_rdkey_for_email
                assert tuple(rdkey)==get_rdkey_for_email(vals[0]), (rdkey, docid, vals)

    # XXX - technically msg objects are recursive; handling that requires
    # more thought.  For now, assume they are flat.
    # We must return non-text parts in attachments, so just return
    # *everything* in attachments.
    attachments = doc['_attachments'] = {}

    if mp:
        # a multi-part message - flatten it here by walking the list, but
        # only looking at the 'leaf' nodes.
        # attachments have lost their order; this object helps keep the
        # other and is a convenient place to stash other headers coming
        # with this part.
        mi = doc['multipart_info'] = []
        i = 1
        for attach in msg.walk():
            if not attach.is_multipart():
                name = sanitize_attach_name(attach.get_filename())
                if not name:
                    name = "subpart-%d" % i
                    i += 1
                attachments[name] = attach_from_msg(attach)
                # Put together info about the attachment.
                ah = {}
                for hn, hv in attach.items():
                    ah[hn.lower()] = _safe_convert_header(hv)
                # content-type is redundant, but may be helpful...
                ct = attachments[name]['content_type']
                info = {'name': name, 'headers': ah, 'content_type': ct}
                mi.append(info)
    else:
        attachments['body'] = attach_from_msg(msg)
    return doc


def handler(doc):
    # I need the binary attachment.
    content = open_schema_attachment(doc, "rfc822")
    emit_schema('rd.msg.email', doc_from_bytes(doc['_id'], doc['rd_key'], content))
