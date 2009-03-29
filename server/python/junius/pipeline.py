# This is the raindrop pipeline; it moves messages from their most raw
# form to their most useful form.
from twisted.internet import defer, reactor, task
import logging

logger = logging.getLogger(__name__)

# Simple forward chaining.
chain = [
    # from_type, to_type, transformer)
    ('proto/test',         'raw/message/rfc822',
                           'junius.proto.test.TestConverter'),
    # skype goes directly to 'message' for now...
    ('proto/skype-msg',    'message',
                           'junius.proto.skype.SkypeConverter'),
    # skype-chat is 'terminal' for now.
    ('proto/skype-chat', None, None),
    ('proto/imap',         'raw/message/rfc822',
                           'junius.proto.imap.IMAPConverter'),
    ('proto/twitter',      'message',
                           'junius.proto.twitter.TwitterConverter'),
    ('raw/message/rfc822', 'raw/message/email',
                           'junius.ext.message.rfc822.RFC822Converter'),
    ('raw/message/email',  'message',
                           'junius.ext.message.email.EmailConverter'),
    ('message',            'anno/tags',
                           'junius.ext.message.message.MessageAnnotator'),
    # anno/tags is 'terminal'
    ('anno/tags', None, None),
]


class Pipeline(object):
    def __init__(self, doc_model):
        self.doc_model = doc_model
        self.forward_chain = {}
        # use a cooperator to do the work via a generator.
        # XXX - should we own the cooperator or use our parents?
        self.coop = task.Cooperator()
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
                assert not to_type, 'no xformname must mean no to_type'
                self.forward_chain[from_type] = None

    def start(self):
        return self.coop.coiterate(self.gen_all_documents())

    def gen_all_documents(self):
        # check *every* doc in the DB.  This exists until we can derive
        # a workqueue based on views.
        self.num_this_process = 0
        while True:
            logger.debug('opening view for work queue...')
            yield self.doc_model.db.openView('raindrop!messages!workqueue',
                                             'by_doc_roots',
                                             group=True,
                        ).addCallback(self._cb_roots_opened)
            logger.info('processed %d documents', self.num_this_process)
            if self.num_this_process == 0:
                break
        logger.debug('finally run out of documents.')

    def _cb_roots_opened(self, rows):
        logger.info('work queue has %d items to check.', len(rows))
        def gen_todo(todo):
            for row in todo:
                did = row['key']
                logger.debug("Finding last extension point for %s", did)
                yield self.doc_model.get_last_ext_for_document(did
                            ).addCallback(self._cb_got_doc_last_ext, did
                            ).addErrback(self._eb_doc_failed
                            )

        return self.coop.coiterate(gen_todo(rows))

    def _eb_doc_failed(self, failure):
        logger.error("FAILED to pipe a doc: %s", failure)
        # and we will auto skip to the next doc...

    def _cb_got_doc_last_ext(self, ext_info, rootdocid):
        last_ext, docid = ext_info
        if last_ext is None:
            logger.debug("Document '%s' doesn't appear to be a message; skipping",
                         rootdocid)
            return None

        docs_by_type = {}
        new_docs = []
        # take the message to it's terminal type in one hit

        def gen_processes():
            did_ext = last_ext
            thisdocid = docid
            while True:
                logger.debug("Last extension for doc '%s' is '%s'", thisdocid, did_ext)
                try:
                    xform_info = self.forward_chain[did_ext]
                except KeyError:
                    logger.warning("Can't find transformer for message type %r - skipping %r",
                                   did_ext, thisdocid)
                    break
                if xform_info is None:
                    logger.debug("Document %r is at its terminal type of %r",
                                 rootdocid, did_ext)
                    break
                dest_type, xformer = xform_info
                logger.debug("Processing document %r - %s->%s", thisdocid,
                            did_ext, dest_type)
                if did_ext in docs_by_type:
                    logger.debug("already have doc for type %r", did_ext)
                    yield self._cb_got_last_doc(docs_by_type[did_ext],
                                                rootdocid, xform_info,
                                                docs_by_type, new_docs)
                else:
                    logger.debug("need to open doc for type %r (%r)", did_ext, thisdocid)
                    yield self.doc_model.open_document(thisdocid
                                ).addCallback(self._cb_got_last_doc, rootdocid,
                                              xform_info, docs_by_type, new_docs
                                )
                ld = new_docs[-1]
                assert ld['type'] == dest_type
                did_ext = dest_type
                thisdocid = ld['_id']

        return self.coop.coiterate(gen_processes()
                    ).addCallback(self._cb_docs_done, rootdocid, new_docs
                    )

    def _cb_docs_done(self, result, rootdocid, new_docs):
        if new_docs:
            self.doc_model.create_ext_documents(rootdocid, new_docs)

    def _cb_got_last_doc(self, doc, rootdocid, xform_info, docs_by_type, new_docs):
        assert doc is not None, "failed to locate the doc for %r" % rootdocid
        dest_type, xformer = xform_info
        logger.debug("calling %r to create a %s from %s", xformer, dest_type,
                     doc['type'])
        return defer.maybeDeferred(xformer.convert, doc
                        ).addCallback(self._cb_converted, dest_type, rootdocid,
                                      docs_by_type, new_docs)

    def _cb_converted(self, new_doc, dest_type, rootdocid, docs_by_type, new_docs):
        self.num_this_process += 1
        self.doc_model.prepare_ext_document(rootdocid, dest_type, new_doc)
        logger.debug("converter returned new document type %r for %r: %r", dest_type, rootdocid, new_doc['_id'])
        docs_by_type[dest_type] = new_doc
        new_docs.append(new_doc)
