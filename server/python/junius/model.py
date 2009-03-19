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
from junius.config import get_config


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
        # *sob* - and it also doesn't handle encoding options...
        return super(CouchDB, self).openView(*args, **_encode_options(kwargs)
                        ).addCallback(_raw_to_rows)

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

    def open_document(self, doc_id):
        """Open the specific extension's document for the given ID"""
        doc_id = urllib.quote(doc_id, safe="")
        return self.db.openDoc(doc_id).addBoth(self._cb_doc_opened)

    def _cb_doc_opened(self, result):
        if isinstance(result, Failure):
            result.trap(twisted.web.error.Error)
            if result.value.status != '404': # not found
                result.raiseException()
            result = None # indicate no doc exists.
        return result

    def create_raw_document(self, doc, doc_type, account):
        assert '_id' in doc, doc # gotta give us an ID!
        assert 'raindrop_account' not in doc, doc # we look after that!
        doc['raindrop_account'] = account.details['_id']

        assert 'type' not in doc, doc # we look after that!
        doc['type'] = doc_type

        assert 'raindrop_seq' not in doc, doc # we look after that!
        doc['raindrop_seq'] = get_seq()

        # save the document.
        return self.db.saveDoc(doc, docId=doc['_id'],
                    ).addCallback(self._cb_saved_document
                    ).addErrback(self._cb_save_failed
                    )

    def _cb_saved_document(self, result):
        logger.debug("Saved message %s", result)
        # XXX - now what?

    def _cb_save_failed(self, failure):  
        logger.error("Failed to save message: %s", failure)
        failure.raiseException()

    def create_ext_document(self, doc, ext, rootdocId):
        assert '_id' not in doc, doc # We manage IDs for all but 'raw' docs.
        assert 'raindrop_seq' not in doc, doc # we look after that!
        doc['raindrop_seq'] = get_seq()
        doc['type'] = ext
        docid = rootdocId + "!" + urllib.quote(ext, safe='') # XXX - this isn't right??
        # save the document.
        logger.debug('saving extension document %r as %s', docid, doc)
        return self.db.saveDoc(doc, docId=docid,
                    ).addCallback(self._cb_saved_document
                    ).addErrback(self._cb_save_failed
                    )

    def get_last_ext_for_document(self, doc_id):
        """Given a base docid, find the most-recent extension to have run.
        This will differ from the latest extension in the document chain if
        the document chain has been 'reset' for any reason (eg, change
        detected at the source of the message, user adding annotations, etc)
        """
        startkey = [doc_id]
        endkey = [doc_id, 99999999999999]
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
    # for now all we look for is the views.
    ret = {}
    try:
        views = os.listdir(os.path.join(ddir, 'views'))
    except OSError:
        logger.warning("document directory %r has no 'views' subdirectory - skipping this document", ddir)
        return ret

    ret_views = ret['views'] = {}
    for view_name in views:
        view_dir = os.path.join(ddir, 'views', view_name)
        if not os.path.isdir(view_dir):
            logger.info("skipping view non-directory: %s", view_dir)
            continue
        try:
            f = open(os.path.join(view_dir, 'map.js'))
            try:
                ret_views[view_name] = {'map': f.read()}
            finally:
                f.close()
        except (OSError, IOError):
            logger.warning("can't open map.js in view directory %r - skipping this view", view_dir)
            continue
        try:
            f = open(os.path.join(view_dir, 'reduce.js'))
            ret_views[view_name]['reduce'] = f.read()
            f.close()
        except (OSError, IOError):
            # no reduce - no problem...
            logger.debug("no reduce.js in '%s' - skipping reduce for this view", view_dir)
            continue
    logger.info("Document in directory %r has views %s", ddir, ret_views.keys())
    if not ret_views:
        logger.warning("Document in directory %r appears to have no views", ddir)
    return ret


def generate_designs_from_filesystem(root):
    # This is pretty dumb (but therefore simple).
    # root/* -> directories used purely for a 'namespace'
    # root/*/* -> directories which hold the contents of a document.
    # root/*/*/views -> directory holding views for the document
    # root/*/*/views/* -> directory for each named view.
    # root/*/*/views/*/map.js|reduce.js -> view content
    logger.debug("Starting to build design documents from %r", root)
    for top_name in os.listdir(root):
        fq_child = os.path.join(root, top_name)
        if not os.path.isdir(fq_child):
            logger.debug("skipping non-directory: %s", fq_child)
            continue
        # hack for debugging - rename a dir to end with .ignore...
        if fq_child.endswith('.ignore'):
            logger.info("skipping .ignored directory: %s", fq_child)
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
            # XXX - *sob* - and that we can't use '/' in the doc ID at the moment...
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
