# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is Raindrop.
#
# The Initial Developer of the Original Code is
# Mozilla Messaging, Inc..
# Portions created by the Initial Developer are Copyright (C) 2009
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#

""" This is the raindrop pipeline; it moves messages from their most raw
form to their most useful form.
"""
import time

from twisted.internet import defer, threads, task
from twisted.python.failure import Failure
from twisted.internet import reactor

try:
    import json
except ImportError:
    import simplejson as json
import base64
    

import extenv

import logging

logger = logging.getLogger(__name__)

def split_rc_docid(doc_id):
    if not doc_id.startswith('rc!'):
        raise ValueError("Not a raindrop content docid")
    rt, rdkey, schema = doc_id.split("!", 3)
    return rt, rdkey, schema

def decode_rdkey(encoded_key):
    prefix, b64part = encoded_key.split(".", 1)
    json_str = base64.decodestring(b64part)
    return [prefix, json.loads(json_str)]

class Extension(object):
    SMART = "smart" # a "smart" extension - handles dependencies etc itself.
    # a 'provider' of schema items; a schema is "complete" once a single
    # provider has run.
    PROVIDER = "provider"
    # An 'extender' - extends a schema written by a different extension.  If
    # only 'extenders' have provided schema fields, the schema is not yet
    # "complete", so extensions which depend on it aren't run and the field
    # values don't appear in the megaview.
    EXTENDER = "extender"
    def __init__(self, id, doc, handler, globs):
        self.id = id
        self.doc = doc
        # make the source schemas more convenient to use...
        # XXX - source_schema is deprecated
        if 'source_schemas' in doc:
            self.source_schemas = doc['source_schemas']
        else:
            self.source_schemas = [doc['source_schema']]
        self.confidence = doc.get('confidence')
        self.handler = handler
        self.globs = globs
        self.running = False # for reentrancy testing...
        # the category - for now we have a default, but later should not!
        self.category = doc.get('category', self.PROVIDER)

@defer.inlineCallbacks
def load_extensions(doc_model):
    extensions = {}
    # now try the DB - load everything with a rd.ext.workqueue schema
    key = ["rd.core.content","schema_id", "rd.ext.workqueue"]
    ret = yield doc_model.open_view(key=key, reduce=False, include_docs=True)
    assert ret['rows'], "no extensions!"
    for row in ret['rows']:
        doc = row['doc']
        ext_id = doc['rd_key'][1]
        # some platforms get upset about \r\n, none get upset with \n.
        src = doc['code'].replace("\r\n", "\n")
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
        except Exception, exc:
            logger.error("Failed to initialize extension %r: %s", ext_id, exc)
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
        self.current_extension_confidences = {}

    @defer.inlineCallbacks
    def initialize(self):
        if not self.options.no_process:
            procs = yield self.get_ext_processors()
            if not procs:
                raise RuntimeError("no processors could be found")
            assert self.incoming_processor is None # already initialized?
            self.incoming_processor = IncomingItemProcessor(self.doc_model)
            for proc in procs:
                ext = proc.ext
                self.incoming_processor.add_processor(proc, ext.source_schemas,
                                                      ext.id)
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
        for ext in ret:
            if ext.confidence is not None:
                self.current_extension_confidences[ext.id] = ext.confidence
        self.doc_model.set_extension_confidences(
                                        self.current_extension_confidences)
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
        exts = yield self.get_extensions()
        pqrs = [get_pqr_for_extension(self.doc_model, ext, self.options)
                for ext in exts]
        self.runner = StatefulQueueManager(self.doc_model, pqrs,
                                           self.incoming_processor,
                                           self.options)
        try:
            _ = yield self.runner.run()
        finally:
            self.runner = None
        # count the number of errors - mainly for the test suite.
        nerr = sum([pqr.processor.num_errors for pqr in pqrs])
        # if an incoming processor is running, we also need to wait for that,
        # as it is what is doing the items created by the queue
        if self.incoming_processor is not None:
            logger.info("backlog processing done - waiting for incoming to finish")
            _ = yield self.incoming_processor.ensure_done()
            nerr += sum([getattr(r.processor, "num_errors", 0) for r in self.incoming_processor.runners])
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
            to_up = [{'_id': row['id'],
                      '_rev': row['value']['_rev'],
                      'rd_key': row['value']['rd_key'],
                      'rd_schema_id': row['value']['rd_schema_id'],
                      'rd_ext_id': row['key'][-1],
                      '_deleted': True
                      } for row in result['rows']]
        else:
            result = yield self.doc_model.open_view(
                                # skip NULL rows.
                                startkey=['rd.core.content', 'source', ""],
                                endkey=['rd.core.content', 'source', {}],
                                reduce=False)

            to_up = [{'_id': row['id'],
                      '_rev': row['value']['_rev'],
                      'rd_key': row['value']['rd_key'],
                      'rd_schema_id': row['value']['rd_schema_id'],
                      'rd_ext_id': row['value']['rd_ext_id'],
                      '_deleted': True
                      } for row in result['rows']]
        logger.info('deleting %d schemas', len(to_up))
        _ = yield self.doc_model.create_schema_items(to_up)

        # and rebuild our views
        logger.info("rebuilding all views...")
        _ = yield self.doc_model._update_important_views()

    @defer.inlineCallbacks
    def _reprocess_items(self, item_gen_factory, *factory_args):
        self.options.force = True # evil!
        runners = [get_pqr_for_extension(self.doc_model, ext, self.options)
                   for ext in (yield self.get_extensions())]
        result = yield defer.DeferredList(
                    [r.process_queue(item_gen_factory(*factory_args))
                     for r in runners])
        num = sum([num for ok, num in result if ok])
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
        dm = self.doc_model
        def gen_em(this_result):
            to_proc = ((row['id'], row['value']['_rev'])
                       for row in this_result['rows'])
            for id, rev in to_proc:
                yield id, rev, None, None

        if not self.options.exts and not self.options.keys:
            # fetch all items with a null 'rd_source'
            result = yield dm.open_view(
                            key=['rd.core.content', 'source', None],
                            reduce=False)
            logger.info("reprocess found %d source documents",
                        len(result['rows']))
            _ = yield self._reprocess_items(gen_em, result)
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
            chugger = ProcessingQueueRunner(self.doc_model, ps)
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
                _ = yield self._reprocess_items(gen_em, result)


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
                for ext_info in row['doc']['rd_schema_items'].itervalues():
                    src_id, src_rev = ext_info['rd_source']
                    yield src_id, src_rev, None, None

        _ = yield self._reprocess_items(gen_em)

    @defer.inlineCallbacks
    def process_until(self, src_infos, targets):
        """Process all the listed document 'sources' until a schema listed in
        targets is found.  Returns the (id, rev, schema_id) of the first
        matching schema, or (None, None, None) if nothing happened.
        """
        # push it through the pipeline.
        if self.incoming_processor is not None:
            _ = yield self.incoming_processor.ensure_done()
            
        ps = [get_pqr_for_extension(self.doc_model, ext, self.options)
              for ext in (yield self.get_extensions())]
        doc_model = self.doc_model
        # and let them all run over the sources.
        result = yield defer.DeferredList([p.process_queue(src_infos)
                                           for p in ps])
        num = sum([num for (ok, num) in result if ok])
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


class DocsBySeqIteratorFactory(object):
    """Reponsible for creating iterators based on a _changes view"""
    def __init__(self):
        self.stopping = False
        # XXX - current_seq is inaccurate if you make multiple iterators!
        self.current_seq = None
        self.rows = None

    @defer.inlineCallbacks
    def initialize(self, doc_model, start_seq, limit=2000, stop_seq=None):
        if stop_seq is not None and start_seq >= stop_seq:
            defer.returnValue(False)

        assert stop_seq is None or stop_seq > start_seq
        self.stop_seq = stop_seq
        self.stopping = False
        result = yield doc_model.db.listDocsBySeq(limit=limit,
                                                  startkey=start_seq)
        self.rows = result['rows']
        # Return True if this iterator has anything to do...
        defer.returnValue(len(self.rows)!=0)

    def make_iter(self):
        """Make a new iterator over the rows"""
        def do_iter(rows):
            mutter = lambda *args: None # might be useful one day for debugging...
            # Find the next row this queue can use.
            for row in rows:
                # XXX - current_seq will be whatever the last iterator consumed.
                seq = self.current_seq = row['key']
                if self.stop_seq is not None and seq >= self.stop_seq:
                    return
                if self.stopping:
                    break
                # is it a "real" document?
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
                yield src_id, src_rev, None, seq

        assert self.rows, "not initialized"
        return do_iter(self.rows)

    @defer.inlineCallbacks
    def make_dep_iter_factory(self, doc_model):
        # find any documents which declare they depend on the documents
        # in our change list, then lookup the "source" of that doc
        # (ie, the one that "normally" triggers that doc to re-run)
        # and return that source.
        keys = []
        for src_id, src_rev, _, seq in self.make_iter():
            _, enc_rd_key, schema_id = split_rc_docid(src_id)
            rd_key = decode_rdkey(enc_rd_key)
            keys.append(["rd.core.content", "dep", [rd_key, schema_id]])
        results = yield doc_model.open_view(keys=keys, reduce=False)
        rows = results['rows']
        # Make a set to remove any dups.
        result_seq = set()
        for row in rows:
            src_id = row['value']['rd_source'][0]
            result_seq.add(src_id)

        class IterFact:
            def __init__(self, src_ids):
                self.src_ids = src_ids
            def make_iter(self):
                def do_iter(src_ids):
                    for src_id in src_ids:
                        yield src_id, None, None, None
                return do_iter(self.src_ids)

        defer.returnValue(IterFact(list(result_seq)))


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
    def __init__(self, doc_model):
        self.doc_model = doc_model
        self.def_process_done = None
        self.runners = []

    def add_processor(self, processor, schema_ids, queue_id):
        pqr = ProcessingQueueRunner(self.doc_model, processor, schema_ids,
                                    queue_id)
        self.runners.append(pqr)

    @defer.inlineCallbacks
    def initialize(self):
        db = self.doc_model.db
        info = yield db.infoDB()
        self.start_seq = info['update_seq']
        self.current_seq = self.start_seq
        self.stopping = False
        self.feed_stopper = yield db.feedContinuousChanges(self.feed_sink,
                                                           since=self.start_seq)

    @defer.inlineCallbacks
    def finalize(self):
        self.stopping = True
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
            logger.debug("waiting for existing processor to complete (is at %d)",
                        self.current_seq)
            _ = yield self.def_process_done
            logger.debug("existing processor back at seq %d", self.current_seq)
            return
        assert self.runners, "things get upset if we are asked to do nothing"
        doc_model = self.doc_model
        self.def_process_done = defer.Deferred()
        try:
        # do it -  stop the _changes feed while we process...
            start = time.clock()
            _ = yield defer.maybeDeferred(self.feed_stopper)
            self.feed_stopper = None
            # process the feed.
            logger.debug("incoming queue starting at seq %d", self.current_seq)
            while not self.stopping:
                ds = []
                iter = DocsBySeqIteratorFactory()
                more = yield iter.initialize(doc_model, start_seq=self.current_seq)
                if not more:
                    break
                for runner in self.runners:
                    ds.append(runner.process_queue(iter.make_iter()))
                # and any deps.
                dep_iter_fact = yield iter.make_dep_iter_factory(doc_model)
                for runner in self.runners:
                    ds.append(runner.process_queue(dep_iter_fact.make_iter()))
                _ = yield defer.DeferredList(ds)
                self.current_seq = iter.current_seq
            took = time.clock() - start
            logger.debug("incoming queue complete at seq %d (%0.2f secs)",
                         self.current_seq, took)
            # start listening for new changes
            assert self.feed_stopper is None
            self.feed_stopper = yield doc_model.db.feedContinuousChanges(
                                        self.feed_sink,
                                        since=self.current_seq)
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
class QueueState:
    """helper object to remember the state of each queue"""
    def __init__(self):
        self.schema_item = None
        self.last_saved_seq = 0
        self.failure = None
        # XXX - can .running be replaced with 'queue_id in self.queue_iters'?
        self.running = False


class StatefulQueueManager(object):
    def __init__(self, dm, q_runners, incoming_processor, options):
        assert q_runners, "nothing to do?"
        self.doc_model = dm
        # If we have an incoming processor running, we consider the end of
        # the queue exactly where that started.
        if incoming_processor is None:
            self.stop_seq = None
        else:
            self.stop_seq = incoming_processor.start_seq
        # XXX - we limit ourselves to stop_seq - should we catch up, we
        # need to be able to update our state docs to reflect that fact...
        self.incoming_processor = incoming_processor
        self.queues = q_runners
        self.queue_states = None # a list, parallel with self.queues.
        self.queue_iters = None # a dict keyed by qid for running queues.
        self.options = options
        self.status_msg_last = None

    def _start_q(self, q, q_state, def_done, do_incoming=False):
        logger.debug("starting queue %r", q.queue_id)
        assert not q_state.running, q
        q_state.running = True
        # in the interests of not letting the backlog processing cause
        # too much of a backlog for the 'incoming' processor, we wait
        # until the incoming queue is up-to-date before restarting.
        def doinc():
            if do_incoming and self.incoming_processor:
                return self.incoming_processor.ensure_done()
        def dostart(result):
            self._run_queue(q, q_state
                    ).addBoth(self._q_done, q, q_state, def_done
                    )
        defer.maybeDeferred(doinc
            ).addCallback(dostart)

    def _q_status(self):
        lowest = (0xFFFFFFFFFFFF, None)
        highest = (0, None)
        nfailed = 0
        for qlook, qstate in zip(self.queues, self.queue_states):
            if qstate.failure:
                nfailed += 1
                continue
            cs = qlook.current_seq
            this = cs, qlook.queue_id
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

    def _q_done(self, result, q, qstate, def_done):
        qstate.running = False
        failed = isinstance(result, Failure)
        if failed:
            logger.error("queue %r failed: %s", q.queue_id, result)
            qstate.failure = result
        else:
            logger.debug('queue %r reports it is complete at seq %s, done=%s',
                         q.queue_id, q.current_seq, result)
            assert result in (True, False), repr(result)
        # First check for any other queues which are no longer running
        # but have a sequence less than ours.
        still_going = False
        nerrors = len([qs for qs in self.queue_states if qs.failure])
        stop_all = nerrors and self.options.stop_on_error
        for qlook, qslook in zip(self.queues, self.queue_states):
            if qslook.running:
                still_going = True
            # only restart queues if stop_on_error isn't specified.
            if stop_all:
                qilook = self.queue_iters.get(qlook.queue_id)
                if qilook is not None:
                    qilook.stopping = True
                continue

            if qlook is not q and not qslook.running and not qslook.failure and \
               qlook.current_seq < q.current_seq:
                still_going = True
                self._start_q(qlook, qslook, def_done, True)

        if not stop_all and not failed and not result:
            # The queue which called us back hasn't actually finished yet...
            still_going = True
            self._start_q(q, qstate, def_done, True)

        if not still_going:
            # All done.
            logger.info("All queues are finished!")
            def_done.callback(None)
        # else wait for one of the queues to finish and call us again...

    @defer.inlineCallbacks
    def _load_queue_state(self, qr):
        # first open our 'state' schema
        doc_model = self.doc_model
        rd_key = ['ext', qr.queue_id] # same rd used to save the extension source etc
        key = ['rd.core.content', 'key-schema_id', [rd_key, 'rd.core.workqueue-state']]
        result = yield doc_model.open_view(key=key, reduce=False, include_docs=True)
        rows = result['rows']
        assert len(rows) in (0,1), result
        # ack - this is assuming each processor has a real 'extension' behind
        # it (which is true now, of course...)
        src_id = qr.processor.ext.doc['_id']
        src_rev = qr.processor.ext.doc['_rev']
        state_info = {'rd_key' : rd_key,
                      # We set rd_source to the _id/_rev of the extension doc
                      # itself - that way 'unprocess' etc all see these as
                      # 'derived'...
                      'rd_source': [src_id, src_rev],
                      # and similarly, say it was created by the extension itself.
                      'rd_ext_id': qr.queue_id,
                      'rd_schema_id': 'rd.core.workqueue-state',
                      }
        if len(rows) and 'doc' in rows[0]:
            doc = rows[0]['doc']
            state_info['_id'] = doc['_id']
            state_info['_rev'] = doc['_rev']
            state_info['items'] = {'seq' : doc.get('seq', 0)}
        else:
            state_info['items'] = {'seq': 0}
        ret = QueueState()
        ret.schema_item = state_info
        ret.last_saved_seq = state_info['items']['seq']
        defer.returnValue(ret)

    @defer.inlineCallbacks
    def _save_queue_state(self, state, current_seq, num_created):
        si = state.schema_item
        seq = si['items']['seq'] = current_seq
        # We can chew 1000 'nothing to do' docs quickly next time...
        last_saved = state.last_saved_seq
        if num_created or (seq-last_saved) > 1000:
            logger.debug("flushing state doc at end of run...")
            docs = yield self.doc_model.create_schema_items([si])
            assert len(docs)==1, docs # only asked to save 1
            si['_rev'] = docs[0]['rev']
            state.last_saved_seq = seq
        else:
            logger.debug("no need to flush state doc")

    @defer.inlineCallbacks
    def _run_queue(self, q, qstate, num_to_process=2000):
        start_seq = qstate.schema_item['items']['seq']
        iterfact = DocsBySeqIteratorFactory()
        more = yield iterfact.initialize(self.doc_model, start_seq,
                                         num_to_process, self.stop_seq)
        if not more:
            # queue is done (at the end)
            defer.returnValue(True)

        assert q.queue_id not in self.queue_iters
        src_gen = iterfact.make_iter()
        self.queue_iters[q.queue_id] = src_gen
        try:
            logger.debug("Work queue %r starting with sequence ID %d",
                         q.queue_id, start_seq)
            num_created = yield q.process_queue(src_gen)
        finally:
            del self.queue_iters[q.queue_id]

        # note we trust the iterators current_seq more then the q - the
        # q reflects the last *processed* rather than last seen...
        _ = yield self._save_queue_state(qstate, iterfact.current_seq, num_created)
        defer.returnValue(False)

    @defer.inlineCallbacks
    def run(self):
        dm = self.doc_model
        # load our queue states.
        assert self.queue_states is None
        self.queue_states = []
        for q in self.queues:
            self.queue_states.append((yield self._load_queue_state(q)))
        assert self.queue_iters is None
        self.queue_iters = {}

        # start a looping call to report the status while we run.
        lc = task.LoopingCall(self._q_status)
        lc.start(10, False)
        # and fire them off, waiting until all complete.
        def_done = defer.Deferred()
        for q, qs in zip(self.queues, self.queue_states):
            self._start_q(q, qs, def_done)
        _ = yield def_done
        lc.stop()
        # update the views now...
        _ = yield self.doc_model._update_important_views()


class ProcessingQueueRunner(object):
    """A queue sequence runner - designed to run over an iterator
    of couch documents and run any of the extension objects which process the
    documents.
    """
    def __init__(self, doc_model, processor, schema_ids, queue_id):
        self.doc_model = doc_model
        self.processor = processor
        self.schema_ids = schema_ids
        self.queue_id = queue_id
        self.current_seq = None

    @defer.inlineCallbacks
    def process_queue(self, src_gen):
        """processes a number of items in a work-queue.
        """
        doc_model = self.doc_model
        num_created = 0
        schema_ids = self.schema_ids
        processor = self.processor

        logger.debug("starting processing %r", self.queue_id)
        items = []
        # process until we run out.
        for src_id, src_rev, schema_id, seq in src_gen:
            self.current_seq = seq
            if schema_id is None:
                try:
                    _, _, schema_id = split_rc_docid(src_id)
                except ValueError, why:
                    logger.log(1, 'skipping document %r: %s', src_id, why)
                    continue

            if schema_id not in schema_ids:
                continue

            got, must_save = yield processor(src_id, src_rev)
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
                     self.queue_id, self.current_seq, num_created)
        defer.returnValue(num_created)


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


    @defer.inlineCallbacks
    def __call__(self, src_id, src_rev):
        """The "real" entry-point to this processor"""
        dm = self.doc_model
        ext = self.ext
        ext_id = ext.id
        force = self.options.force

        # some extensions declare themselves as 'smart updaters' - they
        # are more efficiently able to deal with updating the records it
        # wrote last time than our brute-force approach.
        docs_previous = {}
        if ext.category == ext.SMART:
            # the extension says it can take care of everything related to
            # re-running.  Such extensions are unlikely to be able to be
            # correctly overridden, but that is life.
            pass
        elif ext.category in [ext.PROVIDER, ext.EXTENDER]:
            is_provider = ext.category==ext.PROVIDER
            # We need to find *all* items previously written by this extension
            # so we can manage updating/removal of the old items.
            key = ['rd.core.content', 'ext_id-source', [ext_id, src_id]]
            result = yield dm.open_view(key=key, reduce=False)
            rows = result['rows']
            if rows:
                dirty = False
                for row in rows:
                    assert 'error' not in row, row # views don't give error records!
                    prev_src = row['value']['rd_source']
                    # a hack to prevent us cycling to death - if our previous
                    # run of the extension created this document, just skip
                    # it.
                    # This might be an issue in the 'reprocess' case.
                    if prev_src is not None and prev_src[0] == src_id and \
                       row['value']['rd_schema_id'] in ext.source_schemas:
                        # This is illegal for a provider.
                        if is_provider:
                            raise ValueError("extension %r is configured to depend on schemas it previously wrote" %
                                             ext_id)
                        # must be an extender, which is OK (see above)
                        logger.debug("skipping document %r - it depends on itself",
                                     src_id)
                        defer.returnValue((None, None))

                    if prev_src != [src_id, src_rev]:
                        dirty = True
                        break
                    # error rows are considered 'dirty'
                    cur_schema = row['value']['rd_schema_id']
                    if cur_schema == 'rd.core.error':
                        logger.debug('document %r generated previous error '
                                     'records - re-running', src_id)
                        dirty = True
                        break
            else:
                dirty = True
            if not dirty and not force:
                logger.debug("document %r is up-to-date", src_id)
                defer.returnValue((None, None))

            for row in rows:
                v = row['value']
                prev_key = dm.hashable_key((v['rd_key'], v['rd_schema_id']))
                logger.debug('noting previous schema item %(rd_schema_id)r by'
                             ' %(rd_ext_id)r for key %(rd_key)r', v)
                docs_previous[prev_key] = v
        else:
            raise ValueError("extension %r has invalid category %r" %
                             (ext_id, ext.category))

        # Get the source-doc and process it.
        src_doc = (yield dm.open_documents_by_id([src_id]))[0]
        # Although we got this doc id directly from the _all_docs_by_seq view,
        # it is quite possible that the doc was deleted since we read that
        # view.  It could even have been updated - so if its not the exact
        # revision we need we just skip it - it will reappear later...
        if src_doc is None or (src_rev != None and src_doc['_rev'] != src_rev):
            logger.debug("skipping document %(_id)r - it's changed since we read the queue",
                         src_doc)
            defer.returnValue((None, None))

        # our caller should have filtered the list to only the schemas
        # our extensions cares about.
        assert src_doc['rd_schema_id'] in ext.source_schemas

        # If the source of this document is yet to see a schema written by
        # a 'schema provider', skip calling extensions which depend on this
        # doc - we just wait for a 'provider' to be called, at which time
        # the source doc will again trigger us being called again.
        if not src_doc.get('rd_schema_provider'):
            logger.debug("skipping document %(_id)r - it has yet to see a schema provider",
                         src_doc)
            defer.returnValue((None, None))

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
                            ext, result)
        except:
            # handle_ext_failure may put error records into new_items.
            self._handle_ext_failure(Failure(), src_doc, new_items)

        logger.debug("extension %r generated %d new schemas", ext_id, len(new_items))

        # check the new items created against the 'source' documents created
        # previously by the extension.  Nuke the ones which were provided
        # before and which aren't now.  (This is most likely after an
        # 'rd.core.error' schema record is written, then the extension is
        # re-run and it successfully creates a 'real' schema)
        docs_this = set()
        for i in new_items:
            prev_key = dm.hashable_key((i['rd_key'], i['rd_schema_id']))
            docs_this.add(prev_key)
        for (prev_key, prev_val) in docs_previous.iteritems():
            if prev_key not in docs_this:
                si = {'rd_key': prev_val['rd_key'],
                      'rd_schema_id': prev_val['rd_schema_id'],
                      'rd_ext_id': ext_id,
                      '_deleted': True,
                      '_rev': prev_val['_rev'],
                      }
                new_items.insert(0, si)
                logger.debug('deleting previous schema item %(rd_schema_id)r'
                             ' by %(rd_ext_id)r for key %(rd_key)r', si)

        # We try hard to batch writes; we earlier just checked to see if
        # only the same key was written, but that still failed.  Last
        # ditch attempt is to see if the extension made a query - if it
        # did, then it will probably query next time, and will probably
        # expect to see what it wrote last time
        must_save = 'did_query' in context
        if not must_save:
            # must also save now if they wrote a key for another item.
            for i in new_items:
                logger.debug('new schema item %(rd_schema_id)r by'
                             ' %(rd_ext_id)r for key %(rd_key)r', i)
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
            # Throw away any records emitted by *this* failure.
            new_items[:] = []
            result.raiseException()

        # and make the error record
        edoc = {'error_details': unicode(result)}
        if new_items:
            logger.info("discarding %d items created before the failure",
                        len(new_items))
        new_items[:] = [{'rd_key' : src_doc['rd_key'],
                         'rd_source': [src_doc['_id'], src_doc['_rev']],
                         'rd_schema_id': 'rd.core.error',
                         'rd_ext_id' : self.ext.id,
                         'items' : edoc,
                         }]


def get_pqr_for_extension(doc_model, extension, options):
    processor = ExtensionProcessor(doc_model, extension, options)
    schema_ids = extension.source_schemas
    qid = extension.id
    return ProcessingQueueRunner(doc_model, processor, schema_ids, qid)
