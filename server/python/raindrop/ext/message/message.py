# This is an extension which hacks some annotations to a 'message', creating
# an annotated message.
import re
import logging

logger = logging.getLogger(__name__)

from ...proc import base

class MessageAnnotator(base.SimpleConverterBase):
    target_type = 'msg', 'anno/tags'
    # I only consume one type of object.
    sources = [
        ('msg', 'message'),
    ]
    def simple_convert(self, doc):
        ret = {}
        # If a proto could detect tags, return them
        try:
            ret['tags'] = doc['tags']
        except KeyError:
            pass
        # XXX - conversation_id is misplaced here!!!
        conversation_id = doc.get('conversation_id')
        if conversation_id is None:
            conversation_id = doc.get('subject')
        ret['conversation_id'] = conversation_id
        return ret


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
            for tag in d.get('tags', []):
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
    # XXX - note the below is just an indication of how we might implement
    # the required 'indirection'...
    indirection_views = {
        ('contact', 'anno/flags') : 'raindrop!something!blah',
    }
    target_type = 'msg', 'aggr/flags'

    # This is almost certainly too simple :)
    def convert(self, docs):
        ret = {}
        for doc in docs:
            if doc['type'] == 'core/error/msg':
                return None # an error...
            ret.update(doc)
        for k in ret.keys():
            if k.startswith('_') or k.startswith('raindrop'):
                del ret[k]
        del ret['type']
        
        return ret
