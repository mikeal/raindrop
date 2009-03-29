import sys
import os
import logging
import time
import urllib

import twisted.web.error
from twisted.internet import defer
from twisted.python.failure import Failure

try:
    import simplejson as json
except ImportError:
    import json # Python 2.6

import paisley
from couchdb import schema
from .config import get_config


config = get_config()

class _NotSpecified:
    pass

logger = logging.getLogger('model')

DBs = {}

# XXXX - this relies on couch giving us some kind of 'sequence id'.  For
# now we use a timestamp, but that obviously sucks in many scenarios.
if sys.platform=='win32':
    # woeful resolution on windows and equal timestamps are bad.
    clock_start = time.time()
    time.clock() # time.clock starts counting from zero the first time its called.
    def get_seq():
        return clock_start + time.clock()
else:
    get_seq = time.time()


def _raw_to_rows(raw):
    # {'rows': [], 'total_rows': 0} -> the actual rows.
    ret = raw['rows']
    # hrmph - on a view with start_key etc params, total_rows will be
    # greater than the rows.
    assert 'total_rows' not in raw or len(ret)<=raw['total_rows'], raw
    return ret

# from the couchdb package; not sure what makes these names special...
def _encode_options(options):
    retval = {}
    for name, value in options.items():
        if name in ('key', 'startkey', 'endkey') \
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
        # The base class of this returns the raw json object - eg:
        # {'rows': [], 'total_rows': 0}
        # XXX - Note that paisley isn't interested in this enhancement, so
        # we need to remove it...

        # *sob* - and it also doesn't handle encoding options...
        return super(CouchDB, self).openView(*args, **_encode_options(kwargs)
                        ).addCallback(_raw_to_rows)

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

    # Hack so our new bound methods work.
    def bindToDB(self, dbName):
        super(CouchDB, self).bindToDB(dbName)
        partial = paisley.partial # it works hard to get this!
        for methname in ["saveAttachment", "updateDocuments"]:
            method = getattr(self, methname)
            newMethod = partial(method, dbName)
            setattr(self, methname, newMethod)


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
    return urllib.quote(doc_id, safe="")

class DocumentModel(object):
    """The layer between 'documents' and the 'database'.  Responsible for
       creating the unique ID for each document (other than the raw document),
       for fetching documents based on an ID, etc
    """
    def __init__(self, db):
        self.db = db

    def open_document(self, doc_id, **kw):
        """Open the specific document, returning None if it doesn't exist"""
        return self.db.openDoc(quote_id(doc_id), **kw).addBoth(self._cb_doc_opened)

    def _cb_doc_opened(self, result):
        if isinstance(result, Failure):
            result.trap(twisted.web.error.Error)
            if result.value.status != '404': # not found
                result.raiseException()
            result = None # indicate no doc exists.
        return result

    def _prepare_raw_doc(self, account, docid, doc, doc_type):
        assert '_id' not in doc, doc # that isn't how you specify the ID.
        assert '!' not in docid, docid # these chars are special.
        assert 'raindrop_account' not in doc, doc # we look after that!
        doc['raindrop_account'] = account.details['_id']

        assert 'type' not in doc, doc # we look after that!
        doc['type'] = doc_type

        assert 'raindrop_seq' not in doc, doc # we look after that!
        doc['raindrop_seq'] = get_seq()

    def create_raw_documents(self, account, doc_infos):
        """A high-performance version of 'create_raw_document', but doesn't
        support attachments yet."""
        docs = []
        dids = [] # purely for the log :(
        logger.debug('create_raw_documents preparing %d docs', len(doc_infos))
        for (docid, doc, doc_type) in doc_infos:
            self._prepare_raw_doc(account, docid, doc, doc_type)
            # in a bulk-update, the ID is in the doc itself.
            doc['_id'] = docid
            docs.append(doc)
            dids.append(docid)
        logger.debug('create_raw_documents saving docs %s', dids)
        return self.db.updateDocuments(docs
                    ).addCallback(self._cb_saved_multi_docs,
                    ).addErrback(self._cb_save_multi_failed,
                    )

    def _cb_saved_multi_docs(self, result):
        # result: {'ok': True, 'new_revs': [{'rev': 'xxx', 'id': '...'}, ...]}
        logger.debug("saved multiple docs with result=%(ok)s", result)
        return result

    def _cb_save_multi_failed(self, failure):
        logger.error("Failed to save lotsa docs: %s", failure)
        failure.raiseException()

    def create_raw_document(self, account, docid, doc, doc_type):
        self._prepare_raw_doc(account, docid, doc, doc_type)
        # XXX - attachments need more thought - ultimately we need to be able
        # to 'push' them via a generator or similar to avoid reading them
        # entirely in memory.  Further, we need some way of the document
        # knowing if the attachment failed (or vice-versa) given we have
        # no transactional semantics.
        # fixup attachments.
        try:
            attachments = doc['_attachments']
            # nuke attachments specified
            del doc['_attachments']
        except KeyError:
            attachments = None

        # save the document.
        logger.debug('create_raw_document saving doc %r', docid)
        qid = quote_id(docid)
        return self.db.saveDoc(doc, docId=qid,
                    ).addCallback(self._cb_saved_document, 'raw-message', docid
                    ).addErrback(self._cb_save_failed, 'raw-message', docid
                    ).addCallback(self._cb_save_attachments, attachments
                    )

    def _cb_saved_document(self, result, what, ids):
        logger.debug("Saved %s %s", what, result)
        # XXX - now what?
        return result

    def _cb_save_failed(self, failure, what, ids):
        logger.error("Failed to save %s (%r): %s", what, ids, failure)
        failure.raiseException()

    def prepare_ext_document(self, rootdocid, doc_type, doc):
        assert '_id' not in doc, doc # We manage IDs for all but 'raw' docs.
        assert 'type' not in doc, doc # we manage this too!
        assert 'raindrop_seq' not in doc, doc # we look after that!
        doc['raindrop_seq'] = get_seq()
        doc['type'] = doc_type
        doc['_id'] = rootdocid + "!" + doc['type'] # docs ids need more thought...

    def create_ext_documents(self, rootdocid, docs):
        # Attachments are all done separately.  We could optimize this -
        # eg, attachments under a certain size could go in the doc itself,
        # saving a request but costing a base64 encode.
        all_attachments = []
        for doc in docs:
            assert '_id' in doc # should have called prepare_ext_document!
            try:
                all_attachments.append(doc['_attachments'])
                # nuke attachments specified
                del doc['_attachments']
            except KeyError:
                all_attachments.append(None)

        # save the document.
        logger.debug('saving %d extension documents for %r', len(docs), rootdocid)
        return self.db.updateDocuments(docs,
                    ).addCallback(self._cb_saved_ext_docs, all_attachments
                    )

    def _cb_saved_ext_docs(self, result, attachments):
        # result: {'ok': True, 'new_revs': [{'rev': 'xxx', 'id': '...'}, ...]}
        logger.debug("saved multiple docs with result=%(ok)s", result)
        ds = []
        for dinfo, dattach in zip(result['new_revs'], attachments):
            if dattach:
                ds.append(self._cb_save_attachments(dinfo, dattach))
        return defer.DeferredList(ds)

    def _cb_save_attachments(self, saved_doc, attachments):
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
                ).addCallback(self._cb_saved_document, 'attachment', (docid, name)
                ).addErrback(self._cb_save_failed, 'attachment', (docid, name)
                ).addCallback(self._cb_save_next_attachment, remaining
                )

    def get_last_ext_for_document(self, doc_id):
        """Given a base docid, find the most-recent extension to have run.
        This will differ from the latest extension in the document chain if
        the document chain has been 'reset' for any reason (eg, change
        detected at the source of the message, user adding annotations, etc)
        """
        startkey = [doc_id]
        endkey = [doc_id, {}]
        return self.db.openView('raindrop!messages!workqueue',
                                'by_doc_extension_sequence',
                                startkey=startkey, endkey=endkey
                    ).addCallback(self._cb_des_opened, doc_id)

    def _cb_des_opened(self, rows, doc_id):
        if not rows:
            ret = None, None
        else:
            last = rows[-1]
            ret = last["value"], last["id"]
        logger.debug("document '%s' has last-extension of %r", doc_id, ret)
        return ret

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

    def _created_ok(d):
        logger.info("created new database")
        return _update_views(d)

    return db.createDB(dbinfo['name']
                ).addCallbacks(_created_ok, _create_failed
                )
