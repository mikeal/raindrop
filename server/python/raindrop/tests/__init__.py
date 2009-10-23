# The raindrop test suite...
from __future__ import with_statement

import os
import glob
import base64
from email import message_from_string
from twisted.trial import unittest
from twisted.internet import defer
from twisted.web.error import Error

try:
    import json
except ImportError:
    import simplejson as json

import raindrop.config
from raindrop.model import get_db, fab_db, get_doc_model
from ..pipeline import Pipeline
from raindrop import bootstrap
from raindrop import sync
from raindrop.proto.imap import get_rdkey_for_email

import raindrop.proto
raindrop.proto.init_protocols(True)
test_proto = raindrop.proto.test

# all this logging stuff is misplaced...
import logging
logging.basicConfig()
if 'RAINDROP_LOG_LEVELS' in os.environ:
    # duplicated from run-raindrop...
    for val in os.environ['RAINDROP_LOG_LEVELS'].split(';'):
        try:
            name, level = val.split("=", 1)
        except ValueError:
            name = None
            level = val
        # convert a level name to a value.
        try:
            level = int(getattr(logging, level.upper()))
        except (ValueError, AttributeError):
            # not a level name from the logging module - maybe a literal.
            try:
                level = int(level)
            except ValueError:
                init_errors.append(
                    "Invalid log-level '%s' ignored" % (val,))
                continue
        l = logging.getLogger(name)
        l.setLevel(level)


class TestLogHandler(logging.Handler):
    def __init__(self, *args, **kw):
        logging.Handler.__init__(self, *args, **kw)
        self.ok_filters = []
        self.records = []

    def emit(self, record):
        for f in self.ok_filters:
            if f(record):
                break
        else:
            # no filters said OK
            self.records.append(record)

class FakeOptions:
    # XXX - get options from raindrop.opts...
    stop_on_error = False
    force = False
    protocols = None
    exts = None
    no_process = False
    repeat_after = 0
    folders = []

class TestCase(unittest.TestCase):
    def setUp(self):
        self.log_handler = TestLogHandler()
        # by default, WARNING or higher messages cause a test failure...
        filter = lambda record: record.levelno < logging.WARNING
        self.log_handler.ok_filters.append(filter)
        l = logging.getLogger('raindrop')
        l.addHandler(self.log_handler)
        # this env-var means the developer wants to see the logs as it runs.
        if 'RAINDROP_LOG_LEVELS' not in os.environ:
            l.propagate = False
        return unittest.TestCase.setUp(self)

    def tearDown(self):
        l = logging.getLogger('raindrop')
        l.removeHandler(self.log_handler)
        parent_handler = l.parent.handlers[0]
        frecords = [parent_handler.format(r) for r in self.log_handler.records
                    if r.levelno >= logging.WARNING]
        if frecords:
            self.fail("unexpected log errors\n" + '\n'.join(frecords))
        return unittest.TestCase.tearDown(self)

class TestCaseWithDB(TestCase):
    @defer.inlineCallbacks
    def tearDown(self):
        if self.pipeline is not None:
            _ = yield self.pipeline.finalize()
        _ = yield TestCase.tearDown(self)

    @defer.inlineCallbacks
    def ensure_pipeline_complete(self):
        # later we will support *both* backlog and incoming at the
        # same time, but currently the test suite done one or the other...
        ip = self.pipeline.incoming_processor
        if ip is None:
            nerr = yield self.pipeline.start_backlog()
        else:
            # We have an 'incoming processor' running.
            # we call this twice - first time it may be on the way out of the
            # loop while a few new ones are arriving.
            _ = yield ip.ensure_done()
            _ = yield ip.ensure_done()
            # manually count the errors.
            nerr = sum([getattr(r.processor, 'num_errors', 0) for r in ip.runners])
        defer.returnValue(nerr)

    """A test case that is setup to work with a temp database"""
    def prepare_test_db(self, config):
        # change the name of the DB used.
        dbinfo = config.couches['local']
        # then blindly nuke it.
        db = get_db('local', None)
        def _nuke_failed(failure, retries_left):
            # worm around a bug on windows in couch 0.9:
            # https://issues.apache.org/jira/browse/COUCHDB-326
            # We just need to wait a little and try again...
            failure.trap(Error)
            if failure.value.status == '500' and retries_left:
                import time;time.sleep(0.1)
                return db.deleteDB(dbinfo['name']
                    ).addCallbacks(_nuked_ok, _nuke_failed,
                                   errbackArgs=retries_left-1
                    )

            if failure.value.status != '404':
                failure.raiseException()

        def _nuked_ok(d):
            pass

        @defer.inlineCallbacks
        def del_non_test_accounts(result):
            # 'insert_default_docs' may have created an account (eg RSS) which
            # may get in the way of testing; nuke any which aren't in our
            # config.
            got = yield db.openView(dbinfo['name'],
                                    'raindrop!content!all', 'megaview',
                                    key=['rd.core.content', 'schema_id', 'rd.account'],
                                    include_docs=True, reduce=False)
            wanted_ids = set(acct['id']
                             for acct in config.accounts.itervalues())
            to_del = [{'_id': r['doc']['_id'],
                       '_rev': r['doc']['_rev'],
                       '_deleted': True,
                       }
                      for r in got['rows'] if r['doc']['id'] not in wanted_ids]
            _ = yield db.updateDocuments(dbinfo['name'], to_del)

        return db.deleteDB(dbinfo['name']
                ).addCallbacks(_nuked_ok, _nuke_failed, errbackArgs=(5,)
                ).addCallback(fab_db
                ).addCallback(bootstrap.check_accounts, config
                # client files are expensive (particularly dojo) and not
                # necessary yet...
                #).addCallback(bootstrap.install_client_files, FakeOptions()
                #).addCallback(bootstrap.update_apps
                ).addCallback(bootstrap.insert_default_docs, FakeOptions()
                ).addCallback(bootstrap.install_views, FakeOptions()
                ).addCallback(del_non_test_accounts
                )

    def failUnlessView(self, did, vid, expect, **kw):
        # Expect is a list of (key, value) tuples.  couch always returns
        # sorted keys, so we can just sort the expected items.
        def check_result(result):
            sexpect = sorted(expect)
            ex_keys = [i[0] for i in sexpect]
            got_keys = [r['key'] for r in result['rows']]
            self.failUnlessEqual(got_keys, ex_keys)
            ex_vals = [i[1] for i in sexpect]
            got_vals = [r['value'] for r in result['rows']]
            self.failUnlessEqual(got_vals, ex_vals)

        return self.get_doc_model().open_view(did, vid, **kw
                    ).addCallback(check_result
                    )

    def deferFailUnlessView(self, result, *args, **kw):
        return self.failUnlessView(*args, **kw)


class TestCaseWithTestDB(TestCaseWithDB):
    """A test case that is setup to work with a temp database pre-populated
    with 'test protocol' raw messages.
    """
    @defer.inlineCallbacks
    def setUp(self):
        _ = yield TestCaseWithDB.setUp(self)
        raindrop.config.CONFIG = None
        self.config = self.make_config()
        opts = self.get_options()
        self.doc_model = get_doc_model()
        self.pipeline = Pipeline(self.doc_model, opts)
        _ = yield self.prepare_test_db(self.config)
        _ = yield self.pipeline.initialize()

    def get_options(self):
        return FakeOptions()

    def make_config(self):
        # change the name of the DB used.
        config = raindrop.config.init_config()
        dbinfo = config.couches['local']
        dbinfo['name'] = 'raindrop_test_suite'
        # We probably never want the user's accounts for auto testing.
        # setup a simple test one.
        config.accounts.clear()
        acct = config.accounts['test'] = {}
        acct['proto'] = 'test'
        acct['username'] = 'test'
        acct['num_test_docs'] = 0 # ignored!
        test_proto.test_num_test_docs = 0 # incremented later..
        acct['id'] = 'test'
        return config

    def get_conductor(self):
        return sync.get_conductor(self.pipeline)

    @defer.inlineCallbacks
    def deferMakeAnotherTestMessage(self, _):
        # We need to reach into the impl to trick the test protocol
        test_proto.test_num_test_docs += 1
        c = yield self.get_conductor()
        _ = yield c.sync(self.pipeline.options)


class TestCaseWithCorpus(TestCaseWithDB):
    def prepare_corpus_environment(self, corpus_name):
        raindrop.config.CONFIG = None
        cd = self.get_corpus_dir(corpus_name)
        self.config = raindrop.config.init_config(os.path.join(cd, "raindrop"))
        # hack our couch server in
        dbinfo = self.config.couches['local']
        dbinfo['name'] = 'raindrop_test_suite'
        dbinfo['port'] = 5984
        opts = FakeOptions()
        self.doc_model = get_doc_model()
        self.pipeline = Pipeline(self.doc_model, opts)
        return self.prepare_test_db(self.config
            ).addCallback(lambda _: self.pipeline.initialize()
            )

    def get_corpus_dir(self, name):
        import raindrop.tests
        return os.path.join(raindrop.tests.__path__[0], "corpora", name)

    def gen_corpus_docs(self, corpus_name, item_spec="*"):
        cwd = os.getcwd()
        corpus_dir = self.get_corpus_dir(corpus_name)
        num = 0
        # We try and make life simple for people by auto-determining the
        # 'schema' for some well-known file types (eg, .rfc822.txt)
        pattern = "%s/%s.*" % (corpus_dir, item_spec)
        base_names = set()
        for filename in glob.iglob(pattern):
            try:
                path, name = os.path.split(filename)
                # don't use splitext - we want the *first* dot.
                first, _ = filename.split(".", 1)
                base = os.path.join(path, first)
            except ValueError:
                base = filename
            base_names.add(base)
        for basename in base_names:
            if basename.endswith('README') or basename.endswith('raindrop'):
                continue
            # .json files get first go - they may 'override' what we would
            # otherwise deduce.
            elif os.path.exists(basename + ".json"):
                filename = basename + ".json"
                with open(filename) as f:
                    try:
                        ob = json.load(f)
                    except ValueError, why:
                        self.fail("%r has invalid json: %r" % (filename, why))
                    for name, data in ob.get('_attachments', {}).iteritems():
                        fname = os.path.join(corpus_dir, data['filename'])
                        with open(fname, 'rb') as attach_f:
                            enc_data = base64.encodestring(attach_f.read()).replace('\n', '')
                            data['data'] = enc_data
            elif os.path.exists(basename + ".rfc822.txt"):
                # plain rfc822.txt file.
                with open(basename + ".rfc822.txt", 'rb') as f:
                    data = f.read()
                msg_id = message_from_string(data)['message-id']
                ob = {
                      'rd_schema_id': 'rd.msg.rfc822',
                      'rd_key': get_rdkey_for_email(msg_id),
                      'rd_ext_id': 'proto.imap',
                      'rd_source': None,
                      '_attachments' : {
                        'rfc822': {
                            'content_type': 'message',
                            'data': base64.encodestring(data).replace('\n', ''),
                        }
                      }
                    }
            else:
                print "Don't know how to load '%s.*' into the corpus" % basename
                continue
            if '_id' not in ob:
                si = {'schema_id': ob['rd_schema_id'],
                      'rd_key': ob['rd_key'],
                      'ext_id': ob['rd_ext_id'],
                      'items': []}
                ob['_id'] = self.doc_model.get_doc_id_for_schema_item(si)
            yield ob
            num += 1
        self.failUnless(num, "failed to load any docs from %r matching %r" %
                        (corpus_name, item_spec))

    @defer.inlineCallbacks
    def init_corpus(self, corpus_name):
        _ = yield self.prepare_corpus_environment(corpus_name)

    @defer.inlineCallbacks
    def load_corpus(self, corpus_name, corpus_spec="*"):
        _ = yield self.init_corpus(corpus_name)
        docs = [d for d in self.gen_corpus_docs(corpus_name, corpus_spec)]
        # this will do until we get lots...
        _ = yield self.doc_model.db.updateDocuments(docs)
        defer.returnValue(len(docs))
