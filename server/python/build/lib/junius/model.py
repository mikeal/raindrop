from couchdb import schema

class Account(schema.document):
    kind = schema.TextField()
    host = schema.TextField()
    port = schema.IntegerField()
    username = schema.TextField()
    password = schema.TextField()
    ssl = schema.BooleanField()

class Contact(schema.Document):
    name = schema.TextField()
    identities = schema.ListField(Schema.build(
        kind = schema.TextField(),
        value = schema.TextField()
    ))
    #: expose contacts by their identities
    by_identity = View('by_identity', '''\
        function(doc) {
            for each (var identity in doc.identities) {
                emit([identity.kind, identity.value], doc);
            }
        }''')
    #: expose all suffixes of the contact name and identity values
    by_suffix = View('by_suffix', '''\
        function(doc) {
            var i;
            for each (i = 0; i < doc.name.length; i++)
                emit(doc.name.substring(i), doc._id);
            for each (var identity in doc.identities) {
                for each (i = 0; i < identity.value.length; i++) {}
                    emit(identity.value.substring(i), doc._id);
                }
            }
        }''')

class Message(schema.Document):
    from_contact_id = schema.TextField()
    to_contact_ids = schema.ListField(schema.TextField())
    cc_contact_ids = schema.ListField(schema.TextField())
    
    message_id = schema.TextField()
    
    conversation_id = schema.TextField()
    
    date = schema.DateTimeField()
    ts = schema.IntegerField()

    headers = schema.DictField(Schema.build())
    parts = schema.ListField(Schema.build())
    raw = schema.TextField()
