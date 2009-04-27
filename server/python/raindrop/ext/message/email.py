# This is an extension which converts a message/raw/email to a 'message'
import logging

logger = logging.getLogger(__name__)

from ...proc import base

class EmailConverter(base.SimpleConverterBase):
    target_type = 'msg', 'message'
    sources = [
        ('msg', 'raw/message/email'),
        ('msg', 'raw/message/email/mailing-list-extracted'),
        ('msg', 'message/email-in-conversation'),
        ]
    def convert(self, docs):
        ret = {}
        for doc in docs:
            tmp = doc.copy()
            for n in tmp.keys():
                if n.startswith('_') or n.startswith('raindrop'):
                    del tmp[n]
            del tmp['type']
            ret.update(tmp)
        return ret
