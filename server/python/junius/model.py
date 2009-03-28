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

    def create_raw_document(self, docid, doc, doc_type, account, attachments=None):
        assert '_id' not in doc # that isn't how you specify the ID.
        assert '!' not in docid, docid # these chars are special.
        assert 'raindrop_account' not in doc, doc # we look after that!
        doc['raindrop_account'] = account.details['_id']

        assert 'type' not in doc, doc # we look after that!
        doc['type'] = doc_type

        assert 'raindrop_seq' not in doc, doc # we look after that!
        doc['raindrop_seq'] = get_seq()

        # save the document.
        logger.debug('create_raw_document saving doc %r', docid)
        qid = quote_id(docid)
        return self.db.saveDoc(doc, docId=qid,
                    ).addCallback(self._cb_saved_document, 'raw-message', docid
                    ).addErrback(self._cb_save_failed, 'raw-message', docid
                    ).addCallback(self._cb_save_attachments, attachments, qid
                    )

    def _cb_saved_document(self, result, what, ids):
        logger.debug("Saved %s %s", what, result)
        # XXX - now what?
        return result

    def _cb_save_failed(self, failure, what, ids):
        logger.error("Failed to save %s (%r): %s", what, ids, failure)
        failure.raiseException()

    def create_ext_document(self, doc, ext, rootdocId):
        assert '_id' not in doc, doc # We manage IDs for all but 'raw' docs.
        assert 'raindrop_seq' not in doc, doc # we look after that!
        doc['raindrop_seq'] = get_seq()
        doc['type'] = ext
        docid = quote_id(rootdocId + "!" + ext)
        try:
            attachments = doc['_attachments']
            # nuke attachments specified
            del doc['_attachments']
        except KeyError:
            attachments = None

        # save the document.
        logger.debug('saving extension document %r', docid)
        return self.db.saveDoc(doc, docId=docid,
                    ).addCallback(self._cb_saved_document, 'ext-message', docid
                    ).addErrback(self._cb_save_failed, 'ext-message', docid
                    ).addCallback(self._cb_save_attachments, attachments, docid
                    )

    def _cb_save_attachments(self, saved_doc, attachments, docid):
        if not attachments:
            return saved_doc
        # Each time we save an attachment the doc gets a new revision number.
        # So we need to do them in a chain, passing the result from each to
        # the next.
        remaining = attachments.copy()
        # This is recursive, but that should be OK.
        return self._cb_save_next_attachment(saved_doc, docid, remaining)

    def _cb_save_next_attachment(self, result, docid, remaining):
        if not remaining:
            return result
        revision = result['rev']
        name, info = remaining.popitem()
        logger.debug('saving attachment %r to doc %r', name, docid)
        d = self.db.saveAttachment(docid, # already quoted by caller...
                                   quote_id(name), info['data'],
                                   content_type=info['content_type'],
                                   revision=revision,
                ).addCallback(self._cb_saved_document, 'attachment', (docid, name)
                ).addErrback(self._cb_save_failed, 'attachment', (docid, name)
                ).addCallback(self._cb_save_next_attachment, docid, remaining
                )

    def get_last_ext_for_document(self, doc_id):
        """Given a base docid, find the most-recent extension to have run.
        This will differ from the latest extension in the document chain if
        the document chain has been 'reset' for any reason (eg, change
        detected at the source of the message, user adding annotations, etc)
        """
        startkey = [doc_id]
        endkey = [doc_id, {}]
        return self.db.openView('raindrop!messages!by',
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

def _build_doc_from_directory(ddir):
    # all we look for is the views.
    ret = {}
    ret_views = ret['views'] = {}
    # The '-map.js' file is the 'trigger' for creating a view...
    tail = "-map.js"
    rtail = "-reduce.js"
    files = os.listdir(ddir)
    for f in files:
        fqf = os.path.join(ddir, f)
        if f.endswith(tail):
            view_name = f[:-len(tail)]
            try:
                with open(fqf) as f:
                    ret_views[view_name] = {'map': f.read()}
            except (OSError, IOError):
                logger.warning("can't open map file %r - skipping this view", fqf)
                continue
            fqr = os.path.join(ddir, view_name + rtail)
            try:
                with open(fqr) as f:
                    ret_views[view_name]['reduce'] = f.read()
            except (OSError, IOError):
                # no reduce - no problem...
                logger.debug("no reduce file %r - skipping reduce for view '%s'",
                             fqr, view_name)
        else:
            # avoid noise...
            if not f.endswith(rtail) and not f.startswith("."):
                logger.info("skipping non-map/reduce file %r", fqf)

    logger.info("Document in directory %r has views %s", ddir, ret_views.keys())
    if not ret_views:
        logger.warning("Document in directory %r appears to have no views", ddir)
    return ret


def generate_designs_from_filesystem(root):
    # We use the same file-system layout as 'CouchRest' does:
    # http://jchrisa.net/drl/_design/sofa/_show/post/release__couchrest_0_9_0
    # note however that we don't create a design documents in exactly the same
    # way - the view is always named as specified, and currently no 'map only'
    # view is created (and if/when it is, only it will have a "special" name)
    # See http://groups.google.com/group/raindrop-core/web/maintaining-design-docs

    # This is pretty dumb (but therefore simple).
    # root/* -> directories used purely for a 'namespace'
    # root/*/* -> directories which hold the contents of a document.
    # root/*/*-map.js and maybe *-reduce.js -> view content with name b4 '-'
    logger.debug("Starting to build design documents from %r", root)
    for top_name in os.listdir(root):
        fq_child = os.path.join(root, top_name)
        if not os.path.isdir(fq_child):
            logger.debug("skipping non-directory: %s", fq_child)
            continue
        # so we have a 'namespace' directory.
        num_docs = 0
        for doc_name in os.listdir(fq_child):
            fq_doc = os.path.join(fq_child, doc_name)
            if not os.path.isdir(fq_doc):
                logger.info("skipping document non-directory: %s", fq_doc)
                continue
            # have doc - build a dict from its dir.
            doc = _build_doc_from_directory(fq_doc)
            # XXX - note the artificial 'raindrop' prefix - the intent here
            # is that we need some way to determine which design documents we
            # own, and which are owned by extensions...
            # XXX - *sob* - and that we shouldn't use '/' in the doc ID at the
            # moment (well - we probably could if we ensured we quoted all the
            # '/' chars, but that seems too much burden for no gain...)
            doc['_id'] = '_design/' + ('!'.join(['raindrop', top_name, doc_name]))
            yield doc
            num_docs += 1

        if not num_docs:
            logger.info("skipping sub-directory without child directories: %s", fq_child)


def fab_db(update_views=False):
    # XXX - we ignore update_views and always update them.  Its not clear
    # how to hook this in cleanly to twisted (ie, even if update_views is
    # False, we must still do it if the db didn't exist)
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

    def _doc_not_found(failure):
        return None

    def _got_existing_docs(results, docs):
        put_docs = []
        for (whateva, existing), doc in zip(results, docs):
            if existing:
                assert existing['_id']==doc['_id']
                assert '_rev' not in doc
                existing.update(doc)
                doc = existing
            put_docs.append(doc)
        url = '/%(name)s/_bulk_docs' % dbinfo
        ob = {'docs' : put_docs}
        deferred = db.postob(url, ob)
        return deferred

    def _update_views(d):
        schema_src = os.path.abspath(os.path.join(os.path.dirname(__file__),
                                                  "../../../schema"))

        docs = [d for d in generate_designs_from_filesystem(schema_src)]
        logger.info("Found %d documents in '%s'", len(docs), schema_src)
        assert docs, 'surely I have *some* docs!'
        # ack - I need to open existing docs first to get the '_rev' property.
        dl = []
        for doc in docs:
            deferred = get_db().openDoc(doc['_id']).addErrback(_doc_not_found)
            dl.append(deferred)

        return defer.DeferredList(dl
                    ).addCallback(_got_existing_docs, docs)

    d = db.createDB(dbinfo['name'])
    d.addCallbacks(_created_ok, _create_failed)
    if update_views:
        d.addCallback(_update_views)
    return d
