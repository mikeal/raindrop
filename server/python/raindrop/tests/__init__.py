# The raindrop test suite...
from __future__ import with_statement

import os
import glob
import json
import base64
from twisted.trial import unittest
from twisted.internet import defer

import raindrop.config
from raindrop.model import get_db, fab_db, get_doc_model
from ..pipeline import Pipeline
from raindrop import bootstrap
from raindrop import sync

import raindrop.proto
raindrop.proto.init_protocols()
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
    

class FakeOptions:
    # XXX - get options from raindrop.opts...
    stop_on_error = False
    force = False
    protocols = None
    exts = None
    no_process = False

class TestCase(unittest.TestCase):
    pass

class TestCaseWithDB(TestCase):
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

    def get_conductor(self, options=None):
        if options is None:
            options = FakeOptions()
        sync._conductor = None # hack away the singleton...
        return sync.get_conductor(options)


class TestCaseWithTestDB(TestCaseWithDB):
    """A test case that is setup to work with a temp database pre-populated
    with 'test protocol' raw messages.
    """
    def setUp(self):
        raindrop.config.CONFIG = None
        self.config = self.make_config()
        opts = FakeOptions()
        self.doc_model = get_doc_model()
        self.pipeline = Pipeline(self.doc_model, opts)
        return self.prepare_test_db(self.config
            ).addCallback(lambda _: self.pipeline.initialize()
            )

    def make_config(self):
        # change the name of the DB used.
        config = raindrop.config.init_config()
        dbinfo = config.couches['local']
        dbinfo['name'] = 'raindrop_test_suite'
        # We probably never want the user's accounts for auto testing.
        # setup a simple test one.
        config.accounts.clear()
        acct = config.accounts['test'] = {}
        acct['kind'] = 'test'
        acct['username'] = 'test'
        acct['num_test_docs'] = 0 # ignored!
        test_proto.test_num_test_docs = 0 # incremented later..
        acct['id'] = 'test'
        return config

    def deferMakeAnotherTestMessage(self, _):
        # We need to reach into the impl to trick the test protocol
        test_proto.test_num_test_docs += 1
        return self.get_conductor().sync(self.pipeline)


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
        pattern = "%s/%s.json" % (corpus_dir, item_spec)
        for filename in glob.iglob(pattern):
            with open(filename) as f:
                try:
                    ob = json.load(f)
                except ValueError, why:
                    self.fail("%r has invalid json: %r" % (filename, why))
                if '_id' not in ob:
                    si = {'schema_id': ob['rd_schema_id'],
                          'rd_key': ob['rd_key'],
                          'ext_id': ob['rd_ext_id'],
                          'items': []}
                    ob['_id'] = self.doc_model.get_doc_id_for_schema_item(si)
                for name, data in ob.get('_attachments', {}).iteritems():
                    fname = os.path.join(corpus_dir, data['filename'])
                    with open(fname, 'rb') as attach_f:
                        enc_data = base64.encodestring(attach_f.read()).replace('\n', '')
                        data['data'] = enc_data
                yield ob
                num += 1
        self.failUnless(num, "failed to load any docs from %r matching %r" %
                        (corpus_name, item_spec))

    @defer.inlineCallbacks
    def load_corpus(self, corpus_name, corpus_spec="*"):
        _ = yield self.prepare_corpus_environment(corpus_name)
        _ = yield self.prepare_test_db(self.config)
        _ = yield self.pipeline.initialize()
        docs = [d for d in self.gen_corpus_docs(corpus_name, corpus_spec)]
        # this will do until we get lots...
        _ = yield self.doc_model.db.updateDocuments(docs)
        defer.returnValue(len(docs))
