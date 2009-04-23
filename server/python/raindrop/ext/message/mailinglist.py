# This is an extension that converts a raw/message/email
# to a raw/message/email/mailing-list-extracted, i.e. an email message
# that contains information about the mailing list to which the message
# was sent, if any.

# We extract mailing list info from RFC 2369 headers, which look like this:
#
#  Mailing-List: list raindrop-core@googlegroups.com;
#      contact raindrop-core+owner@googlegroups.com
#  List-Id: <raindrop-core.googlegroups.com>
#  List-Post: <mailto:raindrop-core@googlegroups.com>
#  List-Help: <mailto:raindrop-core+help@googlegroups.com>
#  List-Unsubscribe: <http://googlegroups.com/group/raindrop-core/subscribe>,
#      <mailto:raindrop-core+unsubscribe@googlegroups.com>

# XXX This should be a plugin that extends the message/email extension,
# like the evite and skype plugins described in Life Cycle of a Message 2 -
# Documents and States
# <http://groups.google.com/group/raindrop-core/web/life-cycle-of-a-message-2---documents-and-states>.

import logging

logger = logging.getLogger(__name__)

from ...proc import base

class MailingListExtractor(base.SimpleConverterBase):
    target_type = 'msg', 'raw/message/email/mailing-list-extracted'
    sources = [('msg', 'raw/message/email')]
    def simple_convert(self, doc):
        logger.warning("i'm in ur pipeline xtractng ur mailng lists")
        ret = doc.copy()

        # email.py does this, and we have to do it too, or else
        # DocumentModel::prepare_ext_document throws an exception when it finds
        # these keys in the document, even though it says the requirement
        # for _id to be absent from the document is because it "manage[s] IDs
        # for all but 'raw' docs," and this is a "raw" doc as far as I can tell.
        for n in ret.keys():
            if n.startswith('_') or n.startswith('raindrop'):
                del ret[n]
        del ret['type']

        #if (there isn't a a List-Id header...)
        #    return ret

        # The JavaScript version; FIXME: convert this to Python.
        #var parts = doc.headers["List-Id"].match(/([\W\w]*)\s*<(.+)>.*/);
        #var values = {
        #  "List-Id" : doc.headers["List-Id"],
        #  "id" : parts[2],
        #  "name" : parts[1]
        #};
        #for each (var headerId in ["List-Post","List-Archive","List-Help",
        #                         "List-Subscribe","List-Unsubscribe"]) {

        return ret
