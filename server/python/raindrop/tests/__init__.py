# The raindrop test suite...
import os
from twisted.trial import unittest

from raindrop.config import get_config
from raindrop.model import get_db, fab_db, get_doc_model
from raindrop.proto import test as test_proto
from ..pipeline import Pipeline
from raindrop import bootstrap
from raindrop import sync


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
    def prepare_test_accounts(self, config):
        pass

    def prepare_config(self):
        # change the name of the DB used.
        config = get_config()
        dbinfo = config.couches['local']
        dbinfo['name'] = 'raindrop_test_suite'
        # We probably never want the user's accounts for auto testing.
        config.accounts.clear()
        self.prepare_test_accounts(config)

    def prepare_test_db(self):
        # change the name of the DB used.
        config = get_config()
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

        # This needs more thought - not every test will want the user's
        # accounts (indeed, I expect they will *not* want user's account...)
        return db.deleteDB(dbinfo['name']
                ).addCallbacks(_nuked_ok, _nuke_failed, errbackArgs=(5,)
                ).addCallback(fab_db
                ).addCallback(bootstrap.install_accounts
                # client files are expensive (particularly dojo) and not
                # necessary yet...
                #).addCallback(bootstrap.install_client_files, FakeOptions()
                #).addCallback(bootstrap.update_apps
                ).addCallback(bootstrap.insert_default_docs, FakeOptions()
                ).addCallback(bootstrap.install_views, FakeOptions()
                )

    def setUp(self):
        self.prepare_config()
        opts = FakeOptions()
        self.pipeline = Pipeline(get_doc_model(), opts)

        return self.prepare_test_db(
            ).addCallback(lambda _: self.pipeline.initialize()
            )

    def get_last_by_seq(self, n=1):
        def extract_row(result):
            rows = result['rows']
            assert len(rows)==n
            return rows

        return get_doc_model().db.listDocsBySeq(limit=n,
                                                descending=True,
                                                include_docs=True
                ).addCallback(extract_row
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

        return get_doc_model().open_view(did, vid, **kw
                    ).addCallback(check_result
                    )

    def deferFailUnlessView(self, result, *args, **kw):
        return self.failUnlessView(*args, **kw)


class TestCaseWithTestDB(TestCaseWithDB):
    """A test case that is setup to work with a temp database pre-populated
    with 'test protocol' raw messages.
    """
    def prepare_test_accounts(self, config):
        acct = config.accounts['test'] = {}
        acct['kind'] = 'test'
        acct['username'] = 'test'
        acct['num_test_docs'] = 0 # ignored!
        test_proto.test_num_test_docs = 0 # incremented later..
        acct['id'] = 'test'

    def deferMakeAnotherTestMessage(self, _):
        # We need to reach into the impl to trick the test protocol
        test_proto.test_num_test_docs += 1
        sync._conductor = None # hack away the singleton...        
        return sync.get_conductor(FakeOptions()).sync()
