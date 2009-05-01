# This is an extension which converts a message/raw/rfc822 to a
# message/raw/rfc822
from __future__ import absolute_import # stop 'email' import finding our ext

import logging
from email import message_from_string
from email.utils import mktime_tz, parsedate_tz, unquote
from email.header import decode_header
from twisted.internet import defer

from ...proc import base


logger = logging.getLogger(__name__)


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
        return unicode(rawval, fallback_charset, errors)


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


# an 'rfc822' message stores the unpacked version of the rfc822 stream, a-la
# the interface provided by the 'email' package.  IOW, we never bother storing
# the raw stream, just a 'raw' unpacked version of it.
# This helper function takes a raw rfc822 string and returns a 'document'
# suitable for storing as an rfc822 message.
def doc_from_bytes(b):
    msg = message_from_string(b)
    doc = {}
    mp = doc['multipart'] = msg.is_multipart()
    headers = doc['headers'] = {}
    # Given we have no opportunity to introduce an object which can ignore
    # the case of headers, we lowercase the keys
    for hn, hv in msg.items():
        headers[hn.lower()] = _safe_convert_header(hv)
        # email.utils.unquote will do bad things to references headers (stripping
        # initial and trailing <>'s, so we don't want to use it for the
        # references header-- but other fields seem ok.  We split the references
        # into a list here because why not.
        if hn.lower() == 'references':
            headers[hn.lower()] = extract_message_ids(hv)
        else:
            headers[hn.lower()] = unquote(headers[hn.lower()])

    # XXX - technically msg objects are recursive; handling that requires
    # more thought.  For now, assume they are flat.
    # Unlikely, but if we *aren't* text based also return as attachments.
    if mp or msg.get_content_maintype() != 'text':
        # a multi-part message - flatten it here by walking the list, but
        # only looking at the 'leaf' nodes.
        attachments = doc['_attachments'] = {}
        i = 1
        for attach in msg.walk():
            if not attach.is_multipart():
                name = attach.get_filename()
                if not name:
                    name = "subpart %d" % i
                    i += 1
                attachments[name] = {'content_type': attach.get_content_type(),
                                     'data': attach.get_payload(decode=True),
                                     }
    else:
        body_bytes = msg.get_payload(decode=True)
        # Convert the bytes to *some* unicode object, ignoring (but logging)
        # unicode errors we may see in the wild...
        # TODO: This sucks; we need to mimick what firefox does in such cases...
        charset = msg.get_content_charset() or 'ascii'
        try:
            body = body_bytes.decode(charset)
        except UnicodeError, exc:
            logger.error("Failed to decode body from %r: %s", charset, exc)
            # no charset failed to decode as declared - try utf8
            try:
                body = body_bytes.decode('utf-8')
            except UnicodeError, exc:
                logger.error("Failed to fallback decode mail from utf8: %s", exc)
                body = body_bytes.decode('latin-1', 'ignore')
        doc['body'] = body
    return doc

def extract_preview(body):
    lines = body.split('\n')
    # get rid of blank lines
    lines = [line.strip() for line in lines if line.strip()]
    preview_lines = []
    
    # we're going to identify 
    for i in range(len(lines)-1, -1, -1):
        line = lines[i]
        if not line.startswith('>') and line.endswith(':') and lines[i+1].startswith('>'):
            continue
        preview_lines.insert(0, line)
        
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
    if trimmed_preview_lines[0] == '[...]':
        trimmed_preview_lines = trimmed_preview_lines[1:]
    preview_body = '\n'.join(trimmed_preview_lines)
    return preview_body[:140] + (preview_body[140:] and '...') # cute trick

class RFC822Converter(base.SimpleConverterBase):
    target_type = 'msg', 'raw/message/email'
    sources = [('msg', 'raw/message/rfc822')]
    parts = {}
    def simple_convert(self, doc):
        # a 'rfc822' stores 'headers' as a dict
        headers = doc['headers']
        # for now, 'from' etc are all tuples of [identity_type, identity_id]
        callbacks = []
        ret = {'from': ['email', headers['from']],
               'subject': headers['subject'],
               'header_message_id': headers['message-id'],
               'headers': headers,
        }
        try:
            dval = headers['date']
        except KeyError:
            pass
        else:
            if dval:
                ret['timestamp'] = mktime_tz(parsedate_tz(dval))

        # body handling
        try:
            # if it's not a multipart, it's easy
            ret['body'] = doc['body']
        except KeyError:
            # it better be multipart
            assert doc['multipart']
            ret['body'] = '' # we'll get back to this in _gotAttachments
            attachments = doc['_attachments']
            for name in attachments.keys():
                if attachments[name]['content_type'] == 'text/plain':
                    deferred = self.doc_model.open_attachment(doc['_id'], name).\
                        addCallback(self._gotAttachment, name).\
                        addErrback(self._didntgetAttachment)
                    callbacks.append(deferred)
                # else: we should annotate the object with non-plaintext
                # attachment information XXX

        return defer.DeferredList(callbacks).addCallback(
            self._gotAttachments, doc, ret)


    def _didntgetAttachment(self, error):
        print "Error getting attachment", error
        raise ValueError, 'attachmentproblem'
    
    def _gotAttachment(self, content, name, *args):
        self.parts[name] = content
  
    def _gotAttachments(self, results, doc, ret):
        part_names = self.parts.keys()
        part_names.sort(part_sorter)
        sorted_parts = []
        for part_name in part_names:
            sorted_parts.append(self.parts[part_name])
        body = '\n'.join(sorted_parts)
        ret['body'] = ret['body'] + body
        ret['body_preview'] = extract_preview(ret['body'])
        return ret

def part_number(partname):
    return int(partname.split(' ', 1)[1])

def part_sorter(a, b):
    return cmp(part_number(a), part_number(b))