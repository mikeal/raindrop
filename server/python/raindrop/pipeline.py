""" This is the raindrop pipeline; it moves messages from their most raw
form to their most useful form.
"""
import sys
import uuid

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

# A list of extensions which 'spawn' new documents, optionally based on the
# existance of some other document.
# Keyed by 'source_type' (which may be None), and each elt is a list of
# extension instances
# XXX - for now limited to 'identity spawners'...
spawners = {}


def find_exts_in_module(mod_name, base_class):
    try:
        __import__(mod_name)
        mod = sys.modules[mod_name]
    except:
        logger.exception("Failed to load extension %r", mod_name)
        return
    for ob in mod.__dict__.itervalues():
        if isinstance(ob, type) and issubclass(ob, base_class):
            yield ob

def load_extensions(doc_model):
    for mod_name in extension_modules:
        for cvtr in find_exts_in_module(mod_name, base.ConverterBase):
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
        for ext in find_exts_in_module(mod_name, base.IdentitySpawnerBase):
            assert ext.source_type, ext # must have a source type.
            inst = ext(doc_model)
            spawners.setdefault(ext.source_type, []).append(inst)


class Pipeline(object):
    def __init__(self, doc_model, options):
        self.doc_model = doc_model
        self.options = options
        # use a cooperator to do the work via a generator.
        # XXX - should we own the cooperator or use our parents?
        self.coop = task.Cooperator()
        if not converters:
            load_extensions(doc_model)
            assert converters # this can't be good!

    def get_wq_factories(self):
        return MessageTransformerWQ, IdentitySpawnerWQ

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
            # XXX - need a list of queues...
            del_types = [f.queue_state_doc_id for f in self.get_wq_factories()]
            for rid in del_types:
                yield self.doc_model.open_document_by_id(rid
                        ).addCallback(delete_a_doc, rid)

        derived = set()
        for src_info, dest_info in converters.iterkeys():
            derived.add(dest_info)
        # error records are always 'derived'
        derived.add(('msg', 'core/error/msg'))
        return self.coop.coiterate(gen_deleting_docs(derived))

    def gen_work_queue(self, queue_factory):
        wq = queue_factory(self.doc_model, self.options.__dict__)
        return generate_work_queue(self.doc_model, wq)

    def start(self, queue_types=None):
        if not queue_types:
            facs = self.get_wq_factories()
        else:
            facs = [f for f in self.get_wq_factories()
                    if f.queue_state_doc_id in queue_types]
        return defer.DeferredList(
            [self.coop.coiterate(self.gen_work_queue(f)) for f in facs])

    def start_retry_errors(self):
        """Attempt to re-process all messages for which our previous
        attempt generated an error.
        """
        # We need to re-process this item from all its sources.  Once the new
        # item is in-place the normal mechanisms will do the right thing
        def gen_work():
            state_doc = {'raindrop_seq': 0}
            wq = MessageTransformerWQ(self.doc_model)
            while True:
                start_seq = state_doc['raindrop_seq']
                # no 'include_docs' so results are small; fetch 500 at a time.
                yield self.doc_model.open_view(
                                'raindrop!proto!workqueue', 'errors',
                                startkey=state_doc['raindrop_seq'],
                                limit=500,
                        ).addCallback(self._cb_errorq_opened, state_doc
                        )
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
        wq = MessageTransformerWQ(self.doc_model, self.options.__dict__)
        gen = wq.generate_tasks(source['_id'], source['_rev'], force=True)

        def fake_workqueue():
            for task in gen:
                yield task.addCallback(wq.consume)
        return coop.coiterate(fake_workqueue())

class WorkQueue:
    # These WorkQueues are very much still a thought-in-progress.
    # In particular, abstracting of dependency management and error
    # handling remains to be done.
    queue_state_doc_id = None
    def __init__(self, doc_model, options={}):
        self.doc_model = doc_model
        self.options = options

    def generate_tasks(self, src_id, src_rev):
        # A generator which checks if each of its 'targets' (ie, the extension
        # which depends on this document) is up-to-date wrt this document's
        # revision.
        raise NotImplementedError(self)

    def consume(self, result):
        raise NotImplementedError(self)

class MessageTransformerWQ(WorkQueue):
    """A queue which uses 'transformers' to create 'related' documents based
    on our DAG.
    """
    queue_state_doc_id = 'workqueue!msg'
    def consume(self, new_doc):
        logger.debug("consuming object of type %s", type(new_doc))
        def return_num(result):
            return len(result)
        if new_doc is not None:
            return self.doc_model.create_ext_documents([new_doc]
                        ).addCallback(return_num)

    def generate_tasks(self, src_id, src_rev, force=False):
        logger.debug("generating transition tasks for %r (rev=%s)", src_id,
                     src_rev)

        dm = self.doc_model
        # For each target we need to determine if the doc exists, and if so,
        # if our revision number is in the 'raindrop_sources' attribute.
        # If it is, the target is up-to-date wrt us, so all is good.
        try:
            doc_cat, doc_type, proto_id = dm.split_docid(src_id)
        except ValueError:
            logger.info("skipping document %r", src_id)
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
                                  proto_id, src_id, src_rev, force
                    )

    def _cb_check_existing_doc(self, result, cvtr, proto_id, src_id, src_rev,
                               force):
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
        return self._make_document(cvtr, proto_id, target_rev)

    def _make_document(self, cvtr, proto_id, target_rev):
        # OK - need to create this new type - locate all dependents in the
        # DB - this will presumably include the document which triggered
        # the process...
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
            if self.options.get('stop_on_error', False):
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
        return new_doc
    


class IdentitySpawnerWQ(WorkQueue):
    """For examining types of documents and running extensions which can
    create new identity records.

    Basic contact management is also done by this extension; once we have
    been given a list of (identity_id, relationship_name) tuples see if we can
    find a contact ID associated with any of them, and create a new 'default'
    contact if not. Then ensure each of the identities is associated with the
    contact.
    """
    queue_state_doc_id = 'workqueue!identities'

    # It sucks we need to join these here; the doc_model should do
    # that - so we abstract that away...
    @classmethod
    def get_prov_id(cls, identity_id):
        return '/'.join(identity_id)

    def consume(self, new_docs):
        logger.debug("consuming %d new docs", len(new_docs))
        def return_num(result):
            return len(new_docs)
        if new_docs:
            #prepare = self.doc_model.prepare_ext_document
            #just_docs = []
            #for dcat, ddoctype, dprovid, doc in new_docs:
            #    prepare(dcat, ddoctype, dprovid, doc)
            #    just_docs.append(doc)
            return self.doc_model.create_raw_documents(None, new_docs
                        ).addCallback(return_num)

    def generate_tasks(self, src_id, src_rev, force=False):
        logger.debug("generating transition tasks for %r (rev=%s)", src_id,
                     src_rev)

        dm = self.doc_model
        # For each target we need to determine if the doc exists, and if so,
        # if our revision number is in the 'raindrop_sources' attribute.
        # If it is, the target is up-to-date wrt us, so all is good.
        try:
            doc_cat, doc_type, proto_id = dm.split_docid(src_id)
        except ValueError:
            logger.info("skipping document %r", src_id)
            return

        my_spawners = spawners.get((doc_cat, doc_type))
        if not my_spawners:
            logger.debug("documents of type %r have no spawners", doc_type)
            return

        # open the source doc then let-em at it...
        yield self.doc_model.open_document_by_id(src_id
                    ).addCallback(self.get_id_rels, doc_type, my_spawners
                    )

    def get_id_rels(self, src_doc, exp_type, my_spawners):
        new_docs = []
        def return_docs(whateva):
            return new_docs
        def gen_work():
            for spawner in my_spawners:
                # each of our spawners returns a simple list of identities
                idrels = spawner.get_identity_rels(src_doc)
                if __debug__: # check the extension is sane...
                    for iid, rel in idrels:
                        assert isinstance(iid, (tuple, list)) and len(iid)==2,\
                               repr(iid)
                        assert rel is None or isinstance(rel, basestring), repr(rel)
                # Find contacts associated with *any* of the identities and use the
                # first we find - hence the requirement the 'primary' identity be
                # the first, so if a contact is associated with that, we use
                # it
                identities = [i[0] for i in idrels]
                yield self.doc_model.open_view('raindrop!contacts!all',
                                               'by_identity',
                                               keys=identities, limit=1,
                                               include_docs=True,
                    ).addCallback(self._check_contact_view, src_doc, new_docs,
                                  spawner, idrels,
                    )

        if src_doc.get('type') != exp_type:
            # probably an error record...
            logger.info("skipping doc %r - unexpected type of %s",
                         src_doc['_id'], src_doc.get('type'))
            return new_docs
        coop = task.Cooperator()
        return coop.coiterate(gen_work()
                    ).addCallback(return_docs
                    )

    def _check_contact_view(self, result, src_doc, new_docs, spawner, idrels):
        rows = result['rows']
        if not rows:
            # None of the identities matched a contact, so we create a new
            # contact for this skype user.
            # we can't use a 'natural key' for a contact....
            contact_provid = str(uuid.uuid4())
            cdoc = {
                'contact_id': contact_provid,
            }
            def_props = spawner.get_default_contact_props(src_doc)
            assert 'name' in def_props, def_props # give us a name at least!
            cdoc.update(def_props)
            new_docs.append(('id', 'contact', contact_provid, cdoc))
            logger.debug("Will create new contact %r", contact_provid)
            contact_id = contact_provid
        else:
            row = rows[0]
            contact_id = row['value'][0]
            logger.debug("Found existing contact %r", contact_id)

        # We know the contact to use and the list of identity relationships.
        # The relationship to the contact is stored next to the identity - so
        # open the document listing the relationships of the identities to
        # contacts, and create or update them as necessary...
        doc_model = self.doc_model
        keys = []
        infos = []
        for iid, rel in idrels:
            prov_id = self.get_prov_id(iid)
            # the identity itself.
            did = doc_model.build_docid('id', iid[0], prov_id,
                                        prov_encoded=False)
            keys.append(did)
            # the identity/contact relationships doc.
            did = doc_model.build_docid('id', 'contacts', prov_id,
                                        prov_encoded=False)
            keys.append(did)
    
        return doc_model.db.listDoc(keys=keys, include_docs=True,
                ).addCallback(self._got_identities, new_docs, contact_id, idrels
                )

    def _got_identities(self, result, new_docs, contact_id, idrels):
        doc_model = self.doc_model
        rows = result['rows']
        # we expect a row for every key, even those which failed.
        assert len(rows)==len(idrels)*2
        def row_exists(r):
            return 'error' not in r and 'deleted' not in r['value']

        for i, (iid, rel) in enumerate(idrels):
            assert isinstance(iid, (tuple, list)) and len(iid)==2, repr(iid)
            assert rel is None or isinstance(rel, basestring), repr(rel)
            id_row = rows[i*2]
            rel_row = rows[i*2+1]
            prov_id = self.get_prov_id(iid)
            # The ID row is easy - just create it if it doesn't exist.
            if not row_exists(id_row):
                id_doc = {
                    'identity_id': iid,
                }
                new_docs.append(('id', iid[0], prov_id, id_doc))
            # The 'relationship' row should exist as we either (a) wrote a new
            # one above or (b) found and used an existing one...
            new_rel = (contact_id, rel)
            if not row_exists(rel_row):
                # need to create a new ID doc...
                new_rel_doc = {
                    'identity_id': iid,
                    'contacts': [new_rel],
                }
                logger.debug("new relationship (new doc) from %r -> %r", iid,
                             contact_id)
            else:
                existing = rel_row['doc'].get('contacts', [])
                logger.debug("looking for %r in %s", contact_id, existing)
                for cid, existing_rel in existing:
                    if cid == contact_id:
                        new_rel_doc = None
                        break # yay
                else:
                    # not found - we need to re-write this doc.
                    new_rel_doc = rel_row['doc'].copy()
                    new_rel_doc['contacts'] = existing + [new_rel]
                    logger.debug("new relationship (update) from %r -> %r",
                                 iid, contact_id)
            if new_rel_doc is not None:
                new_docs.append(('id', 'contacts', prov_id, new_rel_doc))


def generate_work_queue(doc_model, wq):
    """generate deferreds which will determine where our processing is up
    to and walk us through the _all_docs_by_seq view from that point.  This
    generator itself determines the source documents to process, then passes
    each of those documents through another new generator, which actually
    calls the extensions.  The result from the extension is then passed to
    the consumer (a callable) which does whatever necessary.
    
    In the common case the generator_factory will yield documents and
    the consumer will save them.
    """
    hacky_state = {}

    def _cb_update_state_doc(result, d):
        if result is not None:
            assert d['_id'] == result['_id'], result
            d.update(result)
        # else no doc exists - the '_id' remains in the default though.

    def _cb_by_seq_opened(result, state_doc):
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
        return coop.coiterate(_gen_tasks_from_seq_rows(rows))

    def record_work(num):
        hacky_state['num_processed'] += 1
        
    def _gen_tasks_from_seq_rows(rows):
        for row in rows:
            if 'error' in row:
                # This is usually a simple 'not found' error; it doesn't
                # mean an 'error record'
                logger.debug('skipping document %(key)s - %(error)s', row)
                continue
            if 'deleted' in row['value']:
                logger.debug('skipping document %s - deleted', row['key'])
                continue
            did = row['id']
            src_rev = row['value']['rev']
            for task in wq.generate_tasks(did, src_rev):
                yield task.addCallback(wq.consume
                        ).addCallback(record_work)

    # first open our 'state' document
    state_doc = {'_id': wq.queue_state_doc_id,
                 'type': wq.queue_state_doc_id,
                 'seq': 0}
    yield doc_model.open_document_by_id(state_doc['_id'],
                ).addCallback(_cb_update_state_doc, state_doc)

    logger.info("Work queue %r starting with sequence ID %d",
                wq.queue_state_doc_id, state_doc['seq'])

    logger.debug('opening by_seq view for work queue...')
    num_per_batch = 1000 # no docs are fetched, just meta-data about them.
    while 'finished' not in state_doc:
        hacky_state['num_processed'] = 0
        start_seq = state_doc['seq']
        yield doc_model.db.listDocsBySeq(limit=num_per_batch,
                                              startkey=state_doc['seq'],
                    ).addCallback(_cb_by_seq_opened, state_doc)
        num_proc = hacky_state['num_processed']
        logger.info("finished processing %r to %r - %d processed",
                    wq.queue_state_doc_id, state_doc['seq'], num_proc)
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
