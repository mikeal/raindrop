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

# A simple RSS 'protocol'; simply manages updating a document with the raw
# data from the feed - extensions then do all the heavy lifting.

import logging
from twisted.internet import protocol, ssl, defer, error
from twisted.web.client import HTTPClientFactory
import twisted.web.error
from ..proc import base
from urlparse import urlparse

logger = logging.getLogger(__name__)

@defer.inlineCallbacks
def maybe_update_doc(conductor, doc_model, doc, options):
    uri = doc['uri'].encode("utf-8")
    parsed = urlparse(uri)
    # If we have existing content for the item, make a conditional request.
    req_headers = {}
    if not options.force and 'headers' in doc:
        doc_headers = doc['headers']
        if 'date-modified' in doc_headers:
            req_headers['If-Modified-Since'] = \
                    doc_headers['date-modified'][0].encode('utf-8')
        if 'etag' in doc_headers:
            req_headers['If-None-Match'] = doc_headers['etag'][0].encode('utf-8')

    # Issue the request.
    if parsed.scheme == 'http':
        # Note we *must* use the full uri here and not just the path portion
        # or getsatisfaction returns invalid urls...
        factory = HTTPClientFactory(uri, headers=req_headers)
    else:
        logger.error("Can't fetch URI %r - unknown scheme", uri)
        return
    from twisted.internet import reactor
    reactor.connectTCP(parsed.hostname, parsed.port or 80, factory)
    try:
        result = yield factory.deferred
    except twisted.web.error.Error, exc:
        if exc.status == '304':
            # yay - nothing to update!
            logger.info('rss feed %r is up-to-date', uri)
            return
        logger.error("fetching rss feed %r failed: %s", uri, exc)
        return

    assert factory.status=='200', factory.status # everything else is an exc?
    logger.debug('rss feed %r has changed', uri)
    # update the headers - twisted already has them in the format we need
    # (ie, lower-cased keys, each item is a list)
    doc['headers'] = factory.response_headers.copy()
    a = doc['_attachments'] = {}
    ct = doc['headers']['content-type'][0]
    a['response'] = {'content_type': ct,
                     'data': result}
    _ = yield conductor.pipeline.provide_documents([doc])
    logger.info('updated feed %r', uri)


class RSSAccount(base.AccountBase):
    @defer.inlineCallbacks
    def startSync(self, conductor, options):
        # Find all RSS documents.
        key = ['rd.core.content', 'schema_id', 'rd.raw.rss']
        result = yield self.doc_model.open_view(key=key, reduce=False,
                                                 include_docs=True)
        rows = result['rows']
        logger.info("have %d rss feeds to check", len(rows))
        dl = []
        for row in rows:
            doc = row['doc']
            if doc.get('disabled', False):
                logger.debug('rss feed %(id)r is disabled - skipping', row)
                continue
            dl.append(maybe_update_doc(conductor, self.doc_model, doc, options))
        _ = yield defer.DeferredList(dl)

    def get_identities(self):
        return []
