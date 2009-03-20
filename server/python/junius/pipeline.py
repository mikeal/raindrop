# This is the raindrop pipeline; it moves messages from their most raw
# form to their most useful form.
from twisted.internet import defer
import logging

logger = logging.getLogger(__name__)

# Simple forward chaining.
chain = [
    # trom_type, to_type, transformer)
    ('proto/test',         'raw/message/rfc822',
                           'junius.proto.test.TestConverter'),
    # skype goes directly to 'message' for now...
    ('proto/skype-msg',    'message',
                           'junius.proto.skype.SkypeConverter'),
    # skype-chat is 'terminal'
    ('proto/skype-chat', None, None),
    ('proto/imap',         'raw/message/rfc822',
                           'junius.proto.imap.IMAPConverter'),
    ('proto/twitter',      'message',
                           'junius.proto.twitter.TwitterConverter'),
    ('raw/message/rfc822', 'raw/message/email',
                           'junius.ext.message.rfc822.RFC822Converter'),
    ('raw/message/email',  'message',
                           'junius.ext.message.email.EmailConverter'),
    # message is 'terminal'
    ('message', None, None),
]


class Pipeline(object):
    def __init__(self, doc_model):
        self.doc_model = doc_model
        self.forward_chain = {}
        for from_type, to_type, xformname in chain:
            if xformname:
                root, tail = xformname.rsplit('.', 1)
                try:
                    mod = __import__(root, fromlist=[tail])
                    klass = getattr(mod, tail)
                    inst = klass(doc_model)
                except:
                    logger.exception("Failed to load extension %r", xformname)
                else:
                    self.forward_chain[from_type] = (to_type, inst)
            else:
                assert not to_type, 'no xformname must mean to no_type'
                self.forward_chain[from_type] = None

    def start(self):
        return defer.maybeDeferred(self.process_all_documents
                    ).addCallback(self._cb_maybe_reprocess_all_documents)

    def process_all_documents(self):
        # check *every* doc in the DB.  This exists until we can derive
        # a workqueue based on views.
        self.num_this_process = 0
        return self.doc_model.db.openView('raindrop!messages!by',
                                          'by_doc_roots',
                                          group=True, limit=100,
                    ).addCallback(self._cb_roots_opened)

    def _cb_maybe_reprocess_all_documents(self, result):
        if self.num_this_process:
            logger.debug('pipeline processed %d documents last time; trying again',
                         self.num_this_process)
            return self.start()
        logger.info('pipeline is finished.')

    def _cb_roots_opened(self, rows):
        dl = []
        for row in rows:
            did = row['key']
            logger.debug("Finding last extension point for %s", did)
            dl.append(
                self.doc_model.get_last_ext_for_document(did).addCallback(
                    self._cb_got_doc_last_ext, did)
                )
        return defer.DeferredList(dl)

    def _cb_got_doc_last_ext(self, ext_info, rootdocid):
        last_ext, docid = ext_info
        if last_ext is None:
            logger.debug("Document '%s' doesn't appear to be a message; skipping",
                         rootdocid)
            return None
        logger.debug("Last extension for doc '%s' is '%s'", docid, last_ext)
        try:
            xform_info = self.forward_chain[last_ext]
        except KeyError:
            logger.warning("Can't find transformer for message type %r - skipping %r",
                           last_ext, docid)
            return None
        if xform_info is None:
            logger.debug("Document %r is already at its terminal type of %r",
                         rootdocid, last_ext)
            return None
        return self.doc_model.open_document(docid
                    ).addCallback(self._cb_got_last_doc, rootdocid, xform_info
                    )

    def _cb_got_last_doc(self, doc, rootdocid, xform_info):
        assert doc is not None, "failed to locate the doc for %r" % rootdocid
        dest_type, xformer = xform_info
        logger.debug("calling %r to create a %s from %s", xformer, dest_type,
                     doc['_id'])
        return defer.maybeDeferred(xformer.convert, doc
                        ).addCallback(self._cb_converted, dest_type, rootdocid)

    def _cb_converted(self, new_doc, dest_type, rootdocid):
        logger.debug("converter returned new document for %s", rootdocid)
        self.num_this_process += 1
        return self.doc_model.create_ext_document(new_doc, dest_type, rootdocid)
