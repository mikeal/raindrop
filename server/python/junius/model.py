import os
import logging
import paisley
from couchdb import schema, design
from junius.config import get_config

config = get_config()

class _NotSpecified:
    pass

logger = logging.getLogger('model')

DBs = {}

def get_db(couchname="local", dbname=_NotSpecified):
    try:
        return DBs[couchname]
    except KeyError:
        pass
    dbinfo = config.couches[couchname]
    if dbname is _NotSpecified:
        dbname = dbinfo['name']
    logger.info("Connecting to couchdb at %s", dbinfo)
    db = paisley.CouchDB(dbinfo['host'], dbinfo['port'], dbname)
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

  view_src = 'accounts'

class Contact(RaindropDocument):
    name = schema.TextField()
    identities = schema.ListField(schema.DictField(schema.Schema.build(
        kind = schema.TextField(),
        value = schema.TextField()
    )))

    view_src = 'contacts'


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

    view_src = 'messages'

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


def load_views_from_manifest(fname):
    import ConfigParser
    parser = ConfigParser.SafeConfigParser()
    assert os.path.exists(fname), fname
    parser.read([fname])
    ret = {}
    relative_to = os.path.dirname(fname)
    VIEW_PREFIX = 'view-'
    for section_name in parser.sections():
      if section_name.startswith(VIEW_PREFIX):
        view_name = section_name[len(VIEW_PREFIX):]
        map_fname = parser.get(section_name, 'map')
        map_code = open(os.path.join(relative_to, map_fname)).read()
        reduce_code = None
        try:
            reduce_fname = parser.get(section_name, 'reduce')
        except ConfigParser.NoOptionError:
            pass
        else:
            reduce_code = open(os.path.join(relative_to, reduce_fname)).read()
        yield view_name, map_code, reduce_code


def fab_db(update_views=False):
    # XXX - we ignore update_views and always update them.  Its not clear
    # how to hook this in cleanly to twisted (ie, even if update_views is
    # False, we must still do it if the db didn't exist)
    couch_name = 'local'
    db = get_db(couch_name, None)
    dbinfo = config.couches[couch_name]

    def _create_failed(failure, *args, **kw):
        if failure.value.status != '412': # precondition failed.
            failure.raiseException()
        logger.info("DB already exists!")

    def _created_ok(d):
        logger.info("created new database")
        view_src = os.path.abspath(os.path.join(os.path.dirname(__file__),
                                                "../../../schema/views"))
        logger.info("Updating views from '%s'", view_src)
        
        doc_types = [x for x in globals().itervalues()
                     if isinstance(x, type) and issubclass(x, RaindropDocument)
                     and x is not RaindropDocument]
        for doc_class in doc_types:
            manifest_dir = os.path.join(view_src, doc_class.view_src)
            view_gen = load_views_from_manifest(os.path.join(manifest_dir, "MANIFEST"))
            views = []
            for view_name, map_src, reduce_src in view_gen:
                logger.debug("Creating view '%s', map=%r, reduce=%r",
                             view_name, map_src, reduce_src)
                view = schema.View(view_name, map_src, reduce_src)
                #view = design.ViewDefinition(view_doc, view_name, map_src, reduce_src)
                views.append(view)

            # SOB - need a twisted version of this...
            if views:
                import couchdb
                url = 'http://%(host)s:%(port)s/' % dbinfo
                sserver = couchdb.Server(url)
                sdb = sserver[dbinfo['name']]
                design.ViewDefinition.sync_many(sdb, views)

    d = db.createDB(dbinfo['name'])
    d.addCallbacks(_created_ok, _create_failed)
    return d
