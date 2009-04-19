# The raindrop test suite...

from twisted.trial import unittest

from raindrop.config import get_config
from raindrop.model import get_db, fab_db, get_doc_model
from raindrop import bootstrap
from raindrop import sync

import logging
logging.basicConfig() # this is misplaced...

class FakeOptions:
    # XXX - we might need run-raindrop to share its options...
    stop_on_error = False
    force = False
    protocols = None

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
        def _nuke_failed(failure, *args, **kwargs):
            if failure.value.status != '404':
                failure.raiseException()

        def _nuked_ok(d):
            pass

        # This needs more thought - not every test will want the user's
        # accounts (indeed, I expect they will *not* want user's account...)
        return db.deleteDB(dbinfo['name']
                ).addCallbacks(_nuked_ok, _nuke_failed
                ).addCallback(fab_db
                ).addCallback(bootstrap.install_accounts
                ).addCallback(bootstrap.install_client_files, FakeOptions()
                ).addCallback(bootstrap.install_views, FakeOptions()
                ).addCallback(bootstrap.update_apps)

    def setUp(self):
        self.prepare_config()
        return self.prepare_test_db()

    def get_last_by_seq(self):
        def extract_row(result):
            rows = result['rows']
            assert len(rows)==1
            return rows[0]

        return get_doc_model().db.listDocsBySeq(limit=1,
                                                descending=True,
                                                include_docs=True
                ).addCallback(extract_row
                )


class TestCaseWithTestDB(TestCaseWithDB):
    """A test case that is setup to work with a temp database pre-populated
    with 'test protocol' raw messages.
    """
    def prepare_test_accounts(self, config):
        acct = config.accounts['test'] = {}
        acct['kind'] = 'test'
        acct['username'] = 'test'
        acct['num_test_docs'] = 1
        acct['_id'] = 'test'

    def setUp(self):
        # After setting up, populate our test DB with the raw messages.
        sync._conductor = None # hack away the singleton...
        return super(TestCaseWithTestDB, self).setUp(
                ).addCallback(sync.get_conductor(FakeOptions()).sync
                )
