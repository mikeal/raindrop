from couchdb import schema, design

class WildField(schema.Field):
    '''
    Allows us to have dictionaries without schemas.
    '''
    def _to_python(self, value):
        return value
    
    def _to_json(self, value):
        return value

class Account(schema.Document):
    kind = schema.TextField()
    host = schema.TextField()
    port = schema.IntegerField()
    username = schema.TextField()
    password = schema.TextField()
    ssl = schema.BooleanField()
    
    folderStatuses = WildField(default={})
    
    # could we just do _all_docs?  I don't want the damn design docs though...
    # (ironically, this is the first one :)
    all = schema.View('all', '''\
        function(doc) {
            emit(null, doc);
        }''')

class Contact(schema.Document):
    name = schema.TextField()
    identities = schema.ListField(schema.DictField(schema.Schema.build(
        kind = schema.TextField(),
        value = schema.TextField()
    )))
    #: expose contacts by their identities
    by_identity = schema.View('contacts', '''\
        function(doc) {
            for each (var identity in doc.identities) {
                emit([identity.kind, identity.value], doc);
            }
        }''')
    #: expose all suffixes of the contact name and identity values
    by_suffix = schema.View('contact_ids', '''\
        function(doc) {
            var i;
            for (i = 0; i < doc.name.length; i++)
                emit(doc.name.substring(i), null);
            for each (var identity in doc.identities) {
                for (i = 0; i < identity.value.length; i++)
                    emit(identity.value.substring(i), null);
            }
        }''', include_docs=True)

class Message(schema.Document):
    account_id = schema.TextField()
    storage_path = schema.TextField()
    storage_id = schema.IntegerField()
    
    conversation_id = schema.TextField()
    header_message_id = schema.TextField()
    
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

    headers = WildField()
    bodyPart = WildField()
    _attachments = WildField(default={})

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

    # no ghosts!
    by_timestamp = schema.View('by_timestamp', '''\
        function(doc) {
            if (doc.timestamp)
                emit(doc.timestamp, null);
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
    
    # -- storage info views
    # so, this key is theoretically just wildly expensive
    # no ghosts!
    by_storage = schema.View('by_storage', '''\
        function(doc) {
            if (doc.timestamp)
                emit([doc.account_id, doc.storage_path, doc.storage_id], null);
        }''', include_docs=False)

DATABASES = {
    # the app database proper, no real data
    'junius': None,
    #
    'accounts': Account,
    'contacts': Contact,
    'messages': Message,
}

class DBS(object):
    pass

def fab_db(update_views=False):
    import couchdb
    server = couchdb.Server('http://localhost:5984/')
    
    dbs = DBS()
    
    for db_name, doc_class in DATABASES.items():
        if not db_name in server:
            db = server.create(db_name)
            update_views = True
        else:
            db = server[db_name]
        
        if update_views and doc_class:
            views = [v for v in doc_class.__dict__.values() if isinstance(v, schema.View)]
            if views:
                design.ViewDefinition.sync_many(db, views)

        setattr(dbs, db_name, db)

    return dbs    
