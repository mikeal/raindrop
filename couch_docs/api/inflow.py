# ***** BEGIN LICENSE BLOCK *****
# * Version: MPL 1.1
# *
# * The contents of this file are subject to the Mozilla Public License Version
# * 1.1 (the "License"); you may not use this file except in compliance with
# * the License. You may obtain a copy of the License at
# * http://www.mozilla.org/MPL/
# *
# * Software distributed under the License is distributed on an "AS IS" basis,
# * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# * for the specific language governing rights and limitations under the
# * License.
# *
# * The Original Code is Raindrop.
# *
# * The Initial Developer of the Original Code is
# * Mozilla Messaging, Inc..
# * Portions created by the Initial Developer are Copyright (C) 2009
# * the Initial Developer. All Rights Reserved.
# *
# * Contributor(s):
# *

# This is the 'inflow' REST API implementation.  Note many globals come
# via (and this script must be run via) raindrop-apirunner.py.

import itertools

class API:
    # A base class - helpers for the implementation classes...
    def get_args(self, req, *req_args, **opt_args):
        supplied = req['query']
        ret = {}
        for arg in req_args:
            if arg not in supplied:
                raise APIErrorResponse(400, "required argument '%s' missing" % arg)
            ret[arg] = supplied[arg]
        for arg, default in opt_args.iteritems():
            ret[arg] = supplied.get(arg, default)
        # now check there aren't extra unknown args
        for arg in supplied.iterkeys():
            if arg not in ret:
                raise APIErrorResponse(400, "unknown request argument '%s'" % arg)
        return ret

    def requires_get(self, req):
        if req['verb'] != 'GET':
            raise APIErrorResponse(405, "GET required")


# The classes which define the API; all methods without a leading _ are public
class ConversationAPI(API):
    def _filter_fresh(self, db, docs):
        keys = []
        fresh = set()
        for rd_key in [d['rd_key'] for d in docs]:
            keys.append(["rd.core.content", "key-schema_id", [rd_key, "rd.msg.archived"]]);
            keys.append(["rd.core.content", "key-schema_id", [rd_key, "rd.msg.deleted"]]);
            fresh.add(hashable_key(rd_key))
        result = db.megaview(keys=keys, reduce=False, include_docs=True)
        # For anything seen/deleted/archived, mark it as not fresh.
        for row in result['rows']:
            doc = row['doc']
            if doc.get('deleted') or doc.get('archived'):
                try:
                    fresh.remove(hashable_key(doc['rd_key']))
                except KeyError:
                    pass

        # Now weed out the not-fresh from the result.
        return [doc for doc in docs if hashable_key(doc['rd_key']) in fresh]

    def _fetch_contact_identities(self, db, idids):
        result = db.megaview(key=["rd.core.content", "schema_id", "rd.identity.contacts"],
                              reduce=False, include_docs=True)
        # Cycle through each document. The rd_key is the full identity ID, we just
        # need the second part of it. It has an array of contacts but each item
        # in the contacts array has other info about the contact, we just need
        # the first part, the contactId.
        by_contact = {}
        by_idty = {}
        for row in result['rows']:
            doc = row['doc']
            idty = doc['rd_key'][1]
            idkey = hashable_key(idty)
            this_idty = by_idty.setdefault(idkey, [])
            for contact in doc['contacts']:
                contact_id = contact[0]
                this_idty.append(contact_id)
                by_contact.setdefault(contact_id, []).append(idty)
        # part 2
        found = []
        for idid in idids:
            if idid in by_idty:
                found.append(idid)
        return found

    def _fetch_messages(self, db, msg_keys):
        # Generate proper key for megaview lookup.
        keys = [['rd.core.content', 'key', k] for k in msg_keys]
        result = db.megaview(keys=keys, include_docs=True, reduce=False)
        message_results = []
        from_map = {}
        # itertools.groupby rocks :)
        for (rd_key, dociter) in itertools.groupby(
                                (r['doc'] for r in result['rows']),
                                key=lambda d: d['rd_key']):
            # Make a dict based on rd_schema_id.
            bag = {}
            for doc in dociter:
                # Make sure we have the right aggregate to use for this row.
                rd_key = doc['rd_key']
                schema_id = doc['rd_schema_id']
            
                # Skip some schemas since it is extra stuff we do not need.
                # Prefer a blacklist vs. a whitelist, since user extensions may add
                # other things, and do not want to have extensions register extra stuff? TODO.
                if '.rfc822' in schema_id or '.raw' in schema_id:
                    continue
                # TODO: note that we may get many of the same schema, which implies
                # we need to aggregate them - tags is a good example.  For
                # now just make noise...
                if schema_id in bag:
                    # TODO: Hack to favor notification schemas over direct ones.
                    # XXX - todo - add this!
                    log("warning: message '%s' has multiple '%s' schemas",
                        rd_key, schema_id)
                # for now it gets clobbered if it exists...
                bag[schema_id] = doc
            try:
                body = bag['rd.msg.body']
            except KeyError:
                continue
            frm = body.get('from')
            if frm:
                # Hold on to the from names to check if they are known later
                # TODO: this should probably be a back end extension.
                # TODO: fix the above comment - this kinda *is* a back-end extension :)
                from_key = hashable_key(frm)
                from_map.setdefault(from_key, []).append(bag)

            message_results.append(bag);

        # Look up the IDs for the from identities. If they are real
        # identities, synthesize a schema to represent this.
        # TODO: this should probably be a back-end extension.
        # TODO: as above, fix the above comment :)

        idtys = self._fetch_contact_identities(db, from_map)
        # Cycle through the identities, and work up a schema for
        # them if they are known.
        for idty in idtys:
            bags = from_map[idty]
            for bag in bags:
                bag["rd.msg.ui.known"] = {
                    "rd_schema_id" : "rd.msg.ui.known"
                }
        return message_results

    def _fetch_conversations(self, db, conv_ids):
        # Takes a list of conversation IDs and returns a list of sorted
        # 'conversations' - each conversation is itself a list of sorted
        # 'messages', where each 'message' is a dict of schemas.
        keys = [["rd.msg.conversation", "conversation_id", cid]
                for cid in conv_ids]
        result = db.megaview(keys=keys, reduce=False)
        # Build up a list of rd_keys for the messages so we can fetch whatever
        # schemas are necessary.
        rdkeys = (row['value']['rd_key'] for row in result['rows'])

        messages = self._fetch_messages(db, rdkeys)

        # Create final result.
        conversations = {}
        for message in messages:
            try:
                cid = message['rd.msg.conversation']['conversation_id']
            except KeyError:
                log("message with no conversation: %s", message)
                continue

            conversations.setdefault(cid, []).append(message)

        # Now sort the messages in each conversation by timestamp,
        # earliest timestamp first.
        for convo in conversations.itervalues():
            convo.sort(key=lambda a: a['rd.msg.body']['timestamp'], reverse=True)
        # Now sort conversations so the conversation with a message that is
        # most
        return sorted(conversations.itervalues(),
                      key=lambda c: c[-1]['rd.msg.body']['timestamp'], reverse=True)

    # The 'home'end-point.
    def home(self, req):
        self.requires_get(req)
        args = self.get_args(req, limit=30)
        db = RDCouchDB(req['path'][0]) # first elt of path is db name

        result = db.megaview(startkey=["rd.msg.recip-target", "target-timestamp", ['direct', {}]],
                             endkey=["rd.msg.recip-target", "target-timestamp", ['direct']],
                             descending=True,
                             reduce=False,
                             include_docs=True,
                             limit=args['limit'])

        # Filter out the items that are not "fresh".
        all_recips = self._filter_fresh(db,
                                        [row['doc'] for row in result['rows']
                                         if 'doc' in row])
        # sort the allRecips by timestamp
        all_recips.sort(key=lambda d: d['timestamp'], reverse=True)

        # The json has the rd_key for messages in timestamp order;
        # now we need to fetch the 'rd.msg.conversation' schema to fetch the
        # convo ID.
        keys = [['rd.core.content', 'key-schema_id', [doc['rd_key'], 'rd.msg.conversation']]
                for doc in all_recips]
        result = db.megaview(keys=keys,
                             reduce=False,
                             include_docs=True)
        conv_set = set()
        for row in result['rows']:
            conv_set.add(row['doc']['conversation_id'])
        conv_ids = list(conv_set)

        # now fetch the conversation objects.
        convos = self._fetch_conversations(db, conv_ids)
        # sort based on timestamp on latest message in convo.
        convos.sort(key=lambda c: c[-1]["rd.msg.body"]["timestamp"], reverse=True)
        return make_response(convos)

    # Helper for most other end-points
    def _query(self, req, **kw):
        def_opts = {
            'reduce': False,
            'startkey': ["rd.msg.body", "timestamp", {}],
            'endkey': ["rd.msg.body", "timestamp"],
            'include_docs': False,
            'descending': True,
        }
        opts = def_opts.copy()
        opts.update(kw)

        self.requires_get(req)
        args = self.get_args(req, limit=30, skip=0)
        opts['limit'] = args['limit']
        opts['skip'] = args['skip']
        db = RDCouchDB(req['path'][0]) # first elt of path is db name

        result = db.megaview(**opts)

        # The json has the rd_key for messages in timestamp order;
        # now we need to fetch the 'rd.msg.conversation' schema to fetch the
        # convo ID.
        keys = [['rd.core.content', 'key-schema_id', [row['value']['rd_key'], 'rd.msg.conversation']]
                 for row in result['rows']]

        result = db.megaview(keys=keys, reduce=False, include_docs=True)
        conv_set = set()
        for row in result['rows']:
            conv_set.add(row['doc']['conversation_id'])
        conv_ids = list(conv_set)

        log("HELLO WORLD")

        log("_query '%s' ", conv_ids)


        # now fetch the conversation objects.
        convos = self._fetch_conversations(db, conv_ids)
        # sort based on timestamp on latest message in convo.
        convos.sort(key=lambda c: c[-1]["rd.msg.body"]["timestamp"], reverse=True)
        return make_response(convos)

    # The 'simpler' end-points based around self._query()
    def direct(self, req):
        return self._query(req,
                           startkey=["rd.msg.recip-target", "target-timestamp", ["direct", {}]],
                           endkey=["rd.msg.recip-target", "target-timestamp", ["direct"]],
                           )

    def group(self, req):
        return self._query(req,
                           startkey=["rd.msg.recip-target", "target-timestamp", ["group", {}]],
                           endkey=["rd.msg.recip-target", "target-timestamp", ["group"]],
                          )

    def broadcast(self, req):
        return self._query(req,
                           startkey=["rd.msg.recip-target", "target-timestamp", ["broadcast", {}]],
                           endkey=["rd.msg.recip-target", "target-timestamp", ["broadcast"]],
                           )

    def latest(self, req):
        return self._query(req,
                           startkey=["rd.msg.body", "timestamp", {}],
                           endkey=["rd.msg.body", "timestamp"],
                          )

# A mapping of the 'classes' we expose.  Each value is a class instance, and
# all 'public' methods (ie, those without leading underscores) on the instance
# are able to be called.
dispatch = {
    'conversations': ConversationAPI(),
}

# The standard raindrop extension entry-point (which is responsible for
# exposing the REST API end-point) - so many points!
def handler(request):
    try:
        # the 'path' tells us the end-point.  It is [db, external, app, class, method]
        # and our caller has already checked it has exactly that many elts...
        assert len(request['path'])==5, request
        cls, meth_name = request['path'][-2:]
        if cls not in dispatch:
            raise APIErrorResponse(400, "invalid API request endpoint class")
        # fetch the names method from the class instance
        inst = dispatch[cls]
        meth = getattr(inst, meth_name, None)
        # check it is callable etc.
        if not callable(meth) or meth_name.startswith('_'):
            raise APIErrorResponse(400, "invalid API request endpoint function")
        # phew - call it.
        resp = meth(request)
    except APIException, exc:
        resp = exc.err_response
    except Exception, exc:
        import traceback, StringIO
        s = StringIO.StringIO()
        traceback.print_exc(file=s)
        resp = make_response(s.getvalue(), 400)
    return resp
