""" This is the raindrop pipeline; it moves messages from their most raw
form to their most useful form.
"""
import sys
import uuid

from twisted.internet import defer, task
from twisted.python.failure import Failure
from twisted.internet import reactor
import twisted.web.error

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
    'raindrop.ext.identity',
    'raindrop.ext.message.rfc822',
    'raindrop.ext.message.email',
    'raindrop.ext.message.mailinglist',
    'raindrop.ext.message.message',
    'raindrop.ext.message.convos',
]

# A set of extensions...
extensions = set()

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

def find_specified_extensions(base_class, exts=None):
    ret = set()
    ret_names = set()
    for ext in extensions:
        if not isinstance(ext, base_class):
            continue
        if exts is None:
            ret.add(ext)
        else:
            klass = ext.__class__
            name = klass.__module__ + '.' + klass.__name__
            if name in exts:
                ret.add(ext)
                ret_names.add(name)
    if __debug__ and exts:
        missing = set(exts) - set(ret_names)
        if missing:
            logger.error("The following extensions are unknown: %s",
                         missing)
    return ret

def load_extensions(doc_model):
    converters = {} # identify conflicts to help the user...
    # still a little confused - this should load more types...
    for mod_name in extension_modules:
        for cvtr in find_exts_in_module(mod_name, base.ConverterBase):
            assert cvtr.target_type, cvtr # must have a target type
            # Is the target-type valid
            assert isinstance(cvtr.target_type, tuple) and \
                   len(cvtr.target_type)==2, cvtr
            inst = cvtr(doc_model)
            extensions.add(inst)
            for sid in cvtr.sources:
                cvtr_key = sid, cvtr.target_type
                if cvtr_key in converters:
                    other = converters[cvtr_key]
                    msg = "Message transition %r->%r is registered by both %r and %r"
                    logger.error(msg, sid, cvtr.target_type, cvtr, other)
                    continue
                converters[cvtr_key] = inst
        # XXX - this is wrong - technically the things below are extensions
        # of the IdentitySpawner extension!
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
        if not extensions:
            load_extensions(doc_model)
            assert extensions # this can't be good!

    def get_work_queues(self, spec_exts=None):
        """Get all the work-queues we know about - later this might be
        an extension point?
        """
        if spec_exts is None:
            spec_exts = self.options.exts
        ret = []
        for ext in find_specified_extensions(base.ConverterBase, spec_exts):
            inst = MessageTransformerWQ(self.doc_model, ext,
                                        options = self.options.__dict__)
            ret.append(inst)
        # yuck yuck...
        iwq = IdentitySpawnerWQ(self.doc_model, self.options.__dict__)
        if not spec_exts or iwq.get_queue_name() in spec_exts:
            ret.append(iwq)
        return ret

    @defer.inlineCallbacks
    def unprocess(self):
        # A bit of a hack that will suffice until we get better dependency
        # management.  Determines which doc-types are 'derived', then deletes
        # them all.
        exts = self.options.exts
        derived = set()
        ext_insts = find_specified_extensions(base.ConverterBase, exts)
        for e in ext_insts:
            derived.add(e.target_type)

        # error records are always 'derived'
        # XXX - error records per queue!
        derived.add(('msg', 'core/error/msg'))
        derived.add(('msg', 'ghost'))
        # our test messages can always go...
        derived.add(('msg', 'proto/test'))

        for dc, dt in derived:
            result = yield self.doc_model.open_view('raindrop!messages!by',
                                                    'by_doc_type',
                                                    key=dt)

            docs = []
            to_del = [(row['id'], row['value']) for row in result['rows']]
            for id, rev in to_del:
                docs.append({'_id': id, '_rev': rev, '_deleted': True})
            logger.info('deleting %d messages of type %r', len(docs), dt)
            _ = yield self.doc_model.db.updateDocuments(docs)
            
        # and our work-queue docs - they aren't seen by the view, so
        # just delete them by ID.
        if not exts:
            queues = self.get_work_queues()
        else:
            queues = [f for f in self.get_work_queues()
                      if f.get_queue_name() in exts]

        del_types = [q.get_queue_id() for q in queues]
        for rid in del_types:
            doc = yield self.doc_model.open_document_by_id(rid)
            if doc is None:
                logger.debug("can't delete document %r - it doesn't exist", rid)
            else:
                logger.info("deleting document %(_id)r (rev %(_rev)s)", doc)
                _ = yield self.doc_model.db.deleteDoc(doc['_id'], doc['_rev'])
        # and rebuild our views
        logger.info("rebuilding all views...")
        _ = yield self.doc_model._update_important_views()

    def start(self, force=None):
        runner = QueueRunner(self.doc_model, self.get_work_queues(),
                             self.options)
        return runner.run(force)

    @defer.inlineCallbacks
    def start_retry_errors(self):
        """Attempt to re-process all messages for which our previous
        attempt generated an error.
        """
        qs = self.get_work_queues()
        for q in qs:
            # We need to re-process this item from all its sources.  Once the new
            # item is in-place the normal mechanisms will do the right thing
            state_doc = {'raindrop_seq': 0}
            while True:
                num_processed = 0
                start_seq = state_doc['raindrop_seq']
                # no 'include_docs' so results are small; fetch 500 at a time.
                result = yield self.doc_model.open_view(
                                    'raindrop!proto!workqueue', 'errors',
                                    startkey=[q.get_queue_id(), start_seq],
                                    endkey=[q.get_queue_id(), {}],
                                    limit=500)
                for row in result['rows']:
                    logger.debug("processing error document %r", row['id'])
                    # Open *any* of the original source docs and re-process.
                    sources = row['value']
                    source = yield self.doc_model.open_document_by_id(sources[0][0])
                    got = yield q.process([(source['_id'], source['_rev'])],
                                           force=True)
                    num = yield q.consume(got)
                    num_processed += (num or 0)
                    state_doc['raindrop_seq'] = row['key']
                if start_seq == state_doc['raindrop_seq']:
                    break

class QueueRunner(object):
    def __init__(self, dm, qs, options):
        self.doc_model = dm
        self.queues = qs
        assert qs, "nothing to do?"
        self.options = options
        self.state_docs = None # set as we run.
        self.dc_status = None # a 'delayed call'
        self.status_msg_last = None

    def _start_q(self, q, sd, def_done, force):
        assert not q.running, q
        q.running = True
        process_work_queue(self.doc_model, q, sd, force
                ).addBoth(self._q_done, q, sd, def_done, force
                )

    def _q_status(self):
        lowest = (0xFFFFFFFFFFFF, None)
        highest = (0, None)
        nfailed = 0
        for qlook, sdlook in zip(self.queues, self.state_docs):
            if qlook.failed:
                nfailed += 1
                continue
            this = sdlook['seq'], qlook.get_queue_name()
            if this < lowest:
                lowest = this
            if this > highest:
                highest = this
        behind = highest[0] - lowest[0]
        msg = "slowest queue is %r at %d (%d behind)" % \
              (lowest[1], lowest[0], behind)
        if nfailed:
            msg += " - %d queues have failed" % nfailed
        if self.status_msg_last != msg:
            logger.info(msg)
            self.status_msg_last = msg
        self.dc_status = reactor.callLater(5, self._q_status)

    def _q_done(self, result, q, state_doc, def_done, force):
        q.running = False
        failed = isinstance(result, Failure)
        if failed:
            logger.error("queue %r failed: %s", state_doc, result)
            q.failed = True
        else:
            logger.debug('queue reports it is complete: %s', state_doc)
            assert result in (True, False), repr(result)
        # First check for any other queues which are no longer running
        # but have a sequence less than ours.
        still_going = False
        nerrors = len([tq for tq in self.queues if tq.failed])
        for qlook, sdlook in zip(self.queues, self.state_docs):
            if qlook.running:
                still_going = True
            # only restart queues if stop_on_error isn't specified.
            if nerrors and self.options.stop_on_error:
                continue
            if qlook is not q and not qlook.running and not qlook.failed and \
               sdlook['seq'] < state_doc['seq']:
                still_going = True
                self._start_q(qlook, sdlook, def_done, force)

        if not failed and not result:
            # The queue which called us back hasn't actually finished yet...
            still_going = True
            self._start_q(q, state_doc, def_done, force)

        if not still_going:
            # All done.
            logger.info("All queues are finished!")
            def_done.callback(None)
        # else wait for one of the queues to finish and call us again...

    @defer.inlineCallbacks
    def run(self, force=None):
        if force is None:
            force = self.options.force
        dm = self.doc_model
        result = yield defer.DeferredList([
                    prepare_work_queue(dm, q, force)
                    for q in self.queues])

        state_docs = self.state_docs = [r[1] for r in result]

        self.dc_status = reactor.callLater(5, self._q_status)
        def_done = defer.Deferred()
        for q, state_doc in zip(self.queues, state_docs):
            q.failed = False
            q.running = False
            self._start_q(q, state_doc, def_done, force)
        _ = yield def_done
        self.dc_status.cancel()
        # update the views now...
        _ = yield self.doc_model._update_important_views()
    

class WorkQueue(object):
    # These WorkQueues are very much still a thought-in-progress.
    # In particular, abstracting of dependency management and error
    # handling remains to be done.
    queue_state_doc_id = None
    def __init__(self, doc_model, options={}):
        self.doc_model = doc_model
        self.options = options

    def get_queue_id(self):
        # The ID for the doc etc.
        return "workqueue!" + self.queue_state_doc_id

    def get_queue_name(self):
        # The name the user uses
        return self.queue_state_doc_id

    def consume(self, results):
        # Consumes whatever 'process' returns, which should be a generator.
        # Ultimately we want to push the generator itself down into the
        # "doc-model" so only one doc needs to be in memory at once.  Even
        # before that is should be possible to share the same impl between
        # queues - but currently some create 'raw' docs
        # and some create 'ext' docs.
        raise NotImplementedError(self)

    def process(self, src_infos, *args, **kw):
        # A function which processes a number of 'source docs' found by the
        # work-queue.  The extension is free to consume as many as it
        # chooses (ie, the only promise is the first will be consumed, but
        # more may be consumed if the extension can batch things safely...)
        # Should returns a generator of deferreds, but whatever is returned
        # is passed directly to self.consume.
        raise NotImplementedError(self)

    # Eventually we want the docmodel to consume a generator directly, but for
    # now we 'unroll' it first.  The 'process' method may return None or a
    # generator, and each elt of the generator may itself be None, a document
    # or another generator.
    # IOW - a 'tree' of generators where each leaf is None or a doc.
    @classmethod
    @defer.inlineCallbacks
    def unroll_generator(cls, g):
        import types
        ret = []
        if g is not None:
            for item in g:
                if isinstance(item, defer.Deferred):
                    item = yield item
                if isinstance(item, types.GeneratorType):
                    # unroll the new generator
                    item = yield cls.unroll_generator(item)
                    ret.extend(item)
                elif item is not None:
                    ret.append(item)
        defer.returnValue(ret)

class MessageTransformerWQ(WorkQueue):
    """A queue which uses 'transformers' to create 'related' documents based
    on our DAG.
    """
    queue_state_doc_id = 'workqueue!msg'

    def __init__(self, doc_model, ext, options={}):
        super(MessageTransformerWQ, self).__init__(doc_model, options)
        self.ext = ext

    def get_queue_id(self):
        klass = self.ext.__class__
        return 'workqueue!msg!' + klass.__module__ + '.' + klass.__name__

    def get_queue_name(self):
        klass = self.ext.__class__
        return klass.__module__ + '.' + klass.__name__

    @defer.inlineCallbacks
    def consume(self, doc_gen):
        to_save = yield self.unroll_generator(doc_gen)
        if to_save:
            logger.debug("creating %d new docs", len(to_save))
            _ = yield self.doc_model.create_ext_documents(to_save)
        defer.returnValue(len(to_save))

    @defer.inlineCallbacks
    def process(self, src_infos, force=False):
        dm = self.doc_model
        cvtr = self.ext
        keys = []
        src_infos_use = []
        # src_infos will might return *lots* - we self-throttle...
        num_per_batch=200
        for src_id, src_rev in src_infos:
            # For each target we need to determine if the doc exists, and if so,
            # if our revision number is in the 'raindrop_sources' attribute.
            # If it is, the target is up-to-date wrt us, so all is good.
            try:
                doc_cat, doc_type, proto_id = dm.split_docid(src_id)
            except ValueError:
                logger.debug("skipping document %r", src_id)
                continue
    
            if (doc_cat, doc_type) not in self.ext.sources:
                #logger.debug("skipping document %r - not one of ours", src_id)
                continue
    
            target_cat, target_type = self.ext.target_type
            assert target_cat==doc_cat, (target_cat, doc_cat)
            target_id = dm.build_docid(target_cat, target_type, proto_id)
            logger.debug('looking for existing document %r', target_id)
            keys.append(target_id)
            src_infos_use.append((src_id, src_rev, proto_id))
            if len(keys) > num_per_batch:
                break

        if not keys:
            defer.returnValue([])

        result = yield dm.open_view('raindrop!proto!workqueue',
                                    'source_revs',
                                    keys=keys)

        # 'Missing' documents aren't in the list, so we need to reconstruct
        # the list inserting missing entries.
        rows = result['rows']
        rd = {}
        for row in rows:
            rd[row['key']] = row
        rows = []
        for key in keys:
            rows.append(rd.get(key))

        assert len(rows)==len(keys) # errors etc are still included...
        all_targets = set()
        all_deps = []
        target_info = []
        for r, target, (src_id, src_rev, pid) in zip(rows, keys, src_infos_use):
            if r is None:
                # no target exists at all - needs to be executed...
                need_target = True
                target_rev = None
            else:
                val = r['value']
                target_rev, all_sources = val
                look = [src_id, src_rev]
                need_target = force or look not in all_sources
                logger.debug("need target=%s (looked for %r in %r)", need_target,
                             look, all_sources)
            if not need_target or target in all_targets:
                continue

            all_targets.add(target)
            # OK - need to create this new type - locate all dependents in the
            # DB - this will presumably include the document which triggered
            # the process...
            for src_cat, src_type in cvtr.sources:
                all_deps.append(dm.build_docid(src_cat, src_type, pid))
            target_info.append((pid, target_rev))

        result = yield dm.db.listDoc(keys=all_deps, include_docs=True)
        # Now split the results back into individual targets...
        rows = result['rows']
        nper = len(cvtr.sources)
        # there are multiple rows for each target...
        assert len(rows) == len(target_info) * nper
        def gen_em(rows):
            while rows:
                this_rows = rows[:nper]
                rows = rows[nper:]
                pid, target_rev = target_info.pop(0)
                sources = []
                for r in this_rows:
                    if 'error' in r:
                        # This is usually a simple 'not found' error; it doesn't
                        # mean an 'error record'
                        logger.debug('skipping document %(key)s - %(error)s', r)
                        continue
                    if 'deleted' in r['value']:
                        logger.debug('skipping document %s - deleted', r['key'])
                        continue
                    sources.append(r['doc'])
                if not sources:
                    # no source documents - that's strange but OK - when sources
                    # appear we will get here again...
                    continue
    
                logger.debug("calling %r to create a %s from %d docs", cvtr,
                             cvtr.target_type, len(sources))

                yield defer.maybeDeferred(cvtr.convert, sources
                            ).addBoth(self._cb_converted_or_not, sources,
                                      pid, target_rev)

        # return a generator for consumption by the caller
        defer.returnValue(gen_em(rows))

    def _cb_converted_or_not(self, result, sources, proto_id, target_rev):
        # This is both a callBack and an errBack.  If a converter fails to
        # create a document, we can't just fail, or no later messages in the
        # DB will ever get processed!
        # So we write a "dummy" record - it has the same docid that the real
        # document would have - but the 'type' attribute in the document
        # reflects it is actually an error marker.
        dest_cat, dest_type = self.ext.target_type
        if isinstance(result, Failure):
            #if isinstance(result.value, twisted.web.error.Error):
            #    # eeek - a socket error connecting to couch; we want to abort
            #    # here rather than try to write an error record with the
            #    # connection failure details (but worse, that record might
            #    # actually be written - we might just be out of sockets...)
            #    result.raiseException()

            sids = [s['_id'] for s in sources]
            logger.warn("Failed to create a %r from %r: %s",
                        self.ext.target_type, sids, result)
            if self.options.get('stop_on_error', False):
                logger.info("--stop-on-error specified - re-throwing error")
                result.raiseException()
            # and make a dummy doc.
            new_doc = {'error_details': unicode(result)}
            self.doc_model.prepare_ext_document(dest_cat, dest_type, proto_id,
                                                new_doc)
            # and patch the 'type' attribute to reflect its really an error.
            new_doc['type'] = 'core/error/msg'
            new_doc['workqueue'] = self.get_queue_id()
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
    queue_state_doc_id = 'identities'

    # It sucks we need to join these here; the doc_model should do
    # that - so we abstract that away...(poorly - skype and twitter now
    # also duplicate this...)
    @classmethod
    def get_prov_id(cls, identity_id):
        return '/'.join(identity_id)

    @defer.inlineCallbacks
    def consume(self, doc_gen):
        to_save = yield self.unroll_generator(doc_gen)
        if to_save:
            logger.debug("creating %d new docs", len(to_save))
            _ = yield self.doc_model.create_raw_documents(None, to_save)

    @defer.inlineCallbacks
    def process(self, src_infos, force=False):
        dm = self.doc_model
        # We only ever do one at a time; the next in the queue may depend
        # on what we wrote - specifically the contact.  If this shows as
        # a bottle-neck, we could cache contacts, or write only contacts
        # immediately - but for now things are complex enough...
        try:
            # src_infos may be a list?  so iter it is..
            src_id, src_rev = iter(src_infos).next()
        except StopIteration:
            return

        logger.debug("generating transition tasks for %r (rev=%s)", src_id,
                     src_rev)
        try:
            doc_cat, doc_type, proto_id = dm.split_docid(src_id)
        except ValueError:
            logger.debug("skipping document %r", src_id)
            return

        my_spawners = spawners.get((doc_cat, doc_type))
        if not my_spawners:
            logger.debug("documents of type %r have no spawners", doc_type)
            return

        # open the source doc then let-em at it...
        src_doc = yield dm.open_document_by_id(src_id)
        if src_doc is None:
            return
        if src_doc.get('type') != doc_type:
            # probably an error record...
            logger.info("skipping doc %r - unexpected type of %s",
                         src_doc['_id'], src_doc.get('type'))
            return

        def gen_em():
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
                        ).addCallback(self._check_contact_view, src_doc,
                                      spawner, idrels,
                        )

        # return a generator for consumption by the caller
        defer.returnValue(gen_em())

    def _check_contact_view(self, result, src_doc, spawner, idrels):
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
            yield ('id', 'contact', contact_provid, cdoc)
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

        yield doc_model.db.listDoc(keys=keys, include_docs=True,
                    ).addCallback(self._got_identities, contact_id, idrels
                    )

    def _got_identities(self, result, contact_id, idrels):
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
                yield ('id', iid[0], prov_id, id_doc)
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
                yield ('id', 'contacts', prov_id, new_rel_doc)


@defer.inlineCallbacks
def prepare_work_queue(doc_model, wq, force=False):
    # first open our 'state' document
    state_doc = {'_id': wq.get_queue_id(),
                 'type': wq.get_queue_id(),
                 'seq': 0}
    result = yield doc_model.open_document_by_id(state_doc['_id'])

    if result is not None:
        assert state_doc['_id'] == result['_id'], result
        state_doc.update(result)
    # else no doc exists - the '_id' remains in the default though.
    if force:
        state_doc['seq'] = 0
    state_doc['last_saved_seq'] = state_doc['seq']
    defer.returnValue(state_doc)

@defer.inlineCallbacks
def process_work_queue(doc_model, wq, state_doc, force, num_to_process=5000):
    """processes a number of items in a work-queue.
    """
    logger.debug("Work queue %r starting with sequence ID %d",
                 wq.get_queue_name(), state_doc['seq'])

    logger.debug('opening by_seq view for work queue...')

    num_processed = 0
    start_seq = state_doc['seq']
    result = yield doc_model.db.listDocsBySeq(limit=num_to_process,
                                           startkey=state_doc['seq'])
    rows = result['rows']
    logger.debug('work queue has %d items to check.', len(rows))
    if not rows:
        # no rows left.
        logger.debug("work queue ran out of rows...")
        defer.returnValue(True)

    # and process each of the rows...
    def gen_sources():
        # A generator that will keep offering rows until either we run out or
        # the extension has generated 'enough' documents (eg, some extension
        # points may not be able to 'batch' effectively, so will only consume
        # one item per call, others may consume until the generator is
        # exhausted...)
        while rows:
            row = rows.pop(0)
            # Update the state-doc now (it's not saved until we get to the end tho..)
            state_doc['seq'] = row['key']
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
            yield did, src_rev

    while rows:
        got = yield wq.process(gen_sources(), force=force)
        num = yield wq.consume(got)
        num_processed += (num or 0)

    logger.debug("finished processing %r to %r - %d processed",
                 wq.get_queue_name(), state_doc['seq'], num_processed)

    # We can chew 5000 docs quickly next time...
    last_saved = state_doc['last_saved_seq']
    if num_processed or (state_doc['seq']-last_saved) > 5000:
        logger.debug("flushing state doc at end of run...")
        # API mis-match here - the state doc isn't an 'extension'
        # doc - but create_ext_documents is the easy option...
        try:
            del state_doc['last_saved_seq']
        except KeyError:
            pass
        docs = yield doc_model.create_ext_documents([state_doc])
        state_doc['_rev'] = docs[0]['rev']
        state_doc['last_saved_seq'] = state_doc['seq']
    else:
        logger.debug("no need to flush state doc")
    defer.returnValue(False)
