import os
import logging

import twisted.web.error
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

class CouchDB(paisley.CouchDB):
    def postob(self, uri, ob):
        # This seems to not use keep-alives etc where using twisted.web
        # directly doesn't?
        body = json.dumps(ob, allow_nan=False,
                          ensure_ascii=False).encode('utf-8')
        return self.post(uri, body)


def get_db(couchname="local", dbname=_NotSpecified):
    try:
        return DBs[couchname]
    except KeyError:
        pass
    dbinfo = config.couches[couchname]
    if dbname is _NotSpecified:
        dbname = dbinfo['name']
    logger.info("Connecting to couchdb at %s", dbinfo)
    db = CouchDB(dbinfo['host'], dbinfo['port'], dbname)
    DBs[couchname] = db
    return db


class WildField(schema.Field):
    '''
    Allows us to have dictionaries without schemas.
    '''
    def _to_python(self, value):
        return value
    
    def _to_json(self, value):
        return value

class RaindropDocument(schema.Document):
    type = schema.TextField()

class Account(RaindropDocument):
  '''
  Accounts correspond to instances of protocols to send/receive messages.
  Although they may correlate with the various identities of the user, they
  are not the same.  Just because you have a facebook account does not mean
  you get an account instance; you would always want the info on the facebook
  account in the identity list for the user, but it doesn't get to be an
  account until we are capable of doing something with it.  (In the specific
  facebook case, having the account info to be able to do Facebook Connect-type
  things is an example of a case where an account should exist.)
  '''

  kind = schema.TextField()
  host = schema.TextField(default='')
  port = schema.IntegerField(default=0)
  username = schema.TextField()
  password = schema.TextField()
  ssl = schema.BooleanField(default=False)

  #: Have we ever successfully connected to this account?
  verified = schema.BooleanField(default=False)

  folderStatuses = WildField(default={})

class Contact(RaindropDocument):
    name = schema.TextField()
    identities = schema.ListField(schema.DictField(schema.Schema.build(
        kind = schema.TextField(),
        value = schema.TextField()
    )))


class Message(RaindropDocument):
    account_id = schema.TextField()
    storage_path = schema.TextField()
    storage_id = schema.IntegerField()
    
    conversation_id = schema.TextField()
    header_message_id = schema.TextField()
    references = WildField()
    
    # canonical contacts
    from_contact_id = schema.TextField()
    to_contact_ids = schema.ListField(schema.TextField())
    cc_contact_ids = schema.ListField(schema.TextField())
    # convenience contacts with enough semantics to not just map it (for now)
    involves_contact_ids = schema.ListField(schema.TextField())
    
    date = schema.DateTimeField()
    timestamp = schema.IntegerField()

    # general attribute info...
    read = schema.BooleanField()
    
    # user-added meta-information
    tags = WildField()

    headers = WildField()
    bodyPart = WildField()
    _attachments = WildField(default={})

    xxxxxxxxxxxx = """
    # -- conversation views
    # no ghosts!
    conversation_info = schema.View('conversations', '''\
        function(doc) {
            if (doc.timestamp)
                emit(doc.conversation_id,
                     {oldest: doc.timestamp, newest: doc.timestamp, count: 1,
                      involves: doc.involves_contact_ids});
        }''', '''\
        function(keys, values, rereduce) {
            out = values[0];
            out_involves = {};
            function involve_fuse(l) {
                for (var il = 0; il < l.length; il++)
                    out_involves[l[il]] = true;
            }
            involve_fuse(out.involves);
            for (var i = 1; i < values.length; i++) {
                var cur = values[i];
                if (cur.oldest < out.oldest)
                    out.oldest = cur.oldest;
                if (cur.newest > out.newest)
                    out.newest = cur.newest;
                out.count += cur.count;
                involve_fuse(cur.involves);
            }
            out.involves = [];
            for (var contact_id in out_involves)
              out.involves.push(contact_id);
            return out;
        }''', group=True, group_level=1)
    # no ghosts!
    by_conversation = schema.View('by_conversation', '''\
        function(doc) {
            if (doc.timestamp)
                emit(doc.conversation_id, null);
        }''', include_docs=True)

    # -- message (id) views
    # ghosts are okay!
    by_header_id = schema.View('by_header_id', '''\
        function(doc) {
            emit(doc.header_message_id, null);
        }''', include_docs=True)    

    # the key includes the timestamp so we can use it to limit our queries plus
    #  pick up where we left off if we need to page/chunk.
    # we expose the conversation id as the value because set intersection
    #  on a conversation-basis demands it, and it would theoretically be too
    #  expensive to just return the whole document via include_docs.
    # (no ghosts!)
    by_involves = schema.View('by_involves', '''\
        function(doc) {
            for each (var contact_id in doc.involves_contact_ids)
                emit([contact_id, doc.timestamp], doc.conversation_id);
        }''')
    
    # -- user provided meta-info junk
    tagmap_func = '''\
        function(doc) {
            if (doc.tags) {
                for (var i = 0; i < doc.tags.length; i++)
                    emit([doc.tags[i], doc.timestamp], doc.conversation_id);
            }
        }'''
    by_tags = schema.View('by_tags', tagmap_func)
    
    # by reusing tagmap_func, we are able to consume its output from the
    #  previous view without introducing additional storage needs
    all_tags = schema.View('tags', tagmap_func, '''\
        function(keys, values, rereduce) {
            var keySet = {}, i, j;
            if (!rereduce) {
                for (i = 0; i < keys.length; i++)
                    keySet[keys[i][0][0]] = true;
            }
            else {
                for (i = 0; i < values.length; i++) {
                    var inSet = values[i];
                    for (j = 0; j < inSet.length; j++)
                        keySet[inSet[j]] = true;
                }
            }
            var out = [];
            for (var key in keySet)
                out.push(key);
            out.sort();
            return out;
        }''', group=False, group_level=0)
    
    # -- storage info views
    # so, this key is theoretically just wildly expensive
    # no ghosts!
    by_storage = schema.View('by_storage', '''\
        function(doc) {
            if (doc.timestamp)
                emit([doc.account_id, doc.storage_path, doc.storage_id], null);
        }''', include_docs=False)
        
    by_mailing_list = schema.View('by_header_id', r'''\
        function(doc) {
          if (doc.headers && doc.headers["List-Id"]) {
            var parts = doc.headers["List-Id"].match(/([\W\w]*)\s*<(.+)>.*/);
            var values = {"List-Id" : doc.headers["List-Id"],
                          "id" : parts[2],
                          "name" : parts[1] };
            for each (var headerId in ["List-Post","List-Archive","List-Help",
                                       "List-Subscribe","List-Unsubscribe"]) {
              if (doc.headers[headerId])
                values[headerId] = doc.headers[headerId];
            }
            emit(parts[2], values);
          }
        }''', '''\
        function(keys, values, rereduce) {
          var output = {};
          output.count = values.length;
          for (var idx in values) {
            for (var elm in values[idx]) {
              output[elm] = values[idx][elm];
            }
          }
          return output;
        }''', include_docs=False, group=True, group_level=1)

    by_list_id = schema.View('by_mailing_list', r'''\
        function(doc) {
          if (doc.headers && doc.headers["List-Id"]) {
            var parts = doc.headers["List-Id"].match(/[\W\w\s]*<(.+)>.*/);
            emit([parts[1], doc.timestamp], doc.conversation_id);
          }
        }''', include_docs=True)    
    """


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
            ret_views[view_name] = {'reduce': f.read()}
            f.close()
        except (OSError, IOError):
            # no reduce - no problem...
            logger.debug("no reduce.js in '%s' - skipping reduce for this view", view_dir)
            continue
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
        logger.info("DB already exists!")

    def _created_ok(d):
        logger.info("created new database")
        schema_src = os.path.abspath(os.path.join(os.path.dirname(__file__),
                                                  "../../../schema"))

        docs = [d for d in generate_designs_from_filesystem(schema_src)]
        logger.info("Found %d documents in '%s'", len(docs), schema_src)
        assert docs, 'surely I have *some* docs!'
        url = '/%(name)s/_bulk_docs' % dbinfo
        ob = {'docs' : docs}
        deferred = db.postob(url, ob)
        return deferred

    d = db.createDB(dbinfo['name'])
    d.addCallbacks(_created_ok, _create_failed)
    return d
