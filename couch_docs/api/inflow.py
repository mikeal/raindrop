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
        body = req.get('body')
        if body and body != 'undefined': # yes, couch 0.10 send the literal 'undefined'
            # If there was a body specified, it can also contain request
            # args - although no args can be specified in both places.
            try:
                body_args = json.loads(body)
                if not isinstance(body_args, dict):
                    raise ValueError, "body must be a json object"
            except ValueError, why:
                raise APIErrorResponse(400, "invalid json in request body: %s" % (why,))
            s = set(body_args)
            both = set.union(set(supplied))
            if both:
                msg = "the following arguments appear in both the query string and post body: %s" \
                      % (",".join(both))
                raise APIErrorResponse(400, msg)
            supplied.update(body_args)

        ret = {}
        for arg in req_args:
            if arg not in supplied:
                raise APIErrorResponse(400, "required argument '%s' missing" % arg)
            ret[arg] = json.loads(supplied[arg])
        for arg, default in opt_args.iteritems():
            try:
                val = json.loads(supplied[arg])
            except KeyError:
                val = default
            ret[arg] = val
        # now check there aren't extra unknown args
        for arg in supplied.iterkeys():
            if arg not in ret:
                raise APIErrorResponse(400, "unknown request argument '%s'" % arg)
        return ret

    def requires_get(self, req):
        if req['verb'] != 'GET':
            raise APIErrorResponse(405, "GET required")

    def requires_get_or_post(self, req):
        if req['verb'] not in ['GET', 'POST']:
            raise APIErrorResponse(405, "GET or POST required")


# The classes which define the API; all methods without a leading _ are public
class ConversationAPI(API):
    def _filter_fresh(self, db, rdkeys):
        keys = []
        fresh = set()
        for rd_key in rdkeys:
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
        return [rdkey for rdkey in rdkeys if hashable_key(rd_key) in fresh]

    def _filter_known_identities(self, db, idids):
        # Given a list/set of identity IDs, return those 'known' (ie, associated
        # with a contact.
        result = db.megaview(key=["rd.core.content", "schema_id", "rd.identity.contacts"],
                             reduce=False, include_docs=False)
        # Cycle through each document. The rd_key is the full identity ID, we just
        # need the second part of it. It has an array of contacts but each item
        # in the contacts array has other info about the contact, we just need
        # the first part, the contactId.
        all_known = set()
        for row in result['rows']:
            idty = row['value']['rd_key'][1]
            idkey = hashable_key(idty)
            all_known.add(idkey)
        # now return the union.
        return all_known.intersection(set(idids))

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

        idtys = self._filter_known_identities(db, from_map)
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
        db = RDCouchDB(req)

        result = db.megaview(startkey=["rd.msg.recip-target", "target-timestamp", ['direct', {}]],
                             endkey=["rd.msg.recip-target", "target-timestamp", ['direct']],
                             descending=True,
                             reduce=False,
                             include_docs=False,
                             limit=args['limit'])

        # note the results are already sorted by descending timestamp
        # Filter out the items that are not "fresh".
        all_recips = self._filter_fresh(db,
                                        [row['value']['rd_key'] for row in result['rows']])
        # The json has the rd_key for messages in timestamp order;
        # now we need to fetch the 'rd.msg.conversation' schema to fetch the
        # convo ID.
        keys = [['rd.core.content', 'key-schema_id', [rdkey, 'rd.msg.conversation']]
                for rdkey in all_recips]
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
        return convos

    # Fetch all conversations which have the specified messages in them.
    def with_messages(self, req):
        self.requires_get_or_post(req)
        args = self.get_args(req, 'keys')
        db = RDCouchDB(req)
        return self._with_messages(db, args['keys'])

    def _with_messages(self, db, msg_keys):
        keys = [['rd.core.content', 'key-schema_id', [k, 'rd.msg.conversation']]
                for k in msg_keys]

        result = db.megaview(keys=keys, reduce=False, include_docs=True)

        conv_set = set()
        for row in result['rows']:
            conv_set.add(row['doc']['conversation_id'])
        conv_ids = list(conv_set)

        # now fetch the conversation objects.
        convos = self._fetch_conversations(db, conv_ids)
        # and no sorting for this function.
        return convos

    # Fetch all conversations which include a message from the specified contact
    def contact(self, req):
        self.requires_get(req)
        args = self.get_args(req, "id")
        cid = args['id']

        db = RDCouchDB(req)
        capi = ContactAPI()
        idids = capi._fetch_identies_for_contact(db, cid)
        return _identities(db, idids)

    # Fetch all conversations which include a message from the specified contact
    def identities(self, req):
        # fetch messages 'from' any of those identities
        # XXX - shouldn't we do 'to' etc too?
        db = RDCouchDB(req)
        self.requires_get(req)
        args = self.get_args(req, ids=None)
        ids = args['ids']
        if ids is None:
            # special case - means "my identity".  Note this duplicates code
            # in raindrop/extenv.py's get_my_identities() function.
            result = db.megaview(startkey=["rd.account", "identities"],
                                 endkey=["rd.account", "identities", {}],
                                 reduce=False)
            mine = set()
            for row in result['rows']:
                iid = row['key'][2]
                mine.add(hashable_key(iid))
            ids = list(mine)
        return self._identities(db, ids)

    def _identities(self, db, idids):
        keys = [["rd.msg.body", "from", idid] for idid in idids]
        keys.extend([["rd.msg.body", "to", idid] for idid in idids])
        keys.extend([["rd.msg.body", "cc", idid] for idid in idids])
        result = db.megaview(keys=keys, reduce=False)
        message_keys = [r['value']['rd_key'] for r in result['rows']]
        # Load the conversations based on these message IDs.
        result = self._with_messages(db, message_keys)
        # sort the result
        result.sort(key=lambda c: c[0]['rd.msg.body']['timestamp'],
                    reverse=True)
        return result

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
        db = RDCouchDB(req)

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

        # now fetch the conversation objects.
        convos = self._fetch_conversations(db, conv_ids)
        # sort based on timestamp on latest message in convo.
        convos.sort(key=lambda c: c[-1]["rd.msg.body"]["timestamp"], reverse=True)
        return convos

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


class ContactAPI(API):
    def _fetch_identies_for_contact(self, db, cid):
        # find all identity-ids for the contact
        startkey = ['rd.identity.contacts', 'contacts', [cid]]
        endkey = ['rd.identity.contacts', 'contacts', [cid, {}]]
        result = db.megaview(startkey=startkey, endkey=endkey, reduce=False)
        ret = []
        for row in result['rows']:
            # the rd_key should be ['identity', idid]
            rdkey = row['value']['rd_key']
            if (rdkey[0] == 'identity'):
                assert len(rdkey)==2
                ret.append(rdkey[1])
            else:
                log("contact has non-identity record: %s", row)
        return ret


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
        resp = make_response(meth(request))
    except APIException, exc:
        resp = exc.err_response
    except Exception, exc:
        import traceback, StringIO
        s = StringIO.StringIO()
        traceback.print_exc(file=s)
        resp = make_response(s.getvalue(), 400)
    return resp
