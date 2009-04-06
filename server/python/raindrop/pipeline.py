""" This is the raindrop pipeline; it moves messages from their most raw
form to their most useful form.
"""
from twisted.internet import defer, task
from twisted.python.failure import Failure
import logging

logger = logging.getLogger(__name__)

# Simple forward chaining.
chain = [
    # from_type, to_type, transformer)
    ('proto/test',         'raw/message/rfc822',
                           'raindrop.proto.test.TestConverter'),
    # skype goes directly to 'message' for now...
    ('proto/skype-msg',    'message',
                           'raindrop.proto.skype.SkypeConverter'),
    # skype-chat is 'terminal' for now.
    ('proto/skype-chat', None, None),
    ('proto/imap',         'raw/message/rfc822',
                           'raindrop.proto.imap.IMAPConverter'),
    ('proto/twitter',      'message',
                           'raindrop.proto.twitter.TwitterConverter'),
    ('raw/message/rfc822', 'raw/message/email',
                           'raindrop.ext.message.rfc822.RFC822Converter'),
    ('raw/message/email',  'message',
                           'raindrop.ext.message.email.EmailConverter'),
    ('message',            'anno/tags',
                           'raindrop.ext.message.message.MessageAnnotator'),
    # anno/tags is 'terminal'
    ('anno/tags', None, None),
]


class Pipeline(object):
    def __init__(self, doc_model, options):
        self.doc_model = doc_model
        self.options = options
        # use a cooperator to do the work via a generator.
        # XXX - should we own the cooperator or use our parents?
        self.coop = task.Cooperator()
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
            for dt in doc_types:
                yield self.doc_model.open_view('raindrop!messages!by',
                                               'by_doc_type',
                                               key=dt,
                            ).addCallback(delete_docs, dt)
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
        # error records are always 'derived'
        derived.add('core/error/msg')
        logger.info("deleting documents with types %r", derived)
        return self.coop.coiterate(gen_deleting_docs(derived))

    def start(self):
        return self.coop.coiterate(self.gen_wq_tasks())

    def start_retry_errors(self):
        """Attempt to re-process all messages for which our previous
        attempt generated an error.
        """
        # Later we may need a 'state doc' just for errors??
        # For now use this dict to save the state during processing but we
        # don't persist it yet.
        # Also note that although
        def gen_work():
            state_doc = {'raindrop_seq': 0}
            while True:
                self.num_errors_found = 0
                # error docs are quite small - fetch 50 at a time...
                logger.debug("starting error processing at %(raindrop_seq)r",
                             state_doc)
                yield self.doc_model.open_view(
                                'raindrop!proto!errors', 'errors',
                                startkey=state_doc['raindrop_seq'],
                                include_docs=True,
                        ).addCallback(self._cb_errorq_opened, state_doc)
                if not self.num_errors_found:
                    break
        return self.coop.coiterate(gen_work())

    def _cb_errorq_opened(self, result, state_doc):
        def gen_work():
            for row in result['rows']:
                self.num_errors_found += 1
                err_doc = row['doc']
                logger.debug("processing error document %(_id)r", err_doc)
                # Open original source doc
                source_infos = err_doc['raindrop_sources']
                assert len(source_infos)==1, "only simple fwd chaining!"
                source_id = source_infos[0][0]
                yield self.doc_model.open_document_by_id(source_id
                        ).addCallback(self._cb_got_error_source, err_doc)
                state_doc['raindrop_seq'] = row['key']

        # XXX - see below - should we reuse self.coop, or is that unsafe?
        coop = task.Cooperator()
        return coop.coiterate(gen_work())

    def _cb_got_error_source(self, result, err_doc):
        # build the infos dict used by the sub-generator.
        try:
            _, doc_type, proto_id = self.doc_model.split_docid(err_doc['_id'])
        except ValueError:
            logger.warning("skipping malformed ID %(_id)r", err_doc)
            return

        infos = {proto_id: [result]}
        # Although we only have 1 item to process, the queue is setup to
        # handle many, so we need to use a generator
        def gen_my_doc():
            new_docs = []
            for whateva in self.gen_work_tasks(infos, new_docs):
                yield whateva
            # should only be 1 new doc, and even on error there should be a
            # new error doc.
            assert len(new_docs)==1, new_docs
            # either way, we are writing the new record replacing the one
            # we have.
            new_docs[0]['_rev'] = err_doc['_rev']
            yield self.doc_model.create_ext_documents(new_docs)

        # XXX - see below - should we reuse self.coop, or is that unsafe?
        coop = task.Cooperator()
        return coop.coiterate(gen_my_doc())

    def gen_wq_tasks(self):
        """generate deferreds which will determine where our processing is up
        to and walk us through the _all_docs_by_seq view from that point,
        creating and saving new docs as it goes. When the generator finishes
        the queue is empty. """
        # first open our 'state' document
        def _cb_update_state_doc(result, d):
            if result is not None:
                assert d['_id'] == result['_id'], result
                d.update(result)
            # else no doc exists - the '_id' remains in the default though.

        state_doc = {'_id': 'workqueue!msg',
                     'doc_type': u"core/workqueue",
                     'seq': 0}
        yield self.doc_model.open_document_by_id(state_doc['_id'],
                    ).addCallback(_cb_update_state_doc, state_doc)

        logger.info("Work queue starting with sequence ID %d",
                    state_doc['seq'])

        logger.debug('opening by_seq view for work queue...')
        num_per_batch = 15 # configurable????
        # We process num_per_batch records at a time, and fetch all those
        # documents in the same request; this seems a reasonable compromize
        # between efficiency and handling large docs (no attachments come
        # back...) Another alternative worth benchmarking; use a much larger
        # limit without returning the documents, in the hope we can deduce
        # more from the view, avoiding the fetch of many docs at all...
        self.queue_finished = False
        self.state_doc_dirty = False
        while not self.queue_finished:
            yield self.doc_model.db.listDocsBySeq(limit=num_per_batch,
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

    def gen_work_tasks(self, doc_infos, new_docs):
        # A generator which takes each doc in the list to its "next" type, but noting that
        # as we have a number of docs ahead of us, one of them may satisfy
        # us..
        # ultimately we may need to generate lots of new docs from this one -
        # but for now we have a single, simple chain moving forwards...

        # Results aren't written - that is the caller's job - new docs are
        # appended to the passed list.

        # doc_infos is a dict keyed by proto_id.  Each value is a list, in
        # sequence order, of the document itself.
        for proto_id, infos in doc_infos.iteritems():
            for sq, doc in enumerate(infos):
                doc_type = doc['type']
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
                for check_doc in infos[sq+1:]:
                    if next_type == check_doc['type']:
                        logger.debug("cool - _by_seq lookahead tells us the doc is already %r",
                                     next_type)
                        continue
                # OK - need to create this new type.
                logger.debug("calling %r to create a %s from %s", xformer,
                             next_type, doc['type'])
                yield defer.maybeDeferred(xformer.convert, doc
                            ).addBoth(self._cb_converted_or_not,
                                      next_type, proto_id, doc, new_docs)

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
            logger.info("Work queue got to the end (at sequence %(seq)s)",
                        state_doc)
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
                _, doc_type, proto_id = self.doc_model.split_docid(rid)
            except ValueError:
                logger.warning("skipping malformed message ID %r", rid)
                continue
            doc = row['doc']
            real_type = doc.get('type')
            if real_type != doc_type: # probably a core/error/msg
                logger.info("message isn't of expected type (expected %r "
                            "but got %r) - skipping", doc_type, real_type)
                continue
            known.setdefault(proto_id, []).append(doc)

        state_doc['seq'] = last_seq # only takes effect once saved...
        logger.debug("Our %d rows gave info about %d messages",
                     len(rows), len(known))

        def gen_my_work_tasks():
            new_docs = []
            for whateva in self.gen_work_tasks(known, new_docs):
                yield whateva

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

        # I *think* that if we share the same cooperator as the task itself,
        # we risk having the next chunk of sequence IDs processed before we
        # are done here.
        # OTOH, I'm not sure about that.....
        # As we are really only using a coiterator as a handy way of managing
        # twisted loops, using our own should be ok though.
        coop = task.Cooperator()
        return coop.coiterate(gen_my_work_tasks())

    def _cb_created_docs(self, new_revs, state_doc):
        # XXX - note that the _ids in this result can't be trusted if there
        # were attachments :(  fortunately we don't care here...
        # XXXXXXX - *sob* - we do care once we start hitting conflicts in
        # messages ahead of us...
        # XXX - this might not be necessary...
        last_rev = new_revs[-1]
        assert last_rev['id'] == state_doc['_id'], last_rev
        state_doc['_rev'] = last_rev['rev']

    def _cb_converted_or_not(self, result, dest_type, rootdocid, existing_doc,
                             new_docs):
        # This is both a callBack and an errBack.  If a converter fails to
        # create a document, we can't just fail, or no later messages in the
        # DB will ever get processed!
        # So we write a "dummy" record - it has the same docid that the real
        # document would have - but the 'type' attribute in the document
        # reflects it is actually an error marker.
        if isinstance(result, Failure):
            logger.warn("Failed to convert a document: %s", result)
            if self.options.stop_on_error:
                logger.info("--stop-on-error specified - re-throwing error")
                result.raiseException()
            # and make a dummy doc.
            new_doc = {'error_details': unicode(result)}
            self.doc_model.prepare_ext_document(rootdocid, dest_type, new_doc)
            # and patch the 'type' attribute to reflect its really an error.
            new_doc['type'] = 'core/error/msg'
            # In theory, the source ID of each doc that contributed is
            # redundant as it could be deduced once we get backward chaining.
            # However, we probably will always need to track the _rev of those
            # docs so we can detect 'stale' errors (XXX - probably not - the
            # 'chain' doesn't go any further on error)
            # Also in theory, we don't need this in the non-error case, as
            # our _by_seq processing will ensure the right thing happens.
            # A list of sources as one day we will support that!
            new_doc['raindrop_sources'] = [[existing_doc['_id'],
                                            existing_doc['_rev']]
                                          ]
        else:
            new_doc = result
            self.doc_model.prepare_ext_document(rootdocid, dest_type, new_doc)
            logger.debug("converter returned new document type %r for %r: %r",
                         dest_type, rootdocid, new_doc['_id'])
        new_docs.append(new_doc)
