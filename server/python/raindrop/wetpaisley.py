# paisley with raindrops on it...

import sys
from urllib import urlencode, quote
import base64

import twisted.web.error
from twisted.internet import defer, reactor
from twisted.python.failure import Failure
from twisted.internet.task import coiterate
from twisted.web.client import HTTPClientFactory, HTTPPageGetter
from twisted.web import http



try:
    import simplejson as json
except ImportError:
    import json # Python 2.6
    sys.modules['simplejson'] = json # for paisley on 2.6...

import paisley

# from the couchdb package; not sure what makes these names special...
def _encode_options(options):
    retval = {}
    for name, value in options.items():
        if name in ('key', 'startkey', 'endkey', 'include_docs') \
                or not isinstance(value, basestring):
            value = json.dumps(value, allow_nan=False, ensure_ascii=False)
        retval[name] = value
    return retval


class CouchDB(paisley.CouchDB):
    _has_adbs = None # does this couch support the old _all_docs_by_seq api?
    def __init__(self, host, port=5984, dbName=None, username=None, password=None):
        paisley.CouchDB.__init__(self, host, port, dbName)
        self.username = username
        self.password = password

    def _getPage(self, uri, **kwargs):
        """
        C{getPage}-like.
        """
        url = self.url_template % (uri,)
        kwargs["headers"] = headers = {"Accept": "application/json"}
        if self.username:
            auth = base64.b64encode(self.username + ":" + self.password)
            headers["Authorization"] = "Basic " + auth
        factory = HTTPClientFactory(url, **kwargs)
        reactor.connectTCP(self.host, self.port, factory)
        return factory.deferred


    def postob(self, uri, ob):
        # This seems to not use keep-alives etc where using twisted.web
        # directly does?
        body = json.dumps(ob, allow_nan=False,
                          ensure_ascii=False).encode('utf-8')
        return self.post(uri, body)

    #def openView(self, *args, **kwargs):
        # paisley doesn't handle encoding options...
        #return super(CouchDB, self).openView(*args, **_encode_options(kwargs)
        #                )
        # Ack - couch 0.9 view syntax...
    def openView(self, dbName, docId, viewId, **kwargs):
        #uri = "/%s/_view/%s/%s" % (dbName, docId, viewId)
        uri = "/%s/_design/%s/_view/%s" % (dbName, docId, viewId)

        opts = kwargs.copy()
        if 'keys' in opts:
            requester = self.post
            body_ob = {'keys': opts.pop('keys')}
            # json.dumps() will return unicode if unicode passed in, which
            # twisted gets upset with.
            body = json.dumps(body_ob, allow_nan=False, ensure_ascii=False)
            if isinstance(body, unicode):
                body = body.encode('utf-8')
            xtra = (body,)
        else:
            requester = self.get
            xtra = ()
        args = _encode_options(opts)
        if args:
            uri += "?%s" % (urlencode(args),)
        return requester(uri, *xtra
            ).addCallback(self.parseResult)

    def openDoc(self, dbName, docId, revision=None, full=False, attachment="",
                attachments=False):
        # paisley appears to use an old api for attachments?
        if attachment:
            uri = "/%s/%s/%s" % (dbName, docId, quote(attachment))
            return  self.get(uri)
        # XXX - hack 'attachments' in...
        if attachments:
            docId += "?attachments=true"
        return super(CouchDB, self).openDoc(dbName, docId, revision, full)

    # This is a potential addition to the paisley API;  It is hard to avoid
    # a hacky workaround due to the use of 'partial' in paisley...
    def saveAttachment(self, dbName, docId, name, data,
                       content_type="application/octet-stream",
                       revision=None):
        """
        Save/create an attachment to a document in a given database.

        @param dbName: identifier of the database.
        @type dbName: C{str}

        @param docId: the identifier of the document.
        @type docId: C{str}

        #param name: name of the attachment
        @type name: C{str}

        @param body: content of the attachment.
        @type body: C{sequence}

        @param content_type: content type of the attachment
        @type body: C{str}

        @param revision: if specified, the revision of the attachment this
                         is updating
        @type revision: C{str}
        """
        # Responses: ???
        # 409 Conflict, 500 Internal Server Error
        url = "/%s/%s/%s" % (dbName, docId, name)
        if revision:
            url = url + '?rev=' + revision
        # *sob* - and I can't use put as it doesn't allow custom headers :(
        # and neither does _getPage!!
        # ** start of self._getPage clone setup...** (plus an import or 2...)
        from twisted.web.client import HTTPClientFactory
        kwargs = {'method': 'PUT',
                  'postdata': data}
        kwargs["headers"] = {"Accept": "application/json",
                             "Content-Type": content_type,
                             }
        factory = HTTPClientFactory(url, **kwargs)
        from twisted.internet import reactor
        reactor.connectTCP(self.host, self.port, factory)
        d = factory.deferred
        # ** end of self._getPage clone **
        d.addCallback(self.parseResult)
        return d

    def updateDocuments(self, dbName, user_docs):
        # update/insert/delete multiple docs in a single request using
        # _bulk_docs
        # from couchdb-python.
        docs = []
        for doc in user_docs:
            if isinstance(doc, dict):
                docs.append(doc)
            elif hasattr(doc, 'items'):
                docs.append(dict(doc.items()))
            else:
                raise TypeError('expected dict, got %s' % type(doc))
        url = "/%s/_bulk_docs" % dbName
        body = json.dumps({'docs': docs})
        return self.post(url, body
                    ).addCallback(self.parseResult
                    )

    def feedContinuousChanges(self, dbName, sink, **kw):
        """Interface to the _changes feed.
        """
        uri = "/%s/_changes" % (dbName,)
        assert 'feed' not in kw, kw
        kw['feed'] = 'continuous'
        # suck the kwargs in
        args = _encode_options(kw)
        if args:
            uri += "?%s" % (urlencode(args),)

        factory = ChangesFactory(uri)
        factory.change_sink = sink
        reactor.connectTCP(self.host, self.port, factory)
        return factory.deferred

    def listChanges(self, dbName, **kw):
        """Interface to the _changes feed.
        """
        # XXX - this need more work to better support feed=continuous - in
        # that case we need to process the response by line, rather than in
        # its entirity as done here and everywhere else...
        uri = "/%s/_changes" % (dbName,)
        # suck the kwargs in
        args = _encode_options(kw)
        if args:
            uri += "?%s" % (urlencode(args),)
        return self.get(uri
                ).addCallback(self.parseResult)
        
    def listDocsBySeq_Orig(self, dbName, **kw):
        """
        List all documents in a given database by the document's sequence number
        """
        # Response:
        # {"total_rows":1597,"offset":0,"rows":[
        # {"id":"test","key":1,"value":{"rev":"4104487645"}},
        # {"id":"skippyhammond","key":2,"value":{"rev":"121469801"}},
        # ...
        uri = "/%s/_all_docs_by_seq" % (dbName,)
        # suck the kwargs in
        args = _encode_options(kw)
        if args:
            uri += "?%s" % (urlencode(args),)
        return self.get(uri
            ).addCallback(self.parseResult)


    @defer.inlineCallbacks
    def listDocsBySeq_Changes(self, dbName, **kw):
        """
        List all documents in a given database by the document's sequence 
        number using the _changes API.

        Transforms the results into what the old _all_docs_by_seq API
        returned, but ultimately this needs to die and move exclusively
        with the new API and new result format.
        """
        kwuse = kw.copy()
        if 'startkey' in kwuse:
            kwuse['since'] = kwuse.pop('startkey')

        result = yield self.listChanges(**kwuse)
        # convert it back to the 'old' format.
        rows = []
        for seq in result['results']:
            last_change = seq['changes'][-1]
            row = {'id': seq['id'],
                   'key': seq['seq'],
                   'value': last_change, # has 'rev'
                  }
            if 'doc' in seq:
                row['doc'] = seq['doc']
            rows.append(row)
        defer.returnValue({'rows': rows})

    @defer.inlineCallbacks
    def listDocsBySeq(self, dbName, **kw):
        # determine what API we should use.  Note that even though _changes
        # appeared in 0.10, support for 'limit=' didn't appear until 0.11 - 
        # after _all_docs_by_seq was removed.  So we must use _all_docs_by_seq
        # if it exists.
        if self._has_adbs is None:
            try:
                ret = yield self.listDocsBySeq_Orig(dbName, **kw)
                self._has_adbs = True
                defer.returnValue(ret)
            except twisted.web.error.Error, exc:
                if exc.status != '404':
                    raise
                self._has_adbs = False
        if self._has_adbs:
            ret = yield self.listDocsBySeq_Orig(dbName, **kw)
        else:
            ret = yield self.listDocsBySeq_Changes(dbName, **kw)
        defer.returnValue(ret)

    # Hack so our new bound methods work.
    def bindToDB(self, dbName):
        super(CouchDB, self).bindToDB(dbName)
        partial = paisley.partial # it works hard to get this!
        for methname in ["saveAttachment", "updateDocuments",
                         "listDocsBySeq", "listChanges",
                         "feedContinuousChanges"]:
            method = getattr(self, methname)
            newMethod = partial(method, dbName)
            setattr(self, methname, newMethod)

    # *sob* - base class has no 'endkey' - plus I've renamed the param from
    # 'startKey' to 'startkey' so the same param is used with the other
    # functions which take **kw...
    # AND support for keys/POST
    def listDoc(self, dbName, **kw):
        """
        List all documents in a given database.
        """
        # Responses: {u'rows': [{u'_rev': -1825937535, u'_id': u'mydoc'}],
        # u'view': u'_all_docs'}, 404 Object Not Found
        uri = "/%s/_all_docs" % (dbName,)
        opts = kw.copy()
        if 'keys' in opts:
            requester = self.post
            body_ob = {'keys': opts.pop('keys')}
            body = json.dumps(body_ob, allow_nan=False, ensure_ascii=False)
            xtra = (body,)
        else:
            requester = self.get
            xtra = ()
        args = _encode_options(opts)
        if args:
            uri += "?%s" % (urlencode(args),)
        return requester(uri, *xtra
            ).addCallback(self.parseResult)

# A custom factory for a 'continious' _changes feed.  I'm sure this could
# be done better...
class ChangesProtocol(HTTPPageGetter):
    inBody = False
    def lineReceived(self, line):
        if self.firstLine:
            return HTTPPageGetter.lineReceived(self, line)
        if not self.inBody:
            if line: # still a header line
                return HTTPPageGetter.lineReceived(self, line)
            self.inBody = True
            # json from couch uses \n delims.
            self.delimiter = '\n'
            self.factory.deferred.callback(self.transport.loseConnection)
            return

        self.handleChange(json.loads(line))

    def handleChange(self, change):
        cs = self.factory.change_sink 
        if cs is not None:
            cs(self, change)

    def connectionLost(self, reason):
        # don't call base-class as it calls our deferred.
        if not self.quietLoss:
            http.HTTPClient.connectionLost(self, reason)

class ChangesFactory(HTTPClientFactory):
    protocol = ChangesProtocol
    change_sink = None # function called with each _changes row.
