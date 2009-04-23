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
    rawval = unquote(value[0])
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
                attachments[name] = {'content_type': attach.get_content_type(),
                                     'data': attach.get_payload(decode=True),
                                     }
                i += 1
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


class RFC822Converter(base.SimpleConverterBase):
    target_type = 'msg', 'raw/message/email'
    sources = [('msg', 'raw/message/rfc822')]
    def simple_convert(self, doc):
        # a 'rfc822' stores 'headers' as a dict
        headers = doc['headers']
        # for now, 'from' etc are all tuples of [identity_type, identity_id]
        # XXX - todo - find one of the multi-part bits to use as the body.
        try:
            body = doc['body']
        except KeyError:
            assert doc['multipart']
            body = 'This is a multipart message - todo - find the body!'
        ret = {'from': ['email', headers['from']],
               'subject': headers['subject'],
               'body': body,
               'body_preview': body[:128], # good enuf for now...
               'headers': headers,
        }
        try:
            dval = headers['date']
        except KeyError:
            pass
        else:
            if dval:
                ret['timestamp'] = mktime_tz(parsedate_tz(dval))
        return ret
