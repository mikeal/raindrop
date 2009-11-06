# Helpers for API testers.

from urllib import urlencode

from twisted.internet import defer

from raindrop.tests import TestCaseWithCorpus, json
from raindrop.wetpaisley import _encode_options as encode_options

class APITestCase(TestCaseWithCorpus):
    @defer.inlineCallbacks
    def setUp(self):
        _ = yield TestCaseWithCorpus.setUp(self)
        ndocs = yield self.load_corpus('hand-rolled')
        self.failUnless(ndocs, "failed to load any corpus docs")
        nerr = yield self.ensure_pipeline_complete()
        self.failUnlessEqual(nerr, 0)
        # and reset our API so it reloads anything
        _ = yield self.call_api("_reset")

    def call_api(self, endpoint, **kw):
        db = self.doc_model.db
        dbname = self.config.couches['local']['name']

        uri = "/%s/_api/%s" % (dbname, endpoint)
        if kw:
            uri += "?" + urlencode(encode_options(kw))
        return db.get(uri
            ).addCallback(db.parseResult)
