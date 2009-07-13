# The raindrop 'extension environment'.  Responsible for setting up all the
# globals available to extensions.
import uuid
from twisted.internet import defer, threads
from twisted.internet import reactor

import logging

logger = logging.getLogger(__name__)

def get_ext_env(doc_model, new_items, src_doc, ext):
    # Hack together an environment for the extension to run in
    # (specifically, provide the emit_schema etc globals)
    # NOTE: These are all called in the context of a worker thread and
    # are expected by the caller to block.
    def emit_schema(schema_id, items, rd_key=None, confidence=None,
                    attachments=None):
        ni = {'schema_id': schema_id,
              'items': items,
              'ext_id' : ext.id,
              }
        if rd_key is None:
            ni['rd_key'] = src_doc['rd_key']
        else:
            ni['rd_key'] = rd_key
        if confidence is not None:
            ni['confidence'] = confidence
        ni['rd_source'] = [src_doc['_id'], src_doc['_rev']]
        if attachments is not None:
            ni['attachments'] = attachments
        new_items.append(ni)
        return doc_model.get_doc_id_for_schema_item(ni)

    def emit_related_identities(identity_ids, def_contact_props):
        for item in items_from_related_identities(doc_model,
                                             identity_ids,
                                             def_contact_props,
                                             ext.id):
            item['rd_source'] = [src_doc['_id'], src_doc['_rev']]
            new_items.append(item)

    def open_schema_attachment(src, attachment, **kw):
        "A function to abstract document storage requirements away..."
        doc_id = src['_id']
        logger.debug("attempting to open attachment %s/%s", doc_id, attachment)
        dm = doc_model
        return threads.blockingCallFromThread(reactor,
                    dm.db.openDoc, dm.quote_id(doc_id),
                    attachment=attachment, **kw)

    def open_view(*args, **kw):
        return threads.blockingCallFromThread(reactor,
                    doc_model.open_view, *args, **kw)

    new_globs = {}
    new_globs['emit_schema'] = emit_schema
    new_globs['emit_related_identities'] = emit_related_identities
    new_globs['open_schema_attachment'] = open_schema_attachment
    new_globs['open_view'] = open_view
    new_globs['logger'] = logging.getLogger('raindrop.ext.'+ext.id)
    return new_globs


# NOTE: called from a background thread by extensions, so we can block :)
def items_from_related_identities(doc_model, idrels, def_contact_props, ext_id):
    idrels = list(idrels) # likely a generator...
    assert idrels, "don't give me an empty list - just don't emit!!"
    if __debug__: # check the extension is sane...
        for iid, rel in idrels:
            assert isinstance(iid, (tuple, list)) and len(iid)==2,\
                   repr(iid)
            assert rel is None or isinstance(rel, basestring), repr(rel)

    # Take a short-cut to ensure all identity records exist and to
    # handle conflicts from the same identity being created at the
    # same time; ask the doc-model to emit a NULL schema for each
    # one if it doesn't already exist.
    for iid, rel in idrels:
        yield {'rd_key' : ['identity', iid],
               'schema_id' : 'rd.identity.exists',
               'items': None,
               'ext_id' : ext_id,
               }

    # Find contacts associated with any and all of the identities;
    # any identities not associated with a contact will be updated
    # to have a contact (either one we find with for different ID)
    # or a new one we create.
    dl = []
    for iid, rel in idrels:
        # the identity itself.
        rdkey = ['identity', iid]
        dl.append(
            doc_model.open_schemas(rdkey, 'rd.identity.contacts'))
    results = threads.blockingCallFromThread(reactor,
                    defer.DeferredList, dl)
    assert len(results)==len(idrels), (results, idrels)

    # check for errors...
    for (ok, result) in results:
        if not ok:
            result.raiseException()
    # scan the list looking for an existing contact for any of the ids.
    for schemas in [r[1] for r in results]:
        if schemas:
            contacts = schemas[0].get('contacts', [])
            if contacts:
                contact_id = contacts[0][0]
                logger.debug("Found existing contact %r", contact_id)
                break
    else: # for loop not broken...
        # allocate a new contact-id; we can't use a 'natural key' for a
        # contact....
        contact_id = str(uuid.uuid4())
        # just choose any of the ID's details (although first is likely
        # to be 'best')
        cdoc = {}
        # We expect a 'name' field at least...
        assert 'name' in def_contact_props, def_contact_props
        cdoc.update(def_contact_props)
        logger.debug("Will create new contact %r", contact_id)
        yield {'rd_key' : ['contact', contact_id],
               'schema_id' : 'rd.contact',
               # ext_id might be wrong here - maybe it should be 'us'?
               'ext_id' : ext_id,
               'items' : cdoc,
        }

    # We know the contact to use and the list of identities
    # which we know exist. We've also got the 'contacts' schemas for
    # those identities - which may or may not exist, and even if they do,
    # may not refer to this contact.  So fix all that...
    for (_, schemas), (iid, rel) in zip(results, idrels):
        # identity ID is a tuple/list of exactly 2 elts.
        assert isinstance(iid, (tuple, list)) and len(iid)==2, repr(iid)
        new_rel = (contact_id, rel)
        doc_id = doc_rev = None # incase we are updating a doc...
        if not schemas:
            # No 'contacts' schema exists for this identity
            new_rel_fields = {'contacts': [new_rel]}
        else:
            # At least one 'contacts' schema exists - let's hope ours
            # is the only one :)
            assert len(schemas)==1, schemas # but what if it's not? :)
            sch = schemas[0]
            existing = sch.get('contacts', [])
            logger.debug("looking for %r in %s", contact_id, existing)
            for cid, existing_rel in existing:
                if cid == contact_id:
                    new_rel_fields = None
                    break # yay
            else:
                # not found - we need to update this doc
                new_rel_fields = sch.copy()
                sch['contacts'] = existing + [new_rel]
                logger.debug("new relationship (update) from %r -> %r",
                             iid, contact_id)
                # and note the fields which allows us to update...
                doc_id = sch['_id']
                doc_rev = sch['_rev']
        if new_rel_fields is not None:
            yield {'rd_key' : ['identity', iid],
                   'schema_id' : 'rd.identity.contacts',
                   'ext_id' : ext_id,
                   'items' : new_rel_fields,
            }
