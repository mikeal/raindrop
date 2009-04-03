""" This is the raindrop pipeline; it moves messages from their most raw
form to their most useful form.
"""
from twisted.internet import defer, task
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

    def unprocess(self):
        # A bit of a hack that will suffice until we get better dependency
        # management.  Determines which doc-types are 'derived', then deletes
        # them all.
        def delete_a_doc(doc, rid):
            if doc is None:
                logger.debug("can't delete document %r - it doesn't exist", rid)
                return None
            else:
                logger.info("Deleting document %(_id)r (rev %(_rev)s)", doc)
                return self.doc_model.db.deleteDoc(doc['_id'], doc['_rev'])

        def delete_docs(result, doc_type):
            docs = []
            to_del = [(row['id'], row['value']) for row in result['rows']]
            for id, rev in to_del:
                docs.append({'_id': id, '_rev': rev, '_deleted': True})
            logger.info('deleting %d messages of type %r', len(docs), doc_type)
            return self.doc_model.db.updateDocuments(docs)

        def gen_deleting_docs(doc_types):
            for t in doc_types:
                yield self.doc_model.open_view('raindrop!messages!by',
                                               'by_doc_type',
                                               key=t,
                            ).addCallback(delete_docs, t)
            # and our work-queue docs - they aren't seen by the view, so
            # just delete them by ID.
            docs = []
            for rid in ('workqueue!msg',):
                yield self.doc_model.open_document_by_id(rid
                        ).addCallback(delete_a_doc, rid)

        derived = set()
        for _, to_info in self.forward_chain.iteritems():
            if to_info is not None:
                to_type, inst = to_info
                derived.add(to_type)
        logger.info("deleting documents with types %r", derived)
        return self.coop.coiterate(gen_deleting_docs(derived))

    def start(self):
        return self.coop.coiterate(self.gen_wq_tasks())

    def gen_wq_tasks(self):
        # first open our 'state' document
        def _cb_update_state_doc(result, d):
            if result is not None:
                assert d['_id'] == result['_id'], result
                d.update(result)
            # else no doc exists - the '_id' remains in the default though.

        state_doc = {'_id': 'workqueue!msg',
                     'doc_type': "core/workqueue",
                     'seq': 0}
        yield self.doc_model.open_document_by_id(state_doc['_id'],
                    ).addCallback(_cb_update_state_doc, state_doc)

        logger.info("Work queue starting with sequence ID %d",
                    state_doc['seq'])

        logger.debug('opening by_seq view for work queue...')
        # We process 5 records at a time, and fetch those 5 documents in
        # the same request; this seems a reasonable compromize between
        # efficiency and handling large docs (no attachments come back...)
        # Another alternative worth benchmarking; use a much larger limit
        # without returning the documents, in the hope we can deduce more
        # from the view, avoiding the fetch of many docs at all...
        self.queue_finished = False
        self.state_doc_dirty = False
        while not self.queue_finished:
            yield self.doc_model.db.listDocsBySeq(limit=15,
                                                  startkey=state_doc['seq'],
                                                  include_docs=True,
                        ).addCallback(self._cb_by_seq_opened, state_doc)
        if self.state_doc_dirty:
            logger.debug("flushing state doc at end of run...")
            yield self.doc_model.create_ext_documents([state_doc]
                    ).addCallback(self._cb_created_docs, state_doc
                    )
        else:
            logger.debug("no need to flush state doc")

    def _cb_by_seq_opened(self, result, state_doc):
        rows = result['rows']
        logger.debug('work queue has %d items to check.', len(rows))
        if not rows:
            # no rows left.  There is no guarantee our state doc will be
            # the last one...
            logger.info("work queue ran out of rows...")
            # either way, we are done!
            self.queue_finished = True
            return
        if len(rows)==1 and rows[0]['id'] == state_doc['_id']:
            logger.info("Work queue got to the end!")
            self.queue_finished = True
            return

        # Build a map of what we can deduce from the entire result set (eg,
        # a single msg may have a number of doc-types in the rows)
        known = {}
        for row in rows:
            rid = row['id']
            last_seq = row['key']
            if not rid.startswith("msg!"):
                continue
            value = row['value']
            if value.get('deleted'):
                logger.debug("skipping deleted message %r", rid)
                continue
            try:
                _, proto_id, doc_type = rid.split("!")
            except ValueError:
                logger.warning("skipping malformed message ID %r", rid)
                continue
            known.setdefault(proto_id, []).append(
                                (doc_type, value['rev'], row['doc']))

        state_doc['seq'] = last_seq # only takes effect once saved...
        logger.debug("Our %d rows gave info about %d messages",
                     len(rows), len(known))

        # Now take each doc in the list to its "next" type, but noting that
        # as we have a number of docs ahead of us, one of them may satisfy
        # us..
        # ultimately we may need to generate lots of new docs from this one -
        # but for now we have a single, simple chain moving forwards...
        def gen_todo():
            new_docs = []
            for proto_id, infos in known.iteritems():
                for (sq, (doc_type, rev, doc)) in enumerate(infos):
                    try:
                        xform_info = self.forward_chain[doc_type]
                    except KeyError:
                        logger.warning("Can't find transformer for message type %r - skipping %r",
                                       doc_type, proto_id)
                        continue
                    if xform_info is None:
                        logger.debug("Document %r is at its terminal type of %r",
                                     proto_id, doc_type)
                        continue

                    next_type, xformer = xform_info
                    # See if the next_type is in the rows ahead of us in by_seq
                    for (check_type, _, _) in infos[sq+1:]:
                        if next_type == check_type:
                            logger.debug("cool - _by_seq lookahead tells us the doc is already %r",
                                         next_type)
                            continue
                    # OK - need to create this new type.
                    logger.debug("calling %r to create a %s from %s", xformer,
                                 next_type, doc['type'])
                    yield defer.maybeDeferred(xformer.convert, doc
                                    ).addCallback(self._cb_converted, next_type,
                                                  proto_id, new_docs)
            # It isn't unusual to see zero docs to process, and writing our
            # new state doc each time is going to hurt perf a little.  The
            # worst case is we die before flushing our state doc, but that's
            # OK - we should be able to re-skip these messages quickly next
            # time...
            if new_docs:
                # Now write the docs we created, plus our queue 'state' doc.
                logger.info("work queue finished at sequence %d - %d new documents"
                            , state_doc['seq'], len(new_docs))
                new_docs.append(state_doc)
                self.state_doc_dirty = False # it is about to be written.
                yield self.doc_model.create_ext_documents(new_docs
                        ).addCallback(self._cb_created_docs, state_doc
                        )
            else:
                # don't bother writing the state doc now, but record it is
                # dirty so if we get to the end we *do* write it.
                self.state_doc_dirty = True

        return self.coop.coiterate(gen_todo())

    def _cb_created_docs(self, result, state_doc):
        # XXX - note that the _ids in this result can't be trusted if there
        # were attachments :(  fortunately we don't care here...
        # XXXXXXX - *sob* - we do care once we start hitting conflicts in
        # messages ahead of us...
        # XXX - this might not be necessary...
        new_revs = result['new_revs']
        last_rev = new_revs[-1]
        assert last_rev['id'] == state_doc['_id'], last_rev
        state_doc['_rev'] = last_rev['rev']

    def _eb_doc_failed(self, failure):
        logger.error("FAILED to pipe a doc: %s", failure)
        # and we will auto skip to the next doc...

    def _cb_converted(self, new_doc, dest_type, rootdocid, new_docs):
        self.doc_model.prepare_ext_document(rootdocid, dest_type, new_doc)
        logger.debug("converter returned new document type %r for %r: %r",
                     dest_type, rootdocid, new_doc['_id'])
        new_docs.append(new_doc)
