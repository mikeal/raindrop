""" This is the raindrop pipeline; it moves messages from their most raw
form to their most useful form.
"""
from twisted.internet import defer, threads, task
from twisted.python.failure import Failure
from twisted.internet import reactor

import extenv

import logging

logger = logging.getLogger(__name__)

def split_rc_docid(doc_id):
    if not doc_id.startswith('rc!'):
        raise ValueError("Not a raindrop content docid")

    rt, rdkey, ext, schema = doc_id.split("!", 4)
    return rt, rdkey, ext, schema

class Extension(object):
    def __init__(self, id, doc, handler, globs):
        self.id = id
        self.doc = doc
        # make the source schemas more convenient to use...
        # XXX - source_schema is deprecated
        if 'source_schemas' in doc:
            self.source_schemas = doc['source_schemas']
        else:
            self.source_schemas = [doc['source_schema']]
        self.handler = handler
        self.globs = globs
        self.running = False # for reentrancy testing...
        # Is this extension smart enough to update what it did in the past?
        self.smart_updater = doc.get('smart_updater', False)

@defer.inlineCallbacks
def load_extensions(doc_model):
    extensions = {}
    # now try the DB - load everything with a rd.ext.workqueue schema
    key = ["rd.core.content","schema_id", "rd.ext.workqueue"]
    ret = yield doc_model.open_view(key=key, reduce=False, include_docs=True)
    for row in ret['rows']:
        doc = row['doc']
        ext_id = doc['rd_key'][1]
        src = doc['code']
        ct = doc.get('content_type')
        if ct != "application/x-python":
            logger.error("Content-type of %r is not supported", ct)
            continue
        try:
            co = compile(src, "<%s>" % ext_id, "exec")
        except SyntaxError, exc:
            logger.error("Failed to compile %r: %s", ext_id, exc)
            continue
        globs = {}
        try:
            exec co in globs
        except:
            logger.exception("Failed to execute %r", ext_id)
            continue
        handler = globs.get('handler')
        if handler is None or not callable(handler):
            logger.error("source-code in extension %r doesn't have a 'handler' function",
                         ext_id)
            continue
        assert ext_id not in extensions, ext_id # another with this ID??
        extensions[ext_id] = Extension(ext_id, doc, handler, globs)
    defer.returnValue(extensions)


class Pipeline(object):
    """A manager for running items through the pipeline using various
    different strategies.
    """
    def __init__(self, doc_model, options):
        self.doc_model = doc_model
        self.options = options
        self.runner = None
        self.incoming_processor = None

    @defer.inlineCallbacks
    def initialize(self):
        if not self.options.no_process:
            procs = yield self.get_ext_processors()
            assert self.incoming_processor is None # already initialized?
            self.incoming_processor = IncomingItemProcessor(self.doc_model,
                                                            procs)
            _ = yield self.incoming_processor.initialize()

    @defer.inlineCallbacks
    def finalize(self):
        if self.incoming_processor is not None:
            _ = yield self.incoming_processor.finalize()

    @defer.inlineCallbacks
    def provide_schema_items(self, items):
        """The main entry-point for 'providers' - the new items are written,
        then we block until the 'incoming processor' has got to the end (ie,
        until all those new items are fully processed)
        """
        _ = yield self.doc_model.create_schema_items(items)
        if self.incoming_processor is not None:
            _ = yield self.incoming_processor.ensure_done()

    @defer.inlineCallbacks
    def get_extensions(self, spec_exts=None):
        if spec_exts is None:
            spec_exts = self.options.exts
        ret = set()
        ret_names = set()
        extensions = yield load_extensions(self.doc_model)
        for ext_id, ext in extensions.items():
            if spec_exts is None:
                ret.add(ext)
            else:
                if ext_id in spec_exts:
                    ret.add(ext)
                    ret_names.add(ext_id)
        if __debug__ and spec_exts:
            missing = set(spec_exts) - set(ret_names)
            if missing:
                logger.error("The following extensions are unknown: %s",
                             missing)
        defer.returnValue(ret)

    @defer.inlineCallbacks
    def get_ext_processors(self, spec_exts=None):
        """Get all the work-queues we know about"""
        ret = []
        for ext in (yield self.get_extensions(spec_exts)):
            proc = ExtensionProcessor(self.doc_model, ext, self.options)
            ret.append(proc)
        defer.returnValue(ret)

    @defer.inlineCallbacks
    def start_backlog(self):
        assert self.runner is None, "already doing a backlog process"
        procs = yield self.get_ext_processors()
        self.runner = StatefulQueueManager(self.doc_model, procs,
                                           self.incoming_processor,
                                           self.options)
        try:
            _ = yield self.runner.run()
        finally:
            self.runner = None
        # count the number of errors - mainly for the test suite.
        nerr = sum([p.num_errors for p in procs])
        # if an incoming processor is running, we also need to wait for that,
        # as it is what is doing the items created by the queue
        if self.incoming_processor is not None:
            logger.info("backlog processing done - waiting for incoming to finish")
            _ = yield self.incoming_processor.ensure_done()
            nerr += sum([p.num_errors for p in self.incoming_processor.processors])
        defer.returnValue(nerr)

    @defer.inlineCallbacks
    def unprocess(self):
        # Just nuke all items that have a 'rd_source' specified...
        # XXX - should do this in a loop with a limit to avoid chewing
        # all mem...
        if self.options.exts:
            exts = yield self.get_extensions()
            keys = [['rd.core.content', 'ext_id', e.id] for e in exts]
            result = yield self.doc_model.open_view(
                                keys=keys, reduce=False)
        else:
            result = yield self.doc_model.open_view(
                                # skip NULL rows.
                                startkey=['rd.core.content', 'source', ""],
                                endkey=['rd.core.content', 'source', {}],
                                reduce=False)

        to_del = [{'_id': row['id'], '_rev': row['value']['_rev']} for row in result['rows']]
        logger.info('deleting %d messages', len(to_del))
        _ = yield self.doc_model.delete_documents(to_del)

        # and rebuild our views
        logger.info("rebuilding all views...")
        _ = yield self.doc_model._update_important_views()

    @defer.inlineCallbacks
    def _reprocess_items(self, item_gen):
        ps = yield self.get_ext_processors()
        for p in ps:
            p.options.force = True

        chugger = ExtensionQueueRunner(self.doc_model, ps)
        num = yield chugger.process_queue(item_gen)
        logger.info("reprocess made %d new docs", num)

    @defer.inlineCallbacks
    def reprocess(self):
        # We can't just reset all work-queues as there will be a race
        # (ie, one queue will be deleting a doc while it is being
        # processed by another.)
        # So by default this is like 'unprocess' - all docs without a rd_source are
        # reprocessed as if they were touched.  This should trigger the
        # first wave of extensions to re-run, which will trigger the next
        # etc.
        # However, if extensions are named, only those are reprocessed
        # XXX - should do this in a loop with a limit to avoid chewing
        # all mem...
        dm = self.doc_model
        def gen_em(this_result):
            to_proc = [(row['id'], row['value']['_rev'])
                       for row in this_result['rows']]
            for i, (id, rev) in enumerate(to_proc):
                if (i+1) % 500 == 0:
                    logger.info("processed %d documents...", i)
                yield id, rev, None, None

        if not self.options.exts and not self.options.keys:
            # fetch all items with a null 'rd_source'
            result = yield dm.open_view(
                            key=['rd.core.content', 'source', None],
                            reduce=False)
            logger.info("reprocess found %d source documents",
                        len(result['rows']))
            _ = yield self._reprocess_items(gen_em(result))
        elif not self.options.exts and self.options.keys:
            # no extensions, but a key - find the 'source' for this key
            # then walk it though all extensions...
            def gen_sources(rows):
                for row in rows:
                    val = row['value']
                    yield row['id'], val['_rev'], None, None

            keys = [['rd.core.content', 'key-source', [k, None]]
                    for k in self.options.keys]
            result = yield dm.open_view(keys=keys, reduce=False)
                
            ps = yield self.get_ext_processors()
            for p in qs:
                p.options.force = True
            chugger = ExtensionQueueRunner(self.doc_model, ps)
            num = yield chugger.process_queue(gen_sources(result['rows']))
            logger.info("reprocess made %d new docs", num)
        else:
            # do each specified extension one at a time to avoid the races
            # if extensions depend on each other...
            for ext in (yield self.get_extensions()):
                # fetch all items this extension says it depends on
                if self.options.keys:
                    # But only for the specified rd_keys
                    keys = []
                    for k in self.options.keys:
                        for sch_id in ext.source_schemas:
                            keys.append(['rd.core.content', 'key-schema_id', [k, sch_id]])
                else:
                    # all rd_keys...
                    keys=[['rd.core.content', 'schema_id', sch_id] for sch_id in ext.source_schemas]
                result = yield dm.open_view(keys=keys,
                                            reduce=False)
                logger.info("reprocessing %s - %d docs", ext.id,
                            len(result['rows']))
                _ = yield self._reprocess_items(gen_em(result))


    @defer.inlineCallbacks
    def start_retry_errors(self):
        """Attempt to re-process all messages for which our previous
        attempt generated an error.
        """
        # This is easy - just look for rd.core.error records and re-process
        # them - the rd.core.error record will be auto-deleted as we
        # re-process
        # It does have the bad side-effect of re-running all extensions which
        # also ran against the source of the error - that can be fixed, but
        # later...
        key = ["rd.core.content", "schema_id", "rd.core.error"]
        result = yield self.doc_model.open_view(key=key, reduce=False,
                                                include_docs=True)
        logger.info("found %d error records", len(result['rows']))
        def gen_em():
            for row in result['rows']:
                src_id, src_rev = row['doc']['rd_source']
                yield src_id, src_rev, None, None

        _ = yield self._reprocess_items(gen_em())

    @defer.inlineCallbacks
    def process_until(self, src_infos, targets):
        """Process all the listed document 'sources' until a schema listed in
        targets is found.  Returns the (id, rev, schema_id) of the first
        matching schema, or (None, None, None) if nothing happened.
        """
        # push it through the pipeline.
        if self.incoming_processor is not None:
            _ = yield self.incoming_processor.ensure_done()
        ps = yield self.get_ext_processors()
        doc_model = self.doc_model
        runner = ExtensionQueueRunner(doc_model, ps)

        num = yield runner.process_queue(src_infos)
        logger.debug("process of %r made %d new docs", src_infos, num)
        # Now find all items generated by these items..
        keys = []
        for (did, drev, schema_id, key) in src_infos:
            keys.append(["rd.core.content", "source", did])
        
        result = yield doc_model.open_view(keys=keys, reduce=False)
        new_srcs = []
        rows = result['rows']
        for row in rows:
            rid = row['id']
            rrev = row['value']['_rev']
            rsch = row['value']['rd_schema_id']
            # If one of the items is in our targets, then we can stop.
            if rsch in targets:
                defer.returnValue((rid, rrev, rsch))
            new_srcs.append((rid, rrev, rsch, None))
      
        # nothing generated - eek.
        if not new_srcs:
            defer.returnValue((None, None, None))
      
        # not found directly in this set - but maybe the processing of these docs
        # will turn one up - recursively process all these items.
        ret = yield self.process_until(new_srcs, targets)
        defer.returnValue(ret)

class IncomingItemProcessor(object):
    """Starts a message pipeline at the 'current' sequence number - then all
    items which are created after that will be processed.  Includes a helper
    function which waits until the end of the queue is reached, which can be
    useful for 'throttling' the rate of incoming messages - eg, provide a
    batch, wait until complete, write next batch, etc.

    Note that we do NOT use a 'continuous' _changes feed as that would make
    it very hard to determine when we are at the end.  We use a _continuous
    feed to tell us *when* something changed, but once told, we open a new
    _changes connection and process it until it stops giving us rows.
    """
    def __init__(self, doc_model, processors):
        self.processors = processors
        # build a map of extensions keyed by src schema.
        self.doc_model = doc_model
        self.def_process_done = None
        self.total = 0

    @defer.inlineCallbacks
    def initialize(self):
        db = self.doc_model.db
        info = yield db.infoDB()
        self.runner = ExtensionQueueRunner(self.doc_model, self.processors)
        self.start_seq = info['update_seq']
        self.runner.current_seq = self.start_seq
        self.feed_stopper = yield db.feedContinuousChanges(self.feed_sink,
                                                           since=self.start_seq)

    @defer.inlineCallbacks
    def finalize(self):
        _ = yield self.ensure_done()
        if self.feed_stopper is not None:
            self.feed_stopper()
            self.feed_stopper = None

    def feed_sink(self, factory, changes):
        # we don't look at the changes, just notice there are some.
        # our feed should be stopped if we are currently working.
        assert self.def_process_done is None
        # and ask the reactor to do its thing - which will immediately
        # close this feed...
        self.ensure_done()

    @defer.inlineCallbacks
    def ensure_done(self):
        if self.def_process_done is not None:
            _ = yield self.def_process_done
            return
        # do it -  stop the _changes feed while we process...
        self.feed_stopper()
        self.feed_stopper = None
        # process the feed.
        doc_model = self.doc_model
        runner = self.runner
        self.def_process_done = defer.Deferred()
        try:
            logger.debug("incoming queue starting with sequence ID %d",
                         runner.current_seq)
            while True:
                result = yield doc_model.db.listDocsBySeq(limit=2000,
                                            startkey=runner.current_seq)
                rows = result['rows']
                logger.debug('incoming queue has %d items to check.', len(rows))
                if not rows:
                    break

                src_gen = _gen_view_sources(rows)
                _ = yield runner.process_queue(src_gen)
            # start listening for new changes
            assert self.feed_stopper is None
            self.feed_stopper = yield doc_model.db.feedContinuousChanges(
                                        self.feed_sink,
                                        since=self.runner.current_seq)
        finally:
            # reset our deferred before making the callback else we might
            # think we are still inside the loop.
            def_done = self.def_process_done
            self.def_process_done = None
            def_done.callback(None)

# Used by the 'process' operation - runs all of the 'stateful work queues';
# when a single queue finishes, we restart any other queues already finished
# so they can then work on the documents since created by the running queues.
# Once all queues report they are at the end, we stop.
class StatefulQueueManager(object):
    def __init__(self, dm, processors, incoming_processor, options):
        assert processors, "nothing to do?"
        self.doc_model = dm
        # If we have an incoming processor running, we consider the end of
        # the queue exactly where that started.
        if incoming_processor is None:
            last_seq = None
        else:
            last_seq = incoming_processor.start_seq - 1
        # XXX - we limit ourselves to last_seq - should we catch up, we
        # need to be able to update our state docs to reflect that fact...
        self.incoming_processor = incoming_processor
        self.queues = [StatefulExtensionQueueRunner(dm, [p], last_seq)
                       for p in processors]
        self.options = options
        self.status_msg_last = None

    def _start_q(self, q, def_done, do_incoming=False):
        assert not q.running, q
        q.running = True

        # in the interests of not letting the backlog processing cause
        # too much of a backlog for the 'incoming' processor, we wait
        # until the incoming queue is up-to-date before restarting.
        def doinc():
            if do_incoming and self.incoming_processor:
                return self.incoming_processor.ensure_done()
        def dostart(result):
            q.run_queue(
                    ).addBoth(self._q_done, q, def_done
                    )
        defer.maybeDeferred(doinc
            ).addCallback(dostart)

    def _q_status(self):
        lowest = (0xFFFFFFFFFFFF, None)
        highest = (0, None)
        nfailed = 0
        for qlook in self.queues:
            if qlook.failure:
                nfailed += 1
                continue
            this = qlook.current_seq, qlook.get_queue_name()
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

    def _q_done(self, result, q, def_done):
        q.running = False
        failed = isinstance(result, Failure)
        if failed:
            logger.error("queue %r failed: %s", q.get_queue_name(), result)
            q.failure = result
        else:
            logger.debug('queue %r reports it is complete: %s',
                         q.get_queue_name(), q.current_seq)
            assert result in (True, False), repr(result)
        # First check for any other queues which are no longer running
        # but have a sequence less than ours.
        still_going = False
        nerrors = len([tq for tq in self.queues if tq.failure])
        stop_all = nerrors and self.options.stop_on_error
        for qlook in self.queues:
            if qlook.running:
                still_going = True
            # only restart queues if stop_on_error isn't specified.
            if stop_all:
                qlook.stopping = True
                continue
            if qlook is not q and not qlook.running and not qlook.failure and \
               qlook.current_seq < q.current_seq:
                still_going = True
                self._start_q(qlook, def_done, True)

        if not stop_all and not failed and not result:
            # The queue which called us back hasn't actually finished yet...
            still_going = True
            self._start_q(q, def_done, True)

        if not still_going:
            # All done.
            logger.info("All queues are finished!")
            def_done.callback(None)
        # else wait for one of the queues to finish and call us again...

    @defer.inlineCallbacks
    def run(self):
        dm = self.doc_model
        lc = task.LoopingCall(self._q_status)
        lc.start(10, False)
        def_done = defer.Deferred()
        for q in self.queues:
            self._start_q(q, def_done)
        _ = yield def_done
        lc.stop()
        # update the views now...
        _ = yield self.doc_model._update_important_views()

def _gen_view_sources(rows):
    mutter = lambda *args: None # might be useful one day for debugging...
    # Find the next row this queue can use.
    while rows:
        row = rows.pop(0)
        if 'error' in row:
            # This is usually a simple 'not found' error; it doesn't
            # mean an 'error record'
            mutter('skipping document %(key)s - %(error)s', row)
            continue
        if 'deleted' in row['value']:
            mutter('skipping document %s - deleted', row['key'])
            continue
        src_id = row['id']
        src_rev = row['value']['rev']

        yield src_id, src_rev, None, row['key']


class ExtensionQueueRunner(object):
    """A queue sequence runner - designed to run over an iterator
    of couch documents and run any of the extension objects which process the
    documents.
    """
    def __init__(self, doc_model, processors):
        self.doc_model = doc_model
        self.processors = processors
        self.current_seq = None

    def get_queue_name(self):
        return "default"

    @defer.inlineCallbacks
    def process_queue(self, src_gen):
        """processes a number of items in a work-queue.
        """
        doc_model = self.doc_model
        num_created = 0

        items = []
        # process until we run out.
        for src_id, src_rev, schema_id, seq in src_gen:
            self.current_seq = seq
            if schema_id is None:
                try:
                    _, _, _, schema_id = split_rc_docid(src_id)
                except ValueError, why:
                    logger.log(1, 'skipping document %r: %s', src_id, why)
                    continue

            for proc in self.processors:
                if not proc.can_process_schema(schema_id):
                    continue

                got, must_save = yield proc.process(src_id, src_rev)
                if not got:
                    continue
                num_created += len(got)
                items.extend(got)
                if must_save or len(items)>20:
                    _ = yield doc_model.create_schema_items(items)
                    items = []
        if items:
            _ = yield doc_model.create_schema_items(items)

        logger.debug("finished processing %r to %r - %d processed",
                     self.get_queue_name(), self.current_seq, num_created)
        defer.returnValue(num_created)


class StatefulExtensionQueueRunner(ExtensionQueueRunner):
    """Runs extensions, saving the current position (ie, the state) back
    in the database.  When restarted, reloads the state and continues from
    the previous position.

    As each extension generally gets its own queue and state, this is
    generally called with a single processor.
    """
    def __init__(self, doc_model, processors, last_seq):
        super(StatefulExtensionQueueRunner, self).__init__(doc_model, processors)
        self.running = None
        self.stopping = False
        self.failure = None
        self._cached_queue_state = None
        self.last_seq = last_seq

    def get_queue_name(self):
        assert len(self.processors)==1
        return self.processors[0].ext.id

    @defer.inlineCallbacks
    def run_queue(self, num_to_process=2000):
        state_info = yield self.load_queue_state()
        start_seq = state_info['items']['seq']
        if self.last_seq is not None and self.current_seq > self.last_seq:
            # queue is done (at the specified max)
            defer.returnValue(True)

        src_gen = yield self._get_queue_gen(start_seq, num_to_process)
        if src_gen is None:
            # queue is done (at the end)
            defer.returnValue(True)

        num_created = yield self.process_queue(src_gen)

        _ = yield self.save_queue_state(state_info, num_created)
        defer.returnValue(False)

    @defer.inlineCallbacks
    def load_queue_state(self):
        if self._cached_queue_state is not None:
            defer.returnValue(self._cached_queue_state)

        # first open our 'state' schema
        doc_model = self.doc_model
        ext = self.processors[0].ext
        rd_key = ['ext', ext.id] # same rd used to save the extension source etc
        key = ['rd.core.content', 'key-schema_id', [rd_key, 'rd.core.workqueue-state']]
        result = yield doc_model.open_view(key=key, reduce=False, include_docs=True)
        rows = result['rows']
        assert len(rows) in (0,1), result
        state_info = {'rd_key' : rd_key,
                      # We set rd_source to the _id/_rev of the extension doc
                      # itself - that way 'unprocess' etc all see these as
                      # 'derived'...
                      'rd_source': [ext.doc['_id'], ext.doc['_rev']],
                      # and similarly, say it was created by the extension itself.
                      'ext_id': ext.id,
                      'schema_id': 'rd.core.workqueue-state',
                      }
        if len(rows) and 'doc' in rows[0]:
            doc = rows[0]['doc']
            state_info['_id'] = doc['_id']
            state_info['_rev'] = doc['_rev']
            state_info['items'] = {'seq' : doc.get('seq', 0)}
        else:
            state_info['items'] = {'seq': 0}
        state_info['last_saved_seq'] = state_info['items']['seq']
        defer.returnValue(state_info)

    @defer.inlineCallbacks
    def save_queue_state(self, state_info, num_created):
        seq = state_info['items']['seq'] = self.current_seq
        # We can chew 1000 'nothing to do' docs quickly next time...
        last_saved = state_info['last_saved_seq']
        if num_created or (seq-last_saved) > 1000:
            logger.debug("flushing state doc at end of run...")
            try:
                del state_info['last_saved_seq']
            except KeyError:
                pass

            docs = yield self.doc_model.create_schema_items([state_info])
            assert len(docs)==1, docs # only asked to save 1
            state_info['_rev'] = docs[0]['rev']
            state_info['last_saved_seq'] = seq
            self._cached_queue_state = None
        else:
            self._cached_queue_state = state_info
            logger.debug("no need to flush state doc")


    @defer.inlineCallbacks
    def _get_queue_gen(self, seq, num_to_process):
        doc_model = self.doc_model
        qname = self.get_queue_name()
        logger.debug("Work queue %r starting with sequence ID %d",
                     qname, seq)

        logger.debug('opening by_seq view for work queue...')

        result = yield doc_model.db.listDocsBySeq(limit=num_to_process,
                                               startkey=seq)
        rows = result['rows']
        logger.debug('work queue %r has %d items to check.', qname, len(rows))
        if not rows:
            defer.returnValue(None)
        defer.returnValue(self._gen_queue_sources(rows))


    def _gen_queue_sources(self, rows):
        for result in _gen_view_sources(rows):
            if self.stopping:
                return
            if self.last_seq is not None and self.current_seq > self.last_seq:
                return
            yield result


class ExtensionProcessor(object):
    """A class which manages the execution of a single extension over
    documents holding raindrop schemas"""
    def __init__(self, doc_model, ext, options):
        self.doc_model = doc_model
        self.ext = ext
        self.options = options
        self.num_errors = 0

    def _get_ext_env(self, context, src_doc):
        # Each ext has a single 'globals' which is updated before it is run;
        # therefore it is critical we don't accidently run 2 extensions at
        # once.
        if self.ext.running:
            raise RuntimeError, "%r is already running" % self.ext.id
        self.ext.running = True
        new_globs = extenv.get_ext_env(self.doc_model, context, src_doc,
                                       self.ext)
        self.ext.globs.update(new_globs)
        return self.ext.handler

    def _release_ext_env(self):
        assert self.ext.running
        self.ext.running = False

    def can_process_schema(self, schema_id):
        return schema_id in self.ext.source_schemas

    @defer.inlineCallbacks
    def process(self, src_id, src_rev):
        dm = self.doc_model
        ext_id = self.ext.id
        force = self.options.force

        # some extensions declare themselves as 'smart updaters' - they
        # are more efficiently able to deal with updating the records it
        # write last time than our brute-force approach.
        if not self.ext.smart_updater:
            # We need to find *all* items previously written by this extension
            # so a 'reprocess' doesn't cause conflicts.
            key = ['rd.core.content', 'ext_id-source', [ext_id, src_id]]
            result = yield dm.open_view(key=key, reduce=False)
            rows = result['rows']
            if rows:
                dirty = False
                for row in rows:
                    if 'error' in row or row['value']['rd_source'] != [src_id, src_rev]:
                        dirty = True
                        break
            else:
                dirty = True
            if not dirty and not force:
                logger.debug("document %r is up-to-date", src_id)
                defer.returnValue((None, None))

            to_del = []
            for row in rows:
                if 'error' not in row:
                    to_del.append({'_id' : row['id'],
                                   '_rev' : row['value']['_rev']})
            logger.debug("deleting %d docs previously created from %r by %r",
                         len(to_del), src_id, ext_id)
            if to_del:
                _ = yield dm.delete_documents(to_del)

        # Get the source-doc and process it.
        src_doc = (yield dm.open_documents_by_id([src_id]))[0]
        # Although we got this doc id directly from the _all_docs_by_seq view,
        # it is quite possible that the doc was deleted since we read that
        # view.  It could even have been updated - so if its not the exact
        # revision we need we just skip it - it will reappear later...
        if src_doc is None or src_doc['_rev'] != src_rev:
            logger.debug("skipping document - it's changed since we read the queue")
            defer.returnValue((None, None))

        # our caller should have filtered the list to only the schemas
        # our extensions cares about.
        assert self.can_process_schema(src_doc['rd_schema_id']), (src_doc, ext_id)
        # Now process it
        new_items = []
        context = {'new_items': new_items}
        logger.debug("calling %r with doc %r, rev %s", ext_id,
                     src_doc['_id'], src_doc['_rev'])

        # Our extensions are 'blocking', so use a thread...
        try:
            func = self._get_ext_env(context, src_doc)
            try:
                result = yield threads.deferToThread(func, src_doc)
            finally:
                self._release_ext_env()
            if result is not None:
                # an extension returning a value implies they may be
                # confused?
                logger.warn("extension %r returned value %r which is ignored",
                            self.ext, result)
        except:
            # handle_ext_failure may put error records into new_items.
            self._handle_ext_failure(Failure(), src_doc, new_items)

        logger.debug("extension %r generated %d new schemas", ext_id, len(new_items))
        # We try hard to batch writes; we earlier just checked to see if
        # only the same key was written, but that still failed.  Last
        # ditch attempt is to see if the extension made a query - if it
        # did, then it will probably query next time, and will probably
        # expect to see what it wrote last time
        must_save = 'did_query' in context
        if not must_save:
            # must also save now if they wrote a key for another item.
            for i in new_items:
                logger.debug('new schema item %(schema_id)r for key %(rd_key)r', i)
                if i['rd_key'] != src_doc['rd_key']:
                    must_save = True
                    break
        defer.returnValue((new_items, must_save))

    def _handle_ext_failure(self, result, src_doc, new_items):
        # If a converter fails to
        # create a schema item, we can't just fail, or no later messages in the
        # DB will ever get processed!
        # So we write an 'error' schema and discard any it did manage to create
        assert isinstance(result, Failure)
        #if isinstance(result.value, twisted.web.error.Error):
        #    # eeek - a socket error connecting to couch; we want to abort
        #    # here rather than try to write an error record with the
        #    # connection failure details (but worse, that record might
        #    # actually be written - we might just be out of sockets...)
        #    result.raiseException()
        # XXX - later we should use the extension's log, but for now
        # use out log but include the extension name.
        logger.warn("Extension %r failed to process document %r: %s",
                    self.ext.id, src_doc['_id'], result.getTraceback())
        self.num_errors += 1
        if self.options.stop_on_error:
            logger.info("--stop-on-error specified - stopping queue")
            self.failure = result
            self.stopping = True
            # Throw away any records emitted by *this* failure.
            new_items[:] = []
            return

        # and make the error record
        edoc = {'error_details': unicode(result)}
        if new_items:
            logger.info("discarding %d items created before the failure",
                        len(new_items))
        new_items[:] = [{'rd_key' : src_doc['rd_key'],
                         'rd_source': [src_doc['_id'], src_doc['_rev']],
                         'schema_id': 'rd.core.error',
                         'ext_id' : self.ext.id,
                         'items' : edoc,
                         }]
