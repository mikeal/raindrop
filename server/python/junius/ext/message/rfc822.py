# This is an extension which converts a message/raw/rfc822 to a
# message/raw/rfc822
from __future__ import absolute_import # stop 'email' import finding our ext

import logging
from email.parser import HeaderParser
from twisted.internet import defer


logger = logging.getLogger(__name__)

from ...proc import base

class RFC822Converter(base.ConverterBase):
    def __init__(self, *args, **kw):
        super(RFC822Converter, self).__init__(*args, **kw)
        self.hdr_parser = HeaderParser()
    def convert(self, doc):
        msg = self.hdr_parser.parsestr(doc['headers'])
        # for now, 'from' etc are all tuples of [identity_type, identity_id]
        return {'from': ['email', msg['from']],
                'subject': msg['subject'],
                'body': doc['body']}
