# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is Raindrop.
#
# The Initial Developer of the Original Code is
# Mozilla Messaging, Inc..
# Portions created by the Initial Developer are Copyright (C) 2009
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#

import logging
import time
from urllib import quote
import base64
import itertools

import twisted.web.error
from twisted.internet import defer, reactor
from twisted.internet.task import coiterate

from .config import get_config
from .wetpaisley import CouchDB

try:
    import json
except ImportError:
    import simplejson as json

logger = logging.getLogger('model')

DBs = {}

class DocumentSaveError(Exception):
    def __init__(self, infos):
        self.infos = infos
        Exception.__init__(self, infos)

class DocumentOpenError(Exception):
    pass

# A list of 'schemas' that want their values expanded by the megaview.
# Intent is that this will come from metadata about the schema - ie, from
# the couch doc that holds the schema definition.
# For now it is hard-coded.
megaview_schemas_expandable_values = {
    'rd.tags' : ['tags'],
    'rd.identity.contacts' : ['contacts'],
    'rd.msg.body' : ['to', 'to_display', 'cc', 'cc_display'],
    'rd.account' : ['identities'],
    'rd.ext.api' : ['endpoints'],
    'rd.conv.summary' : ['message_ids', 'recent_ids', 'identities', 'target-timestamp'],
}
# Ditto - info which should come from the schema-defn itself - a list of
# schemas that don't need values emitted, just the keys etc.
megaview_schemas_ignore_values = [
    'rd.imap.mailbox-cache',
]

# Schema definitions which don't want an aggregate written; the individual
# extensions schemas are emitted individually.
megaview_schemas_no_aggr = [
    'rd.msg.location',
]

def encode_provider_id(proto_id):
    # a 'protocol' gives us a 'blob' used to identify the document; we create
    # a real docid from that protocol_id; we base64-encode what was given to
    # us to avoid the possibility of a '!' char, and also to better accomodate
    # truly binary strings (eg, a pickle or something bizarre)
    return base64.encodestring(proto_id).replace('\n', '')


class _NotSpecified:
    pass

# XXX - get_db should die as a global/singleton - only our DocumentModel
# instance should care about that.  Sadly, bootstrap.py is a (small; later)
# problem here...
def get_db(couchname="local", dbname=_NotSpecified):
    dbinfo = get_config().couches[couchname]
    if dbname is _NotSpecified:
        dbname = dbinfo['name']
    key = couchname, dbname
    try:
        return DBs[key]
    except KeyError:
        pass
    logger.info("Connecting to couchdb at %s", dbinfo)
    db = CouchDB(dbinfo['host'], dbinfo['port'], dbname,
                 dbinfo.get('username'), dbinfo.get('password'))
    DBs[key] = db
    return db


class DocumentModel(object):
    """The layer between 'documents' and the 'database'.  Responsible for
       creating the unique ID for each document (other than the raw document),
       for fetching documents based on an ID, etc
    """
    MAX_INLINE_ATTACH_SIZE = 100000 # pulled from a hat!
    def __init__(self, db):
        self.db = db
        self._important_views = None # views we update periodically
        self._extension_confidences = {}

    def set_extension_confidences(self, conf):
        self._extension_confidences = conf

    @classmethod
    def quote_id(cls, doc_id):
        # couch doesn't mind '!' or '=' and makes reading logs etc easier
        return quote(doc_id, safe="!=")

    @classmethod
    def hashable_key(cls, key):
        # turn a list, possibly itself holding lists, into something immutable.
        ret = []
        for item in key:
            if isinstance(item, list):
                ret.append(cls.hashable_key(item))
            else:
                ret.append(item)
        return tuple(ret)

    @classmethod
    def split_meta_from_items(cls, doc):
        """Split a dict into 2 dicts: the meta and the schema fields"""
        meta = {}
        items = {}
        for name, val in doc.iteritems():
            if name.startswith('_') or name.startswith('rd_'):
                meta[name] = val
            else:
                items[name] = val
        return meta, items

    @classmethod
    def check_schema_item(cls, item):
        """Check a schema item (presumably from an extension) and raise
        ValueError if it is insane.
        """
        for attr in ['rd_key', 'rd_ext_id']:
            val = item.get(attr)
            if not val:
                raise ValueError("no %r specifed" % attr, item)

        source = item.get('rd_source')
        if source:
            if not isinstance(source, (tuple, list)) or len(source)!=2:
                raise ValueError("invalid rd_source", item)
        if '_deleted' in item:
            if '_rev' not in item:
                raise ValueError("you must provide _rev to delete", item)
        else:
            # deleting an item doesn't require schema items!
            try:
                items = item['items']
                if items is not None and not isinstance(items, dict):
                    raise ValueError("items must be a dict", item)
            except KeyError:
                raise ValueError("no schema items ('items') specifed", item)

    @classmethod
    def doc_to_schema_items(cls, doc):
        """Turn a couch document back into a 'schema item' record"""
        meta, items = cls.split_meta_from_items(doc)
        info_common = {'rd_key': meta['rd_key'],
                       'rd_schema_id': meta['rd_schema_id']
                      }
        schema_items = doc['rd_schema_items']
        ext_ids = schema_items.keys()
        if len(ext_ids)==1:
            assert schema_items[ext_ids[0]]['schema'] is None, doc
            info_common['rd_ext_id'] = ext_ids[0]
            info_common['items'] = items
            yield info_common
        else:
            for ext_id in ext_ids:
                ret = info_common.copy()
                ret['rd_ext_id'] = ext_id
                ret['items'] = schema_items[ext_id]['schema']
                yield ret

    def open_view(self, docId='raindrop!content!all', viewId='megaview',
                  *args, **kwargs):
        logger.debug("attempting to open view %s/%s - %r %r",
                     docId, viewId, args, kwargs)
        return self.db.openView(docId, viewId, *args, **kwargs)

    @defer.inlineCallbacks
    def open_documents_by_id(self, doc_ids, **kw):
        """Open documents by the already constructed docid"""
        logger.debug("attempting to open documents %r", doc_ids)
        results = yield self.db.listDoc(keys=doc_ids, include_docs=True, **kw)
        rows = results['rows']
        assert len(rows)==len(doc_ids)
        ret = []
        for row in rows:
            if 'error' in row:
                # hrm - not clear is 'missing' is pre-0.10, or sometimes
                # 'missing' and sometimes 'not_found'?
                if row['error'] in ['missing', 'not_found']:
                    logger.debug("document %r does not exist", row['key'])
                    ret.append(None)
                else:
                    raise DocumentOpenError(row['error'])
            elif 'value' in row and row['value'].get('deleted', False):
                logger.debug("document %r has only deleted versions available",
                             row['key'])
                ret.append(None)
            else:
                assert 'doc' in row, row
                logger.debug("opened document %(_id)r at revision %(_rev)s",
                             row['doc'])
                ret.append(row['doc'])
        defer.returnValue(ret)

    def get_doc_id_for_schema_item(self, si):
        """Returns an *unquoted* version of the doc ID"""
        if '_id' in si:
            # already has an ID - could well be deleted - either way, hope it
            # is as expected.
            assert '_deleted' in si or \
                   self._calc_doc_id_for_schema_item(si)==si['_id'], si
            return si['_id']
        return self._calc_doc_id_for_schema_item(si)

    def _calc_doc_id_for_schema_item(self, si):
        key_type, key_val = si['rd_key']
        enc_key_val = encode_provider_id(json.dumps(key_val))
        key_part = "%s.%s" % (key_type, enc_key_val)
        sch_id = si['rd_schema_id']
        bits = ['rc', key_part, sch_id]
        return "!".join(bits)

    @classmethod
    def split_doc_id(cls, doc_id):
        if not doc_id.startswith('rc!'):
            raise ValueError("Not a raindrop content docid")
        rt, rdkey, schema = doc_id.split("!", 3)
        return rt, rdkey, schema

    @defer.inlineCallbacks
    def delete_documents(self, docs):
        for doc in docs:
            doc['_deleted'] = True
        results = yield self.db.updateDocuments(docs)
        # XXX - this error handling is also duplicated below.
        errors = []
        for doc, dinfo in zip(docs, results):
            if 'error' in dinfo:
                # presumably an unexpected error :(
                errors.append(dinfo)
        if errors:
            raise DocumentSaveError(errors)
        defer.returnValue(results)

    @defer.inlineCallbacks
    def update_documents(self, docs):
        assert docs, "don't call me when you have no docs!"
        logger.debug("attempting to update %d documents", len(docs))

        attachments = self._prepare_attachments(docs)
        results = yield self.db.updateDocuments(docs)
        # yuck - this is largely duplicated below :(
        errors = []
        update_items = []
        real_ret = []
        for doc, dattach, dinfo in zip(docs, attachments, results):
            if 'error' in dinfo:
                # presumably an unexpected error :(
                errors.append(dinfo)
            else:
                # attachments...
                while dattach:
                    name, info = dattach.popitem()
                    docid = dinfo['id']
                    revision = dinfo['rev']
                    logger.debug('saving attachment %r to doc %r', name, docid)
                    dinfo = yield self.db.saveAttachment(self.quote_id(docid),
                                   self.quote_id(name), info['data'],
                                   content_type=info['content_type'],
                                   revision=revision)

                real_ret.append(dinfo)
        if errors:
            raise DocumentSaveError(errors)
        defer.returnValue(real_ret)

    # Some functions for working/splitting documents and schemas.
    def _aggregate_doc(self, doc):
        sitems = doc['rd_schema_items']
        assert len(sitems) != 0
        if len(sitems) == 1:
            assert sitems.values()[0]['schema'] is None
            return # nothing to aggregate.
        if doc['rd_schema_id'] in megaview_schemas_no_aggr:
            doc['rd_megaview_no_aggr'] = True
            return # megaview will emit the individual schemas.
        eids = sorted(((n, self._extension_confidences.get(n, 0))
                        for n in sitems.iterkeys()),
                      key=lambda i: i[1])
        for conf, items in itertools.groupby(eids, lambda i: i[1]):
            exts = [item[0] for item in items if sitems[item[0]]['schema']]
            if len(exts)==0:
                # no extensions actually provided fields.
                continue
            if len(exts) != 1:
                logger.warn("when processing document %r, the extensions %s "
                            "all have a confidence level of %d - the first "
                            "listed extension has been chosen",
                            doc['_id'], exts, conf)
            sitem = sitems[exts[0]]
            schema = sitem['schema']
            if schema:
                doc.update(schema)

    def _remove_item_from_doc(self, doc, item):
        assert '_deleted' in item
        si = doc.get('rd_schema_items', {})
        if len(si)==0:
            raise RuntimeError("invalid schema format in doc %r(_id)", doc)
        ext_id = item['rd_ext_id']
        if ext_id not in si:
            raise RuntimeError("attempt to remove non-existing schema in doc %r(_id)", doc)
        # If no schemas left the entire doc gets deleted.
        if len(si)==1:
            doc['_deleted'] = True
        else:
            del si[ext_id]
            # if only 1 left now it gets moved back to a top-level.
            if len(si)==1:
                # clear existing items incase old values from previous extensions
                # are there, but aren't overridden by the new ones.
                _, existing = self.split_meta_from_items(doc)
                for name in existing:
                    del doc[name]
                rem_id = si.keys()[0]
                doc.update(si[rem_id]['schema'])
                si[rem_id]['schema'] = None
        # nuke any attachments this held.
        for name in doc.get('_attachments', {}):
            if name.startswith(ext_id+'/'):
                doc['_attachments'][name]['_deleted'] = True

        # The item itself may or may not have an '_id' - but if it does it
        # must be the same as the doc itself.
        assert '_id' not in item or doc.get('_id') == item.get('_id'), (doc, item)
        # there must always be a '_rev' field when nuking.
        doc['_rev'] = item['_rev']
        if '_deleted' not in doc:
            self._aggregate_doc(doc)

    def _add_item_to_doc(self, doc, item):
        """Add a 'schema item' structure to a doc.  Handles that a single doc
        may be asked to hold schema fields from multiple extensions and have
        the top-level fields be an 'aggregated' combination"""
        if '_deleted' in item:
            return self._remove_item_from_doc(doc, item)
        # every doc must have 'rd_schema_items' as a map - there  can either
        # be exactly 1 item (with null as the 'schema' attribute, or > 1 with
        # every else having a 'schema')
        try:
            si = doc['rd_schema_items']
        except KeyError:
            si = doc['rd_schema_items'] = {}
        # If there are no schema items it must be an empty doc
        if len(si) == 0 and 'rd_key' in doc:
            raise RuntimeError("invalid schema format in doc %r(_id)", doc)
        ext_id = item['rd_ext_id']
        if ext_id in si:
            # A schema for this extension already exists - update it.
            if len(si) == 1:
                if si[ext_id]['schema'] is not None:
                    raise RuntimeError("invalid schema format in doc %r(_id)"
                                       " - single schema isn't null", doc)
    
                # and the items themselves go in the top-level doc.
                target = doc
            else:
                if si[ext_id]['schema'] is None:
                    raise RuntimeError("invalid schema format in doc %r(_id)"
                                       " - multiple schemas has null", doc)
                target = si[ext_id]['schema']
                target.clear() # nuke all old stuff.
        else:
            # new schema entry for this extension.
            if len(si)==0:
                # will be the only schema, so it goes in the doc itself.
                target = doc
                si[ext_id] = {'schema': None}
            elif len(si)==1:
                # existing single schema in the doc; pop it out into its own
                # schema.
                _, exist_items = self.split_meta_from_items(doc)
                exist_ext_id = si.keys()[0]
                exist_entry = si[exist_ext_id]
                if exist_entry['schema'] is not None:
                    raise RuntimeError("invalid schema format in doc %r(_id)"
                                       " - single schema isn't null", doc)
                exist_entry['schema'] = exist_items
                si[ext_id] = {'schema': {}}
                target = si[ext_id]['schema']
            else:
                # already has multiple ext ID schemas, but not one of ours.
                # No need to touch the existing schemas.
                si[ext_id] = {'schema': {}}
                target = si[ext_id]['schema']

        # phew - can finally update the items and metadata.
        # Note 'items' can be None for '.exists' schemas
        schema_fields = item['items'] or {}
        # There was some confusion about attachments before; '_attachments' in
        # the schema items worked but wasn't 'the correct way'.
        assert '_attachments' not in schema_fields, schema_fields
        _, new_vals = self.split_meta_from_items(schema_fields)
        target.update(new_vals)
        # and the attachments.
        for attachname, data in (item.get('attachments') or {}).iteritems():
            new_name = ext_id + "/" + attachname
            doc.setdefault('_attachments', {})[new_name] = data
        # meta-data stored in the doc itself.
        for mname, opt in (('rd_key', False),
                           ('rd_schema_id', False),
                           ('_id', True),
                           ('_rev', True)):
            if mname in doc:
                if mname in item and \
                   self.hashable_key(doc[mname]) != self.hashable_key(item[mname]):
                    raise RuntimeError("doc confused about %s - %s vs %s\ndoc=%s\nitem=%s" %
                                       (mname, doc[mname], item[mname], doc, item))
            elif mname in item:
                doc[mname] = item[mname]
            else:
                assert opt, "item should have %s" % mname

        # meta-data stored in rd_schema_items.
        si[ext_id]['rd_source'] = item.get('rd_source')
        # check the provider flag.  The pipeline should have already detected
        # multiple providers and chosen one based on confidences.
        # Anything with a NULL source is implicitly a provider, but
        # anything which is a "no aggregate" schema doesn't get this behaviour.
        if item.get('rd_source') is None and 'rd_schema_provider' not in item:
            item['rd_schema_provider'] = item['rd_ext_id']
        if 'rd_schema_provider' in item:
            if 'rd_schema_provider' in doc and item.get('items') and \
               doc['rd_schema_provider'] != item['rd_schema_provider'] and \
               doc['rd_schema_id'] not in megaview_schemas_no_aggr:
                logger.warn('we seem to have multiple providers for %r: %r and %r',
                            item['rd_schema_id'], doc['rd_schema_provider'],
                            item['rd_schema_provider'])
            doc['rd_schema_provider'] = item['rd_schema_provider']
        if 'rd_deps' in item:
            si[ext_id]['rd_deps'] = item['rd_deps']
        self._aggregate_doc(doc)

    @defer.inlineCallbacks
    def create_schema_items(self, item_defs):
        """Main entry-point to create new (or updated) 'schema items' in
        the database."""
        assert item_defs, "don't call me when you have no docs!"
        # first build a map of all doc IDs we care about
        ids = set(self.get_doc_id_for_schema_item(si) for si in item_defs)
        # open any docs which already exist.
        docs = yield self.open_documents_by_id(list(ids))
        # map them based on the ID
        doc_map = {}
        orig_doc_map = {}
        for did, doc in zip(ids, docs):
            if doc is None:
                doc = {}
            doc_map[did] = doc
            orig_doc_map[did] = doc.copy()
            if '_id' in doc:
                assert doc['_id']==did, doc
            else:
                doc['_id'] = did
        # now apply updates
        for si in item_defs:
            did = self.get_doc_id_for_schema_item(si)
            doc = doc_map[did]
            self._add_item_to_doc(doc, si)
        # rebuild our doc list so it has the real docs.
        docs = list(doc_map.itervalues())
        # a bit more meta-data - the following fields relate directly to
        # the schema so can always be stored in the top-level doc.
        to_up = []
        for doc in docs:
            if '_deleted' in doc:
                to_up.append(doc)
                continue
            schema_id = doc['rd_schema_id']
            try:
                doc['rd_megaview_expandable'] = \
                        megaview_schemas_expandable_values[schema_id]
            except KeyError:
                pass
            if schema_id in megaview_schemas_ignore_values:
                doc['rd_megaview_ignore_values'] = True
            else:
                try:
                    del doc['rd_megaview_ignore_values']
                except KeyError:
                    pass
            if orig_doc_map[doc['_id']] == doc:
                logger.debug("skipping update of doc %(_id)s - it is unchanged",
                             doc)
            else:
                to_up.append(doc)

        # and update the docs - but even though we must have been called with
        # schema items, we may have detected duplicates and removed them...
        if to_up:
            updated_docs = yield self.update_documents(to_up)
        else:
            updated_docs = []
        logger.debug("create_schema_items made %r", updated_docs)
        defer.returnValue(updated_docs)

    def open_schemas(self, wanted):
        dids = []
        for (rd_key, schema_id) in wanted:
            temp_si = {'rd_key' : rd_key, 'rd_schema_id': schema_id}
            dids.append(self.get_doc_id_for_schema_item(temp_si))
        return self.open_documents_by_id(dids)

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
            assert '_id' in doc, doc
            try:
                this_attach = doc['_attachments']
            except KeyError:
                # It is important we put 'None' here so the list of
                # attachments is exactly parallel with the list of docs.
                this_attach = None
            else:
                # nuke any old attachments
                for name, a in this_attach.items():
                    if a.get('stub'):
                        del this_attach[name]

            if not this_attach:
                all_attachments.append(None)
            else:
                total_bytes = 0
                for a in this_attach.values():
                    total_bytes += len(a.get('data', []))
                if total_bytes > self.MAX_INLINE_ATTACH_SIZE:
                    # nuke non-deleted attachments specified
                    split_attachments = {}
                    for name, a in this_attach.items():
                        if '_deleted' not in a:
                            # take it out of _attachments.
                            del this_attach[name]
                            split_attachments[name] = a
                    # if there are no more attachments left, delete it.
                    if not this_attach:
                        del doc['_attachments']
                    all_attachments.append(split_attachments)
                else:
                    # base64-encode in place...
                    for a in this_attach.values():
                        try:
                            a['data'] = base64.encodestring(a['data']).replace('\n', '')
                        except KeyError:
                            # should only happen for deleted attachments
                            assert '_deleted' in a, a
                    all_attachments.append(None)
        assert len(all_attachments)==len(docs)
        return all_attachments

    @defer.inlineCallbacks
    def _cb_saved_docs(self, result, item_defs, attachments):
        # Detects document errors and updates any attachments which were too
        # large to send in the 'body'.  Updating attachments is complicated
        # by needing to track the *final* _rev of the document after all
        # attachments have been updated.

        # result: [{'rev': 'xxx', 'id': '...'}, ...]
        ds = []
        assert len(result)==len(attachments) and len(result)==len(item_defs)
        new_items = []
        real_result = []
        errors = []
        for dinfo, dattach, item_def in zip(result, attachments, item_defs):
            if 'error' in dinfo:
                # If no items were specified then this is OK - the
                # extension is just noting the ID exists and it already does.
                if dinfo.get('error')=='conflict' and item_def['items'] is None:
                    logger.debug('ignoring conflict error when asserting %r exists',
                                 dinfo['id'])
                else:
                    # presumably an unexpected error :(
                    errors.append(dinfo)
            else:
                while dattach:
                    name, info = dattach.popitem()
                    docid = dinfo['id']
                    revision = dinfo['rev']
                    logger.debug('saving attachment %r to doc %r', name, docid)
                    dinfo = yield self.db.saveAttachment(self.quote_id(docid),
                                   self.quote_id(name), info['data'],
                                   content_type=info['content_type'],
                                   revision=revision)

                # Give the ID and revision info back incase they need to
                # know...
                item_def['_id'] = dinfo['id']
                item_def['_rev'] = dinfo['rev']
                new_items.append(item_def)
                real_result.append(dinfo)

        logger.debug("saved %d documents with %d errors", len(new_items),
                     len(errors))
        if errors:
            raise DocumentSaveError(errors)

        defer.returnValue(real_result)

    @classmethod
    def get_schema_attachment_info(cls, doc, attach_base_name):
        # Get info about and the full name of an attachment from a schema
        # document given the attachments 'base name'
        # XXX - we don't yet have the concept of 'aggregating' attachments,
        # so for now just check we don't have multiple, warn and pick one if
        # we do.
        doc_id = doc['_id']
        infos = doc.get('_attachments', {})
        found = None
        for name, info in infos.iteritems():
            # don't expect deleted attachments to come back.
            assert '_deleted' not in info, info
            try:
                ext, aname = name.split("/", 1)
            except ValueError:
                logger.warn("unexpected attachment name %r in %r", name, doc_id)
                continue
            if aname==attach_base_name:
                if found is not None:
                    logger.warn("multiple extensions provide attachment %r in %r",
                                aname, docid)
                found = name
        if found is None:
            raise KeyError(attach_base_name)
        return found, infos[found]

    def _update_important_views(self):
        # Something else periodically updates our important views.
        if not self._important_views:
            # these keys come from jquery.couch.js
            return self.db.listDoc(startkey="_design", endkey="_design0",
                                   include_docs=True,
                                   ).addCallback(self._do_update_views)
        return self._do_update_views(None)

    @defer.inlineCallbacks
    def _do_update_views(self, result):
        if result is not None:
            self._important_views = []
            for row in result['rows']:
                if 'error' in row or 'deleted' in row['value']:
                    continue
                doc_id = row['id'][len('_design/'):]
                self._important_views.append((doc_id, row['doc']['views']))

        # We could use a DeferredList to run them all in parallel, but
        # it might make more sense to run them sequentially so we don't
        # overload the couch while we are still feeding it docs...
        # (However, each view update can run in parallel - so if we have
        # lotsa cores, doing more than 1 at a time makes sense...)
        # As the views are slow we keep some timings and log them at the end...
        logger.info("important view updates starting.")
        slowest = 0
        slowest_info = None, None
        st = time.time()
        for did, vns in self._important_views:
            logger.debug("updating views in %s", did)
            tst = time.time()
            # limit=0 updates without giving us rows.
            for vn in vns:
                _ = yield self.open_view(did, vn, limit=0)
            took = time.time() - tst
            if took > slowest:
                slowest = took
                slowest_info = did, vn
            logger.debug("View in %s updated in %d sec(s)", did, took)
        all_took = int(time.time() - st)
        if all_took:
            logger.info("updated %d view docs in %d secs - slowest was '%s' at %d secs.",
                        len(self._important_views), all_took, slowest_info[0], slowest)

_doc_model = None

def get_doc_model():
    global _doc_model
    if _doc_model is None:
        _doc_model = DocumentModel(get_db())
    return _doc_model

def fab_db(whateva):
    couch_name = 'local'
    db = get_db(couch_name, None)
    dbinfo = get_config().couches[couch_name]

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
