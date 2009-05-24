""" This is the raindrop pipeline; it moves messages from their most raw
form to their most useful form.
"""
import sys
import types
import uuid

from twisted.internet import defer, task, threads
from twisted.python.failure import Failure
from twisted.internet import reactor
import twisted.web.error
from urllib import unquote

import logging

logger = logging.getLogger(__name__)

from .proc import base

# XXX - we need to load this info - including the code - from the couch...
# We search the modules for decorated functions.
extension_modules = [
    'raindrop.proto.test',
    'raindrop.proto.skype',
    'raindrop.proto.imap',
    'raindrop.proto.twitter',
    'raindrop.ext.message.rfc822',
    'raindrop.ext.message.mailinglist',
    'raindrop.ext.message.convos',
]

# A set of extensions...
extensions = set()

def find_exts_in_module(mod_name, special_attr):
    try:
        __import__(mod_name)
        mod = sys.modules[mod_name]
    except:
        logger.exception("Failed to load extension %r", mod_name)
        return
    for ob in mod.__dict__.itervalues():
        if callable(ob) and hasattr(ob, special_attr):
            yield ob

def get_extension_id(ext):
    return ext.extension_id

def find_specified_extensions(special_attr, exts=None):
    ret = set()
    ret_names = set()
    for ext in extensions:
        if not hasattr(ext, special_attr):
            continue
        if exts is None:
            ret.add(ext)
        else:
            name = get_extension_id(ext)
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
    # still a little confused - this should load more types...
    for mod_name in extension_modules:
        for cvtr in find_exts_in_module(mod_name, 'extension_id'):
            extensions.add(cvtr)


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
        for ext in find_specified_extensions('extension_id', spec_exts):
            inst = MessageTransformerWQ(self.doc_model, ext,
                                        options = self.options.__dict__)
            ret.append(inst)
        return ret

    @defer.inlineCallbacks
    def unprocess(self):
        # Just nuke all items that have a 'rd_source' specified...
        # XXX - should do this in a loop with a limit to avoid chewing
        # all mem...
        result = yield self.doc_model.open_view('raindrop!content!all',
                                                'by_raindrop_source')
        docs = []
        to_del = [(row['id'], row['value']) for row in result['rows']]
        for id, rev in to_del:
            docs.append({'_id': id, '_rev': rev, '_deleted': True})
        logger.info('deleting %d messages', len(docs))
        _ = yield self.doc_model.db.updateDocuments(docs)

        # and our work-queue docs - they aren't seen by the view, so
        # just delete them by ID.
        exts = self.options.exts
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
            logger.error("queue %r failed: %s", q.get_queue_name(), result)
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
    

class MessageTransformerWQ(object):
    """A queue which uses extensions to create new schema instances for
    raindrop content items
    """
    queue_state_doc_id = 'workqueue!msg'

    def __init__(self, doc_model, ext, options={}):
        self.ext = ext
        self.doc_model = doc_model
        self.options = options

    # Eventually we want the docmodel to consume a generator directly, but for
    # now we 'unroll' it first.  The 'process' method may return None or a
    # generator, and each elt of the generator may itself be None, a document
    # or another generator.
    # IOW - a 'tree' of generators where each leaf is None or a doc.
    @classmethod
    @defer.inlineCallbacks
    def unroll_generator(cls, g):
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

    @defer.inlineCallbacks
    def consume(self, doc_gen):
        # Consumes whatever 'process' returns, which should be a generator.
        # Ultimately we want to push the generator itself down into the
        # "doc-model" so only one doc needs to be in memory at once.  Even
        # before that is should be possible to share the same impl between
        # queues - but currently some create 'raw' docs
        # and some create 'ext' docs.
        to_save = yield self.unroll_generator(doc_gen)
        if to_save:
            logger.debug("creating %d new docs", len(to_save))
            _ = yield self.doc_model.create_schema_items(to_save)
        defer.returnValue(len(to_save))

    def get_queue_id(self):
        return 'workqueue!msg!' + get_extension_id(self.ext)

    def get_queue_name(self):
        return get_extension_id(self.ext)

    def _get_ext_env(self, new_items, src_doc):
        # Hack together an environment for the extension to run in
        # (specifically, provide the emit_schema etc globals)
        # NOTE: These are all called in the context of a worker thread and
        # are expected by the caller to block.
        def emit_schema(schema_id, items, rd_key=None, confidence=None):
            ni = {'schema_id': schema_id,
                  'items': items,
                  'ext_id' : self.ext.extension_id,
                  }
            if rd_key is None:
                ni['rd_key'] = src_doc['rd_key']
            else:
                ni['rd_key'] = rd_key
            if confidence is not None:
                ni['confidence'] = confidence
            ni['rd_source'] = [src_doc['_id'], src_doc['_rev']]
            new_items.append(ni)
            return self.doc_model.get_doc_id_for_schema_item(ni)

        def emit_related_identities(identity_ids, def_contact_props):
            for item in items_from_related_identities(self.doc_model,
                                                 identity_ids,
                                                 def_contact_props,
                                                 self.ext.extension_id):
                item['rd_source'] = [src_doc['_id'], src_doc['_rev']]
                new_items.append(item)

        def open_schema_attachment(src, attachment, **kw):
            "A function to abstract document storage requirements away..."
            doc_id = src['_id']
            logger.debug("attempting to open attachment %s/%s", doc_id, attachment)
            dm = self.doc_model
            return threads.blockingCallFromThread(reactor,
                        dm.db.openDoc, dm.quote_id(doc_id),
                        attachment=attachment, **kw)

        def open_view(*args, **kw):
            return threads.blockingCallFromThread(reactor,
                        self.doc_model.open_view, *args, **kw)
            
        new_globs = self.ext.func_globals.copy()
        new_globs['emit_schema'] = emit_schema
        new_globs['emit_related_identities'] = emit_related_identities
        new_globs['open_schema_attachment'] = open_schema_attachment
        new_globs['open_view'] = open_view
        func = self.ext
        return types.FunctionType(func.func_code, new_globs,
                                  func.func_name)

    @defer.inlineCallbacks
    def process(self, src_infos, force=False):
        dm = self.doc_model
        cvtr = self.ext
        src_ids = []
        # src_infos might return *lots* - we self-throttle...
        # XXX - but now we only ever do one at a time anyway - both 'identities' and 'conversations' rely on it as
        # one extension may write a record the next invocation must find in its view.
        num_per_batch=1
        for src_id, src_rev in src_infos:
            if not src_id.startswith('rc!'):
                logger.debug("skipping document %r", src_id)
                continue

            try:
                rt, rdkey, ext, schema = src_id.split("!", 4)
                schema = unquote(schema)
            except ValueError:
                logger.warning('skipping malformed ID %r', src_id)
                rt = None
            # 'raindrop content' documents all start with 'rc'
            if rt != 'rc':
                logger.debug("skipping document %r", src_id)
                continue

            if schema != self.ext.source_schema:
                logger.debug("skipping document %r - has schema %r but we want %r",
                             src_id, schema, self.ext.source_schema)
                continue

            # We need to find *all* items previously written by this extension
            # so a 'reprocess' doesn't cause conflicts.
            # Later...
            src_ids.append(src_id)
            if len(src_ids) >= num_per_batch:
                break

        if not src_ids:
            defer.returnValue([])

        result = yield dm.db.listDoc(keys=src_ids, include_docs=True)

        all_new_items = []
        # Now process each item
        rows = result['rows']
        for r in rows:
            # XXX - is this likely in practice?  Can't our queue detect this?
            if 'error' in r:
                # This is usually a simple 'not found' error; it doesn't
                # mean an 'error record'
                logger.debug('skipping document %(key)s - %(error)s', r)
                continue
            if 'deleted' in r['value']:
                logger.debug('skipping document %s - deleted', r['key'])
                continue

            src_doc = r['doc']
            new_items = []
            func = self._get_ext_env(new_items, src_doc)
            logger.debug("calling %r with doc %r, rev %s", self.ext,
                         src_doc['_id'], src_doc['_rev'])

            # Our extensions are 'blocking', so use a thread...
            _ = yield threads.deferToThread(func, src_doc
                        ).addBoth(self._cb_converted_or_not, src_doc, new_items)
            logger.debug("extension %r generated %d new schemas", self.ext, len(new_items))
            all_new_items.extend(new_items)
        defer.returnValue(all_new_items)

    def _cb_converted_or_not(self, result, src_doc, new_items):
        # This is both a callBack and an errBack.  If a converter fails to
        # create a schema item, we can't just fail, or no later messages in the
        # DB will ever get processed!
        # So we write an 'error' schema and discard any it did manage to create
        if isinstance(result, Failure):
            #if isinstance(result.value, twisted.web.error.Error):
            #    # eeek - a socket error connecting to couch; we want to abort
            #    # here rather than try to write an error record with the
            #    # connection failure details (but worse, that record might
            #    # actually be written - we might just be out of sockets...)
            #    result.raiseException()

            logger.warn("Failed to process document %r: %s", src_doc['_id'],
                        result)
            if self.options.get('stop_on_error', False):
                logger.info("--stop-on-error specified - re-throwing error")
                result.raiseException()
            # and make the error record
            edoc = {'error_details': unicode(result)}
            if new_items:
                logger.info("discarding %d items created before the failure",
                            len(new_items))
            new_items = [{'rd_key'
                          'rd_source': [src_doc['_id'], src_doc['_rev']],
                          'schema_id': 'rd/core/error',
                          'items' : edoc,
                         }]
        else:
            if result is not None:
                # an extension returning a value implies they may be
                # confused?
                logger.warn("extension %r returned value %r which is ignored",
                            self.ext, result)


# NOTE: called from a background thread by extensions, so we can block :)
def items_from_related_identities(doc_model, idrels, def_contact_props, ext_id):
    idrels = list(idrels) # likely a generator...
    assert idrels, "don't give me an empty list - just don't emit!!"
    if __debug__: # check the extension is sane...
        for iid, rel in idrels:
            assert isinstance(iid, (tuple, list)) and len(iid)==2,\
                   repr(iid)
            assert rel is None or isinstance(rel, basestring), repr(rel)

    # Take a short-cut to ensure all identity records exist and to
    # handle conflicts from the same identity being created at the
    # same time; ask the doc-model to emit a NULL schema for each
    # one if it doesn't already exist.
    for iid, rel in idrels:
        yield {'rd_key' : ['identity', iid],
               'schema_id' : 'rd/identity/exists',
               'items': None,
               'ext_id' : ext_id,
               }

    # Find contacts associated with any and all of the identities;
    # any identities not associated with a contact will be updated
    # to have a contact (either one we find with for different ID)
    # or a new one we create.
    dl = []
    for iid, rel in idrels:
        # the identity itself.
        rdkey = ['identity', iid]
        dl.append(
            doc_model.open_schemas(rdkey, 'rd/identity/contacts'))
    results = threads.blockingCallFromThread(reactor,
                    defer.DeferredList, dl)
    assert len(results)==len(idrels), (results, idrels)

    # check for errors...
    for (ok, result) in results:
        if not ok:
            result.raiseException()
    # scan the list looking for an existing contact for any of the ids.
    for schemas in [r[1] for r in results]:
        if schemas:
            contacts = schemas[0].get('contacts', [])
            if contacts:
                contact_id = contacts[0][0]
                logger.debug("Found existing contact %r", contact_id)
                break
    else: # for loop not broken...
        # allocate a new contact-id; we can't use a 'natural key' for a
        # contact....
        contact_id = str(uuid.uuid4())
        # just choose any of the ID's details (although first is likely
        # to be 'best')
        cdoc = {}
        # We expect a 'name' field at least...
        assert 'name' in def_contact_props, def_contact_props
        cdoc.update(def_contact_props)
        logger.debug("Will create new contact %r", contact_id)
        yield {'rd_key' : ['contact', contact_id],
               'schema_id' : 'rd/contact',
               # ext_id might be wrong here - maybe it should be 'us'?
               'ext_id' : ext_id,
               'items' : cdoc,
        }

    # We know the contact to use and the list of identities
    # which we know exist. We've also got the 'contacts' schemas for
    # those identities - which may or may not exist, and even if they do,
    # may not refer to this contact.  So fix all that...
    for (_, schemas), (iid, rel) in zip(results, idrels):
        # identity ID is a tuple/list of exactly 2 elts.
        assert isinstance(iid, (tuple, list)) and len(iid)==2, repr(iid)
        new_rel = (contact_id, rel)
        doc_id = doc_rev = None # incase we are updating a doc...
        if not schemas:
            # No 'contacts' schema exists for this identity
            new_rel_fields = {'contacts': [new_rel]}
        else:
            # At least one 'contacts' schema exists - let's hope ours
            # is the only one :)
            assert len(schemas)==1, schemas # but what if it's not? :)
            sch = schemas[0]
            existing = sch.get('contacts', [])
            logger.debug("looking for %r in %s", contact_id, existing)
            for cid, existing_rel in existing:
                if cid == contact_id:
                    new_rel_fields = None
                    break # yay
            else:
                # not found - we need to update this doc
                new_rel_fields = sch.copy()
                sch['contacts'] = existing + [new_rel]
                logger.debug("new relationship (update) from %r -> %r",
                             iid, contact_id)
                # and note the fields which allows us to update...
                doc_id = sch['_id']
                doc_rev = sch['_rev']
        if new_rel_fields is not None:
            yield {'rd_key' : ['identity', iid],
                   'schema_id' : 'rd/identity/contacts',
                   'ext_id' : ext_id,
                   'items' : new_rel_fields,
            }


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
