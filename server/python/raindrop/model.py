import sys
import logging
import time
from urllib import urlencode, quote
import base64

import twisted.web.error
from twisted.internet import defer
from twisted.python.failure import Failure
from twisted.internet.task import coiterate

try:
    import simplejson as json
except ImportError:
    import json # Python 2.6

import paisley
from .config import get_config


config = get_config()

class _NotSpecified:
    pass

logger = logging.getLogger('model')

DBs = {}

class DocumentSaveError(Exception):
    pass

class DocumentOpenError(Exception):
    pass

# XXXX - this relies on couch giving us some kind of 'sequence id'.  For
# now we use a timestamp, but that obviously sucks in many scenarios.
if sys.platform == 'win32':
    # woeful resolution on windows and equal timestamps are bad.
    clock_start = time.time()
    time.clock() # time.clock starts counting from zero the first time its called.
    def get_seq():
        return clock_start + time.clock()
else:
    get_seq = time.time

# A list of 'schemas' that want their values expanded by the megaview.
# Intent is that this will come from metadata about the schema - ie, from
# the couch doc that holds the schema definition.
# For now it is hard-coded.
megaview_schemas_expandable_values = {
    'rd.tags' : ['tags'],
    'rd.identity.contacts' : ['contacts'],
}

def encode_provider_id(proto_id):
    # a 'protocol' gives us a 'blob' used to identify the document; we create
    # a real docid from that protocol_id; we base64-encode what was given to
    # us to avoid the possibility of a '!' char, and also to better accomodate
    # truly binary strings (eg, a pickle or something bizarre)
    return base64.encodestring(proto_id).replace('\n', '')


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

    def listDocsBySeq(self, dbName, **kw):
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

    # Hack so our new bound methods work.
    def bindToDB(self, dbName):
        super(CouchDB, self).bindToDB(dbName)
        partial = paisley.partial # it works hard to get this!
        for methname in ["saveAttachment", "updateDocuments",
                         "listDocsBySeq"]:
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


# XXX - get_db should die as a global/singleton - only our DocumentModel
# instance should care about that.  Sadly, bootstrap.py is a (small; later)
# problem here...
def get_db(couchname="local", dbname=_NotSpecified):
    dbinfo = config.couches[couchname]
    if dbname is _NotSpecified:
        dbname = dbinfo['name']
    key = couchname, dbname
    try:
        return DBs[key]
    except KeyError:
        pass
    logger.info("Connecting to couchdb at %s", dbinfo)
    db = CouchDB(dbinfo['host'], dbinfo['port'], dbname)
    DBs[key] = db
    return db

class DocumentModel(object):
    """The layer between 'documents' and the 'database'.  Responsible for
       creating the unique ID for each document (other than the raw document),
       for fetching documents based on an ID, etc
    """
    def __init__(self, db):
        self.db = db
        self._new_item_listeners = []
        self._important_views = None # views we update periodically

    def listen_new_items(self, listener):
        assert listener not in self._new_item_listeners # already listening?
        self._new_item_listeners.append(listener)

    def unlisten_new_items(self, listener):
        self._new_item_listeners.remove(listener)

    @classmethod
    def quote_id(cls, doc_id):
        # couch doesn't mind '!' or '=' and makes reading logs etc easier
        return quote(doc_id, safe="!=")

    def open_view(self, docId='raindrop!content!all', viewId='megaview',
                  *args, **kwargs):
        logger.debug("attempting to open view %s/%s - %r %r",
                     docId, viewId, args, kwargs)
        return self.db.openView(docId, viewId, *args, **kwargs)

    @defer.inlineCallbacks
    def open_documents_by_id(self, doc_ids):
        """Open documents by the already constructed docid"""
        logger.debug("attempting to open documents %r", doc_ids)
        results = yield self.db.listDoc(keys=doc_ids, include_docs=True)
        rows = results['rows']
        assert len(rows)==len(doc_ids)
        ret = []
        for row in rows:
            if 'error' in row:
                if row['error']=='missing':
                    logger.debug("document %r does not exist", row['key'])
                    ret.append(None)
                else:
                    raise DocumentOpenError(row['error'])
            else:
                logger.debug("opened document %(_id)r at revision %(_rev)s",
                             row['doc'])
                ret.append(row['doc'])
        defer.returnValue(ret)

    def get_doc_id_for_schema_item(self, si):
        """Returns an *unquoted* version of the doc ID"""
        key_type, key_val = si['rd_key']
        enc_key_val = encode_provider_id(json.dumps(key_val))
        key_part = "%s.%s" % (key_type, enc_key_val)
        sch_id = si['schema_id']
        # only use the extension_id when items were provided (ie, its not
        # an 'exists' schema.)
        if si['items'] is None:
            assert sch_id.endswith('.exists'), sch_id
            ext_id = ''
        else:
            ext_id = si['ext_id']
        bits = ['rc', key_part, ext_id, sch_id]
        return "!".join(bits)

    def create_schema_items(self, item_defs):
        docs = []
        for si in item_defs:
            doc = {}
            schema_id = si.get('schema_id')
            assert schema_id  # schema-id not optional.
            items = si['items'] # items not optional - but may be None
            if items is None:
                # None presumably means an 'exists' schema ID - assert for
                # now incase it helps detect confusion...
                assert schema_id.endswith(".exists"), schema_id
            elif not items:
                logger.warning("Got an empty schema - ignoring!")
                continue
            else:
                doc.update(si['items'])
            docs.append(doc)
            # If the extension needs to update an existing record it must
            # give _rev.
            # NOTE: _id doesn't need quoting when used via a PUT...
            if '_id' in si:
                # XXXX - remove this - don't force them to specify the _id!!
                # there is no way it can ever be different!!
                id = si['_id']
                assert id == self.get_doc_id_for_schema_item(si)
            else:
                id = self.get_doc_id_for_schema_item(si)
            if '_rev' in si:
                doc['_rev'] = si['_rev']
            doc['_id'] = id
            doc['rd_key'] = si['rd_key']
            # always emit rd_source - an explicit NULL means this is a
            # 'source' doc
            doc['rd_source'] = si.get('rd_source')
            doc['rd_ext_id'] = si['ext_id']
            doc['rd_schema_id'] = schema_id
            if 'confidence' in si:
                doc['rd_schema_confidence'] = si['confidence']
            try:
                doc['rd_megaview_expandable'] = \
                        megaview_schemas_expandable_values[schema_id]
            except KeyError:
                pass

        attachments = self._prepare_attachments(docs)
        logger.debug('create_schema_items saving %d docs', len(docs))
        return self.db.updateDocuments(docs
                    ).addCallback(self._cb_saved_docs, item_defs, attachments
                    )

    @defer.inlineCallbacks
    def open_schemas(self, rd_key, schema_id):
        key_type, key_val = rd_key
        enc_key_val = encode_provider_id(json.dumps(key_val))
        key_part = "%s.%s" % (key_type, enc_key_val)
        sk = "rc!" + key_part + "!"
        ek = sk[:-1] + '#' # '#' sorts later than '!'

        ret = []
        result = yield self.db.listDoc(startkey=sk,
                                       endkey=ek,
                                       include_docs=True)
        for r in result['rows']:
            _, _, ext, sch_id = r['id'].split('!', 4)
            if sch_id == schema_id:
                ret.append(r['doc'])
        defer.returnValue(ret)

    def _prepare_attachments(self, docs):
        # called internally when creating a batch of documents. Returns a list
        # of attachments which should be saved separately.

        # The intent is that later we can optimize this - if the attachment
        # is small, we can keep it in the document base64 encoded and save
        # a http connection.  For now though we just do all attachments
        # separately.

        # attachment processing still need more thought - ultimately we need
        # to be able to 'push' them via a generator or similar to avoid
        # reading them entirely in memory. Further, we need some way of the
        # document knowing if the attachment failed (or vice-versa) given we
        # have no transactional semantics.
        all_attachments = []
        for doc in docs:
            assert '_id' in doc
            try:
                this_attach = doc['_attachments']
                total_bytes = 0
                for a in this_attach.values():
                    total_bytes += len(a['data'])
                if total_bytes > 100000: # pulled from a hat!
                    # nuke attachments specified
                    del doc['_attachments']
                    all_attachments.append(this_attach)
                else:
                    # base64-encode in place...
                    for a in this_attach.values():
                        a['data'] = base64.encodestring(a['data']).replace('\n', '')
                   
                    all_attachments.append(None)
            except KeyError:
                # It is important we put 'None' here so the list of
                # attachments is exactly parallel with the list of docs.
                all_attachments.append(None)
        assert len(all_attachments)==len(docs)
        return all_attachments

    def _cb_saved_docs(self, result, item_defs, attachments):
        # result: [{'rev': 'xxx', 'id': '...'}, ...]
        logger.debug("saved %d documents", len(result))
        ds = []
        assert len(result)==len(attachments) and len(result)==len(item_defs)
        new_items = []
        for dinfo, dattach, item_def in zip(result, attachments, item_defs):
            if 'error' in dinfo:
                # If no 'schema_id' was specified then this is OK - the
                # extension is just noting the ID exists and it already does.
                if dinfo.get('error')=='conflict' and item_def['items'] is None:
                    logger.debug('ignoring conflict error when asserting %r exists',
                                 dinfo['id'])
                else:
                    # presumably an unexpected error :(
                    raise DocumentSaveError(dinfo)
            else:
                # Give the ID and revision info back incase they need to
                # know...
                item_def['_id'] = dinfo['id']
                # XXX - is this correct when there are attachments?
                item_def['_rev'] = dinfo['rev']
                new_items.append(item_def)

            if dattach:
                ds.append(self._cb_save_attachments(dinfo, dattach))

        # If anyone is listening for new items, call them now.
        for listener in self._new_item_listeners:
            ds.append(defer.maybeDeferred(listener, new_items))

        def return_orig(dl_results):
            for ok, real_ret in dl_results:
                if not ok:
                    real_ret.raiseException()
            return result
        # XXX - the result set will *not* have the correct _rev if there are
        # attachments :(
        return defer.DeferredList(ds
                    ).addBoth(return_orig)

    def _cb_save_attachments(self, saved_doc, attachments):
        if not attachments:
            return saved_doc
        # Each time we save an attachment the doc gets a new revision number.
        # So we need to do them in a chain, passing the result from each to
        # the next.
        remaining = attachments.copy()
        # This is recursive, but that should be OK.
        return self._cb_save_next_attachment(saved_doc, remaining)

    def _cb_save_next_attachment(self, result, remaining):
        if not remaining:
            return result
        revision = result['rev']
        docid = result['id']
        name, info = remaining.popitem()
        logger.debug('saving attachment %r to doc %r', name, docid)
        return self.db.saveAttachment(self.quote_id(docid),
                                   self.quote_id(name), info['data'],
                                   content_type=info['content_type'],
                                   revision=revision,
                ).addCallback(self._cb_saved_attachment, (docid, name)
                ).addErrback(self._cb_save_failed, (docid, name)
                ).addCallback(self._cb_save_next_attachment, remaining
                )

    def _cb_saved_attachment(self, result, ids):
        logger.debug("Saved attachment %s", result)
        # XXX - now what?
        return result

    def _cb_save_failed(self, failure, ids):
        logger.error("Failed to save attachment (%r): %s", ids, failure)
        failure.raiseException()

    def _update_important_views(self):
        # Something else periodically updates our important views.
        if not self._important_views:
            # these keys come from jquery.couch.js
            return self.db.listDoc(startkey="_design", endkey="_design0",
                                   include_docs=True,
                                   ).addCallback(self._do_update_views)
        return self._do_update_views(None)

    @defer.inlineCallbacks
    def _do_update_views(self, result):
        if result is not None:
            self._important_views = []
            for row in result['rows']:
                if 'error' in row or 'deleted' in row['value']:
                    continue
                doc_id = row['id'][len('_design/'):]
                self._important_views.append((doc_id, row['doc']['views']))

        # We could use a DeferredList to run them all in parallel, but
        # it might make more sense to run them sequentially so we don't
        # overload the couch while we are still feeding it docs...
        # (However, each view update can run in parallel - so if we have
        # lotsa cores, doing more than 1 at a time makes sense...)
        # As the views are slow we keep some timings and log them at the end...
        logger.info("important view updates starting.")
        slowest = 0
        slowest_info = None, None
        st = time.time()
        for did, vns in self._important_views:
            logger.debug("updating views in %s", did)
            tst = time.time()
            # limit=0 updates without giving us rows.
            for vn in vns:
                _ = yield self.open_view(did, vn, limit=0)
            took = time.time() - tst
            if took > slowest:
                slowest = took
                slowest_info = did, vn
            logger.debug("View in %s updated in %d sec(s)", did, took)
        all_took = int(time.time() - st)
        if all_took:
            logger.info("updated %d view docs in %d secs - slowest was '%s' at %d secs.",
                        len(self._important_views), all_took, slowest_info[0], slowest)

_doc_model = None

def get_doc_model():
    global _doc_model
    if _doc_model is None:
        _doc_model = DocumentModel(get_db())
    return _doc_model

def nuke_db():
    couch_name = 'local'
    db = get_db(couch_name, None)
    dbinfo = config.couches[couch_name]

    def _nuke_failed(failure, *args, **kwargs):
        if failure.value.status != '404':
            failure.raiseException()
        logger.info("DB doesn't exist!")

    def _nuked_ok(d):
        logger.info("NUKED DATABASE!")

    deferred = db.deleteDB(dbinfo['name'])
    deferred.addCallbacks(_nuked_ok, _nuke_failed)
    return deferred



def fab_db(whateva):
    couch_name = 'local'
    db = get_db(couch_name, None)
    dbinfo = config.couches[couch_name]

    def _create_failed(failure, *args, **kw):
        failure.trap(twisted.web.error.Error)
        if failure.value.status != '412': # precondition failed.
            failure.raiseException()
        logger.info("couch database %(name)r already exists", dbinfo)
        return False

    def _created_ok(d):
        logger.info("created new database")
        return True

    return db.createDB(dbinfo['name']
                ).addCallbacks(_created_ok, _create_failed
                )
