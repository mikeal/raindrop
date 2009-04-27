""" This is the raindrop pipeline; it moves messages from their most raw
form to their most useful form.
"""
import sys
from twisted.internet import defer, task
from twisted.python.failure import Failure

import logging

logger = logging.getLogger(__name__)

from .proc import base

# XXX - we need a registry of some type...
# We search the modules for subclasses of our base-classes.
extension_modules = [
    'raindrop.proto.test',
    'raindrop.proto.skype',
    'raindrop.proto.imap',
    'raindrop.proto.twitter',
    'raindrop.ext.message.rfc822',
    'raindrop.ext.message.email',
    'raindrop.ext.message.mailinglist',
    'raindrop.ext.message.message',
    'raindrop.ext.message.convos',
]

# A dict of converter instances, keyed by (src_info, dest_info)
converters = {}

# Given a (doc-cat, document-type) key, return a list of those which depend
# on it
# eg:
#depends = {
#    ('msg', 'anno/flags') : [('msg', 'aggr/flags')],
#    ('contact', 'anno/flags') : [('msg', 'aggr/flags')]
#}
depends = {}


def find_converters_in_module(mod_name):
    try:
        __import__(mod_name)
        mod = sys.modules[mod_name]
    except:
        logger.exception("Failed to load extension %r", mod_name)
        return
    for ob in mod.__dict__.itervalues():
        if isinstance(ob, type) and issubclass(ob, base.ConverterBase):
            yield ob

def load_converters(doc_model):
    for mod_name in extension_modules:
        for cvtr in find_converters_in_module(mod_name):
            assert cvtr.target_type, cvtr # must have a target type
            # Is the target-type valid
            assert isinstance(cvtr.target_type, tuple) and \
                   len(cvtr.target_type)==2, cvtr
            inst = cvtr(doc_model)
            for sid in cvtr.sources:
                depends.setdefault(sid, []).append(cvtr.target_type)
                cvtr_key = sid, cvtr.target_type
                if cvtr_key in converters:
                    other = converters[cvtr_key]
                    msg = "Message transition %r->%r is registered by both %r and %r"
                    logger.warn(msg, sid, cvtr.target_type, cvtr, other)
                    continue
                converters[cvtr_key] = inst


class Pipeline(object):
    def __init__(self, doc_model, options):
        self.doc_model = doc_model
        self.options = options
        # use a cooperator to do the work via a generator.
        # XXX - should we own the cooperator or use our parents?
        self.coop = task.Cooperator()
        if not converters:
            load_converters(doc_model)

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

        def gen_deleting_docs(doc_infos):
            for di in doc_infos:
                dc, dt = di
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
        for src_info, dest_info in converters.iterkeys():
            derived.add(dest_info)
        # error records are always 'derived'
        derived.add(('msg', 'core/error/msg'))
        return self.coop.coiterate(gen_deleting_docs(derived))

    def start(self):
        gen = generate_work_queue(self.doc_model, self.gen_transition_tasks)
        return self.coop.coiterate(gen)

    def start_retry_errors(self):
        """Attempt to re-process all messages for which our previous
        attempt generated an error.
        """
        # We need to re-process this item from all its sources.  Once the new
        # item is in-place the normal mechanisms will do the right thing
        def gen_work():
            state_doc = {'raindrop_seq': 0}
            while True:
                start_seq = state_doc['raindrop_seq']
                # error docs are quite small - fetch 50 at a time...
                yield self.doc_model.open_view(
                                'raindrop!proto!workqueue', 'errors',
                                startkey=state_doc['raindrop_seq'],
                                limit=50,
                        ).addCallback(self._cb_errorq_opened, state_doc)
                if start_seq == state_doc['raindrop_seq']:
                    break
        return self.coop.coiterate(gen_work())

    def _cb_errorq_opened(self, result, state_doc):
        def gen_work():
            for row in result['rows']:
                logger.debug("processing error document %r", row['id'])
                # Open *any* of the original source docs and re-process.
                sources = row['value']
                yield self.doc_model.open_document_by_id(sources[0][0]
                        ).addCallback(self._cb_got_error_source)
                state_doc['raindrop_seq'] = row['key']

        # XXX - see below - should we reuse self.coop, or is that unsafe?
        coop = task.Cooperator()
        return coop.coiterate(gen_work())

    def _cb_got_error_source(self, source):
        # XXX - see below - should we reuse self.coop, or is that unsafe?
        coop = task.Cooperator()
        return coop.coiterate(self.gen_transition_tasks(
                                        source['_id'], source['_rev'],
                                        force=True))

    def gen_transition_tasks(self, src_id, src_rev, force=False,
                             # caller can supply this dict if they care...
                             caller_ret={'num_processed': 0}):
        # A generator which checks if each of its 'targets' (ie, the extension
        # which depends on this document) is up-to-date wrt this document's
        # revision.
        logger.debug("generating transition tasks for %r (rev=%s)", src_id,
                     src_rev)

        dm = self.doc_model
        # For each target we need to determine if the doc exists, and if so,
        # if our revision number is in the 'raindrop_sources' attribute.
        # If it is, the target is up-to-date wrt us, so all is good.
        try:
            doc_cat, doc_type, proto_id = dm.split_docid(src_id)
        except ValueError:
            logger.warning("skipping malformed ID %r", src_id)
            return

        targets = depends.get((doc_cat, doc_type))
        if not targets:
            logger.debug("documents of type %r need no processing", doc_type)
            return

        for target_info in targets:
            target_cat, target_type = target_info
            assert target_cat==doc_cat, (target_cat, doc_cat)
            target_id = dm.build_docid(target_cat, target_type, proto_id)
            cvtr = converters[(doc_cat, doc_type), target_info]
            logger.debug('looking for existing document %r', target_id)
            yield dm.open_view('raindrop!proto!workqueue', 'source_revs',
                            key=target_id
                    ).addCallback(self._cb_check_existing_doc, cvtr,
                                  proto_id, src_id, src_rev, force,
                                  caller_ret)

    def _cb_check_existing_doc(self, result, cvtr, proto_id, src_id, src_rev,
                               force, caller_ret):
        rows = result['rows']
        if len(rows)==0:
            # no target exists at all - needs to be executed...
            need_target = True
            target_rev = None
        else:
            assert len(rows)==1, rows # what does more than 1 mean?
            val = rows[0]['value']
            target_rev, all_sources = val
            look = [src_id, src_rev]
            need_target = force or look not in all_sources
            logger.debug("need target=%s (looked for %r in %r)", need_target,
                         look, all_sources)

        if not need_target:
            return None # nothing to do.
        return self._make_document(cvtr, proto_id, target_rev, caller_ret)

    def _make_document(self, cvtr, proto_id, target_rev, caller_ret):
        # OK - need to create this new type - locate all dependents in the
        # DB - this will presumably include the document which triggered
        # the process...
        caller_ret['num_processed'] += 1
        all_deps = []
        dm = self.doc_model
        for src_cat, src_type in cvtr.sources:
            all_deps.append(dm.build_docid(src_cat, src_type, proto_id))
        return dm.db.listDoc(keys=all_deps, include_docs=True,
                    ).addCallback(self._cb_do_conversion, cvtr, proto_id,
                                  target_rev)

    def _cb_do_conversion(self, result, cvtr, proto_id, target_rev):
        sources = []
        for r in result['rows']:
            if 'error' in r:
                # This is usually a simple 'not found' error; it doesn't
                # mean an 'error record'
                logger.debug('skipping document %(key)s - %(error)s', r)
                continue
            if 'deleted' in r['value']:
                logger.debug('skipping document %s - deleted', r['key'])
                continue
            sources.append(r['doc'])

        logger.debug("calling %r to create a %s from %d docs", cvtr,
                     cvtr.target_type, len(sources))
        if not sources:
            # no source documents - that's strange but OK - when sources
            # appear we will get here again...
            return None
        return defer.maybeDeferred(cvtr.convert, sources
                        ).addBoth(self._cb_converted_or_not,
                                  cvtr, sources, proto_id, target_rev)

    def _cb_converted_or_not(self, result, target_ext, sources, proto_id,
                             target_rev):
        # This is both a callBack and an errBack.  If a converter fails to
        # create a document, we can't just fail, or no later messages in the
        # DB will ever get processed!
        # So we write a "dummy" record - it has the same docid that the real
        # document would have - but the 'type' attribute in the document
        # reflects it is actually an error marker.
        dest_cat, dest_type = target_ext.target_type
        if isinstance(result, Failure):
            logger.warn("Failed to convert a document: %s", result)
            if self.options.stop_on_error:
                logger.info("--stop-on-error specified - re-throwing error")
                result.raiseException()
            # and make a dummy doc.
            new_doc = {'error_details': unicode(result)}
            self.doc_model.prepare_ext_document(dest_cat, dest_type, proto_id,
                                                new_doc)
            # and patch the 'type' attribute to reflect its really an error.
            new_doc['type'] = 'core/error/msg'
        else:
            if result is None:
                # most likely the converter found an 'error' record in place
                # of its dependency.  We can safely skip this now - once the
                # error is corrected we will get another chance...
                logger.debug("converter declined to create a document")
                return

            new_doc = result
            self.doc_model.prepare_ext_document(dest_cat, dest_type, proto_id,
                                                new_doc)
            logger.debug("converter returned new document type %r for %r: %r",
                         dest_type, proto_id, new_doc['_id'])
        # In theory, the source ID of each doc that contributed is
        # redundant as it could be deduced.  But we need the revision to
        # check if we are up-to-date wrt our 'children'...
        new_doc['raindrop_sources'] = [(s['_id'], s['_rev']) for s in sources]
        if target_rev is not None:
            new_doc['_rev'] = target_rev
        return self.doc_model.create_ext_documents([new_doc])

def generate_work_queue(doc_model, transition_gen_factory):
    """generate deferreds which will determine where our processing is up
    to and walk us through the _all_docs_by_seq view from that point.  This
    generator itself determines the source documents to process, then passes
    each of those documents through another new generator, which actually
    calls the extensions and saves the docs."""
    def _cb_update_state_doc(result, d):
        if result is not None:
            assert d['_id'] == result['_id'], result
            d.update(result)
        # else no doc exists - the '_id' remains in the default though.

    def _cb_by_seq_opened(result, state_doc, convert_result):
        rows = result['rows']
        logger.debug('work queue has %d items to check.', len(rows))
        if not rows:
            # no rows left.  There is no guarantee our state doc will be
            # the last one...
            logger.info("work queue ran out of rows...")
            # either way, we are done!
            state_doc['finished'] = True
            return

        state_doc['seq'] = rows[-1]['key']
        # I *think* that if we share the same cooperator as the task itself,
        # we risk having the next chunk of sequence IDs processed before we
        # are done here.
        # OTOH, I'm not sure about that.....
        # As we are really only using a coiterator as a handy way of managing
        # twisted loops, using our own should be ok though.
        coop = task.Cooperator()
        return coop.coiterate(_gen_tasks_from_seq_rows(rows, convert_result))

    def _gen_tasks_from_seq_rows(rows, convert_result):
        for row in rows:
            did = row['id']
            src_rev = row['value']['rev']
            for task in transition_gen_factory(did, src_rev,
                                               caller_ret=convert_result):
                yield task

    # first open our 'state' document
    state_doc = {'_id': 'workqueue!msg',
                 'type': u"core/workqueue",
                 'seq': 0}
    yield doc_model.open_document_by_id(state_doc['_id'],
                ).addCallback(_cb_update_state_doc, state_doc)

    logger.info("Work queue starting with sequence ID %d",
                state_doc['seq'])

    logger.debug('opening by_seq view for work queue...')
    num_per_batch = 1000 # no docs are fetched, just meta-data about them.
    convert_result = {}
    while 'finished' not in state_doc:
        start_seq = state_doc['seq']
        convert_result['num_processed'] = 0
        yield doc_model.db.listDocsBySeq(limit=num_per_batch,
                                              startkey=state_doc['seq'],
                    ).addCallback(_cb_by_seq_opened, state_doc, convert_result)
        num_proc = convert_result['num_processed']
        logger.info("finished processing to sequence %r - %d processed",
                    state_doc['seq'], num_proc)
        if num_proc:
            logger.debug("flushing state doc at end of run...")
            # API mis-match here - the state doc isn't an 'extension'
            # doc - but create_ext_documents is the easy option...
            def update_rev(docs):
                state_doc['_rev'] = docs[0]['rev']
            assert 'finished' not in state_doc
            yield doc_model.create_ext_documents([state_doc]
                        ).addCallback(update_rev)
        else:
            logger.debug("no need to flush state doc")
