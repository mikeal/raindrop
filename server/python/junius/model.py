import sys
import logging
import time
from urllib import urlencode, quote
import base64

import twisted.web.error
from twisted.internet import defer
from twisted.python.failure import Failure

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


def encode_proto_id(proto_id):
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

    def openView(self, *args, **kwargs):
        # paisley doesn't handle encoding options...
        return super(CouchDB, self).openView(*args, **_encode_options(kwargs)
                        )

    def openDoc(self, dbName, docId, revision=None, full=False, attachment=""):
        # paisley appears to use an old api for attachments?
        if attachment:
            uri = "/%s/%s/%s" % (dbName, docId, attachment)
            return  self.get(uri)
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

    def listDocsBySeq(self, dbName, reverse=False, startKey=0, limit=-1, **kw):
        """
        List all documents in a given database by the document's sequence number
        """
        # Response:
        # {"total_rows":1597,"offset":0,"rows":[
        # {"id":"test","key":1,"value":{"rev":"4104487645"}},
        # {"id":"skippyhammond","key":2,"value":{"rev":"121469801"}},
        # ...
        uri = "/%s/_all_docs_by_seq" % (dbName,)
        args = {}
        if reverse:
            args["reverse"] = "true"
        if startKey > 0:
            args["startkey"] = int(startKey)
        if limit >= 0:
            args["limit"] = int(limit)
        # suck the rest of the kwargs in
        args.update(_encode_options(kw))
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

def quote_id(doc_id):
    return quote(doc_id, safe="")

class DocumentModel(object):
    """The layer between 'documents' and the 'database'.  Responsible for
       creating the unique ID for each document (other than the raw document),
       for fetching documents based on an ID, etc
    """
    def __init__(self, db):
        self.db = db

    def open_view(self, *args, **kwargs):
        # A convenience method for completeness so consumers don't hit the
        # DB directly (and to give a consistent 'style').  Is it worth it?
        return self.db.openView(*args, **kwargs)

    def open_attachment(self, doc_id, attachment, **kw):
        """Open an attachment for the given docID.  As this is generally done
        when processing the document itself, so the raw ID of the document
        itself is known.  For this reason, a docid rather than the parts is
        used.
        """
        return self.db.openDoc(quote_id(doc_id), attachment=attachment, **kw
                    ).addBoth(self._cb_doc_opened)

    def open_document(self, category, proto_id, ext_type, **kw):
        """Open the specific document, returning None if it doesn't exist"""
        docid = '%s!%s!%s' % (category, encode_proto_id(proto_id), ext_type)
        return self.open_document_by_id(docid, **kw)

    def open_document_by_id(self, doc_id, **kw):
        """Open a document by the already constructed docid"""
        logger.debug("attempting to open document %r", doc_id)
        return self.db.openDoc(quote_id(doc_id), **kw
                    ).addBoth(self._cb_doc_opened)

    def _cb_doc_opened(self, result):
        if isinstance(result, Failure):
            result.trap(twisted.web.error.Error)
            if result.value.status != '404': # not found
                result.raiseException()
            result = None # indicate no doc exists.
        return result

    def _prepare_raw_doc(self, account, docid, doc, doc_type):
        assert '_id' not in doc, doc # that isn't how you specify the ID.
        doc['_id'] = docid
        assert 'raindrop_account' not in doc, doc # we look after that!
        doc['raindrop_account'] = account.details['_id']

        assert 'type' not in doc, doc # we look after that!
        doc['type'] = doc_type

        assert 'raindrop_seq' not in doc, doc # we look after that!
        doc['raindrop_seq'] = get_seq()

    def create_raw_documents(self, account, doc_infos):
        """Entry-point to create raw documents.  The API reflects that
        creating multiple documents in a batch is faster; if you want to
        create a single doc, just put it in a list
        """
        docs = []
        dids = [] # purely for the log :(
        logger.debug('create_raw_documents preparing %d docs', len(doc_infos))
        for (proto_id, doc, doc_type) in doc_infos:
            docid = 'msg!%s!%s' % (encode_proto_id(proto_id), doc_type)
            self._prepare_raw_doc(account, docid, doc, doc_type)
            # XXX - this hardcoding is obviously going to be a problem when
            # we need to add 'contacts' etc :(
            docs.append(doc)
            dids.append(docid)
        attachments = self._prepare_attachments(docs)
        logger.debug('create_raw_documents saving docs %s', dids)
        return self.db.updateDocuments(docs
                    ).addCallback(self._cb_saved_docs, attachments
                    )

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
            assert '_id' in doc # should have called prepare_ext_document!
            try:
                all_attachments.append(doc['_attachments'])
                # nuke attachments specified
                del doc['_attachments']
            except KeyError:
                # It is important we put 'None' here so the list of
                # attachments is exactly parallel with the list of docs.
                all_attachments.append(None)
        assert len(all_attachments)==len(docs)
        return all_attachments

    def prepare_ext_document(self, rootdocid, doc_type, doc):
        """Called by extensions to setup the raindrop maintained attributes
           of the documents, including the document ID
        """
        assert '_id' not in doc, doc # We manage IDs for all but 'raw' docs.
        assert 'type' not in doc, doc # we manage this too!
        assert 'raindrop_seq' not in doc, doc # we look after that!
        doc['raindrop_seq'] = get_seq()
        doc['type'] = doc_type
        doc['_id'] = "msg!" + rootdocid + "!" + doc['type'] # docs ids need more thought...

    def create_ext_documents(self, docs):
        for doc in docs:
            assert '_id' in doc # should have called prepare_ext_document!
        attachments = self._prepare_attachments(docs)
        # save the document.
        logger.debug('saving %d extension documents', len(docs))
        return self.db.updateDocuments(docs,
                    ).addCallback(self._cb_saved_docs, attachments
                    )

    def _cb_saved_docs(self, result, attachments):
        # result: {'ok': True, 'new_revs': [{'rev': 'xxx', 'id': '...'}, ...]}
        logger.debug("saved multiple docs with result=%(ok)s", result)
        ds = []
        for dinfo, dattach in zip(result['new_revs'], attachments):
            if dattach:
                ds.append(self._cb_save_attachments(dinfo, dattach))
        def return_orig(ignored_result):
            return result
        # XXX - the result set will *not* have the correct _rev if there are
        # attachments :(
        return defer.DeferredList(ds
                    ).addCallback(return_orig)

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
        return self.db.saveAttachment(quote_id(docid),
                                   quote_id(name), info['data'],
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
        logger.error("Failed to save attachment (%r): %s", what, ids, failure)
        failure.raiseException()


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
