# This is an extension which hacks some annotations to a 'message', creating
# an annotated message.
import re
import logging

logger = logging.getLogger(__name__)

from ...proc import base

class MessageAnnotator(base.ConverterBase):
    def convert(self, doc):
        # for now, if a 'proto' couldn't detect tags by itself, all words in
        # the body become tags.
        try:
            tags = doc['tags']
        except KeyError:
            bits = re.split(r"[^A-Za-z]+", doc['body'])
            tags = list(set(b.lower() for b in bits if len(b)>3))
        conversation_id = doc.get('conversation_id')
        if conversation_id is None:
            conversation_id = doc.get('subject')
        return {'tags': tags,
                'conversation_id' : conversation_id,
                }
