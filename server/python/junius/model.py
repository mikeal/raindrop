import os
import logging

import twisted.web.error
from twisted.internet import defer
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


def _raw_to_rows(raw):
    # {'rows': [], 'total_rows': 0} -> the actual rows.
    ret = raw['rows']
    # hrmph - on a view with start_key etc params, total_rows will be
    # greater than the rows.
    assert len(ret)<=raw['total_rows'], raw
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
        # directly doesn't?
        body = json.dumps(ob, allow_nan=False,
                          ensure_ascii=False).encode('utf-8')
        return self.post(uri, body)

    def openView(self, *args, **kwargs):
        # The base class of this returns the raw json object - eg:
        # {'rows': [], 'total_rows': 0}
        # *sob* - and it also doesn't handle encoding options...
        base_ret = super(CouchDB, self).openView(*args, **_encode_options(kwargs))
        return base_ret.addCallback(_raw_to_rows)


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
            logger.info("can't open map.js in view directory %r - skipping entire document", view_dir)
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
