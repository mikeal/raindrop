from twisted.internet import defer

from raindrop.tests import TestCaseWithCorpus


class TestSimpleCorpus(TestCaseWithCorpus):
    @defer.inlineCallbacks
    def test_simple_email(self):
        ndocs = yield self.load_corpus("hand-rolled", "sent-email-simple")
        self.failUnlessEqual(ndocs, 1) # failed to load any corpus docs???
        _ = yield self.pipeline.start()

        # There should be exactly one 'rd.msg.email' mail in our DB - check that.
        key = ["rd.core.content", "schema_id", "rd.msg.email"]
        result = yield self.doc_model.open_view(key=key, reduce=False,
                                                include_docs=True)
        rows = result['rows']
        self.failUnlessEqual(len(rows), 1, rows)
        doc = rows[0]['doc']
        # check our headers
        headers = doc['headers']
        # every single entry should be a list of at least one.
        for name, val in headers.iteritems():
            self.failUnless(isinstance(val, list) and len(val)>0, (name, val))
        # and some specific values.
        self.failUnless(len(headers['x-raindrop-note'])==2, str(headers['x-raindrop-note']))
        self.failUnlessEqual(headers['date'][0], 'Sat, 21 Jul 2009 12:13:14 -0000')

    @defer.inlineCallbacks
    def test_simple_body(self):
        ndocs = yield self.load_corpus("hand-rolled", "sent-email-simple")
        self.failUnlessEqual(ndocs, 1) # failed to load any corpus docs???
        _ = yield self.pipeline.start()

        # There should be exactly one 'rd.msg.body' mail in our DB - check that
        key = ["rd.core.content", "schema_id", "rd.msg.body"]
        result = yield self.doc_model.open_view(key=key, reduce=False,
                                                include_docs=True)
        rows = result['rows']
        self.failUnlessEqual(len(rows), 1, rows)
        doc = rows[0]['doc']
        # 'from' is not a list.
        self.failUnlessEqual(doc['from'], ['email', 'raindrop_test_user@mozillamessaging.com'])
        self.failUnlessEqual(doc['from_display'], 'Raindrop Test User')
        # 'to' is a list, but our test email has only 1 value.
        self.failUnlessEqual(doc['to'], [['email', 'raindrop_test_recip@mozillamessaging.com']])
        self.failUnlessEqual(doc['to_display'], ['Raindrop Test Recipient'])
        # 2 CCs
        self.failUnlessEqual(sorted(doc['cc']),
                             sorted([['email', 'raindrop_test_recip2@mozillamessaging.com'],
                                     ['email', 'raindrop_test_recip3@mozillamessaging.com']]))
        self.failUnlessEqual(sorted(doc['cc_display']),
                             sorted(['Raindrop Test Recipient 2',
                                     'Raindrop Test Recipient 3']))

    @defer.inlineCallbacks
    def test_simple_recips(self):
        ndocs = yield self.load_corpus("hand-rolled", "sent-email-simple")
        self.failUnlessEqual(ndocs, 1) # failed to load any corpus docs???
        _ = yield self.pipeline.start()

        # All people we sent mail to should get an identity and contact
        # record.
        for addy in ['raindrop_test_recip@mozillamessaging.com',
                     'raindrop_test_recip2@mozillamessaging.com',
                     'raindrop_test_recip3@mozillamessaging.com']:
            rd_key = ['identity', ['email', addy]]
            sch_id = 'rd.identity.exists'
            key = ["rd.core.content", "key-schema_id", [rd_key, sch_id]]
            result = yield self.doc_model.open_view(key=key, reduce=False,
                                                    include_docs=True)
            self.failUnlessEqual(len(result['rows']), 1, addy)
            # and the contact
            
            key = ["rd.core.content", "key-schema_id", [rd_key, "rd.identity.contacts"]]
            result = yield self.doc_model.open_view(key=key, reduce=False,
                                                    include_docs=True)
            self.failUnlessEqual(len(result['rows']), 1, addy)
