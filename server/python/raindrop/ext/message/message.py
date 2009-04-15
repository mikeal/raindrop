# This is an extension which hacks some annotations to a 'message', creating
# an annotated message.
import re
import logging

logger = logging.getLogger(__name__)

from ...proc import base

# *sob* this re still fails to get unicode.
# | >>> re.compile(r"[^\w]+", re.UNICODE).split(u"\xa9opyright me")
# | [u'', u'opyright', u'me']
re_tags = re.compile(r"[^\w]+", re.UNICODE)


class MessageAnnotator(base.SimpleConverterBase):
    target_type = 'msg', 'anno/tags'
    # I only consume one type of object.
    sources = [
        ('msg', 'message'),
    ]
    def simple_convert(self, doc):
        # for now, if a 'proto' couldn't detect tags by itself, all words in
        # the body become tags.
        try:
            tags = doc['tags']
        except KeyError:
            bits = re_tags.split(doc['body'])
            tags = list(set(b.lower() for b in bits if len(b)>3))
        # XXX - conversation_id is misplaced here!!!
        conversation_id = doc.get('conversation_id')
        if conversation_id is None:
            conversation_id = doc.get('subject')
        return {'tags': tags,
                'conversation_id' : conversation_id,
                }

class MessageTagAggregator(base.ConverterBase):
    "Aggregate all the tag sources into a final set of tags"
    # I suck up 2 kinds of 'anno' docs and spit out a 'merged' copy.
    sources = [
        ('msg', 'anno/tags'),
        ('msg', 'user/anno/tags'),
    ]
    target_type = 'msg', 'aggr/tags'

    def convert(self, docs):
        tags = set()
        for d in docs:
            for tag in d['tags']:
                tags.add(tag)
        return {'tags': list(tags)}


class MessageImportanceAggregator(base.ConverterBase):
    "Aggregates all the clues about how important a message is"
    sources = [
        ('msg', 'anno/flags'), # a 'starred' flag...
        # here is the tricky one - a reference to a contact!
        ('contact', 'anno/flags'),
    ]
    # The reference to a different 'kind' of object means I need to provide
    # a view which can 'indirect' back to find out which messages actually
    # depend on this contact.
    # eg, when anno/flags for contact 'Mark' changes, which messages are
    # impacted and get this aggregator re-executed?
    indirection_views = {
        ('contact', 'anno/flags') : 'raindrop!something!blah',
    }
    target_type = 'msg', 'aggr/flags'
