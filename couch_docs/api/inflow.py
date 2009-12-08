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
        supplied = {}
        for name, val in req['query'].iteritems():
            try:
                val = json.loads(val)
            except ValueError, why:
                raise APIErrorResponse(400, "invalid json in param '%s': %s" % (name, why))
            supplied[name] = val

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
            ret[arg] = supplied[arg]
        for arg, default in opt_args.iteritems():
            try:
                val = supplied[arg]
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
                # Remove the individual extension values and any other special meta.
                for attr in ('rd_schema_items', 'rd_megaview_expandable'):
                    if attr in doc:
                        del doc[attr]
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

            message_results.append(bag)

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
        # make "objects" as returned by the API
        ret = []
        for bag in message_results:
            attachments = []
            for schema_items in bag.itervalues():
                if 'is_attachment' in schema_items:
                    attachments.append(schema_items)

            ob = {"schemas": bag,
                  "id": bag['rd.msg.body']['rd_key'],
                  }
            if attachments:
                ob['attachments'] = attachments
            ret.append(ob)
        return ret

    def _build_conversations(self, db, conv_summaries, message_limit):
        # Takes a list of rd.conv.summary schemas and some request args,
        # and builds a list of conversation objects suitable for the result
        # of the API call.

        # build parallel lists of msg_ids and the conv they belong with,
        # while also building the result set we populate.
        ret = []
        msg_keys = []
        convs = []
        for cs in conv_summaries:
            ret_conv = {
                'id': cs['rd_key'],
                'identities': cs['identities'],
                'from_display': cs['from_display'],
                'unread': len(cs['unread_ids']),
                'unread_ids': cs['unread_ids'],
                'message_ids': cs['message_ids'],
                'messages': []
            }

            # Some messages, like tweets do not have subjects            
            if 'subject' in cs:
                ret_conv['subject'] = cs['subject']

            ret.append(ret_conv)
            these_ids = cs['message_ids']
            if message_limit is not None:
                these_ids = these_ids[:message_limit]
            for msg_key in these_ids:
                msg_keys.append(msg_key)
                convs.append(ret_conv)

        if msg_keys:
            messages = self._fetch_messages(db, msg_keys)
            assert len(messages)==len(msg_keys) # else our zip() will be wrong!
            for ret_conv, msg in zip(convs, messages):
                ret_conv['messages'].append(msg)
        return ret

    # The 'single' end-point for getting a single conversation.
    def by_id(self, req):
        self.requires_get(req)
        args = self.get_args(req, key="key", message_limit=None)
        db = RDCouchDB(req)
        conv_id = args["key"]
        log("conv_id: %s", conv_id)
        # get the document holding the convo summary.
        key = ['rd.core.content', 'key-schema_id', [conv_id, 'rd.conv.summary']]
        result = db.megaview(key=key, reduce=False, include_docs=True)
        if not result['rows']:
            return None
        sum_doc = result['rows'][0]['doc']
        return self._build_conversations(db, [sum_doc], args['message_limit'])[0]

    # Fetch all conversations which have the specified messages in them.
    def with_messages(self, req):
        self.requires_get_or_post(req)
        args = self.get_args(req, 'keys', message_limit=None)
        db = RDCouchDB(req)
        return self._with_messages(db, args['keys'], args['message_limit'])

    def _with_messages(self, db, msg_keys, message_limit):
        # make a megaview request to determine the convo IDs with the messages.
        # XXX - note we could maybe avoid include_docs by using the
        # 'message_ids' field on the conv_summary doc - although that will not
        # list messages flaged as 'deleted' etc.
        keys = [['rd.core.content', 'key-schema_id', [mid, 'rd.msg.conversation']]
                for mid in msg_keys]
        result = db.megaview(keys=keys, reduce=False, include_docs=True)
        conv_ids = set()
        for row in result['rows']:
            conv_ids.add(hashable_key(row['doc']['conversation_id']))

        # open the conv summary docs.
        keys = [['rd.core.content', 'key-schema_id', [conv_id, 'rd.conv.summary']]
                for conv_id in conv_ids]
        result = db.megaview(keys=keys, reduce=False, include_docs=True)
        # now make the conversation objects.
        docs = [row['doc'] for row in result['rows']]
        return self._build_conversations(db, docs, message_limit)

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
        args = self.get_args(req, ids=None, message_limit=None)
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
        return self._identities(db, ids, args)

    def _identities(self, db, idids, args):
        keys = [["rd.conv.summary", "identities", idid] for idid in idids]
        result = db.megaview(keys=keys, reduce=False)
        conv_doc_ids = set(r['id'] for r in result['rows'])
        result = db.allDocs(keys=list(conv_doc_ids), include_docs=True)
        # filter out deleted etc.
        docs = [row['doc'] for row in result['rows'] if 'doc' in row]
        return self._build_conversations(db, docs, args['message_limit'])

    # Helper for most other end-points
    def _query(self, req, **kw):
        def_opts = {
            'reduce': False,
            'include_docs': True,
            'descending': True,
        }
        opts = def_opts.copy()
        opts.update(kw)

        self.requires_get(req)
        args = self.get_args(req, limit=30, skip=0, message_limit=None)
        opts['limit'] = args['limit']
        opts['skip'] = args['skip']
        db = RDCouchDB(req)

        result = db.megaview(**opts)

        convo_summaries = [row['doc'] for row in result['rows']]
        convos = self._build_conversations(db, convo_summaries, args['message_limit'])
        # results are already sorted!
        return convos

    # The 'simpler' end-points based around self._query()
    def direct(self, req):
        return self._query(req,
                           startkey=["rd.conv.summary", "target-timestamp", ["direct", {}]],
                           endkey=["rd.conv.summary", "target-timestamp", ["direct"]],
                           )

    def group(self, req):
        return self._query(req,
                           startkey=["rd.conv.summary", "target-timestamp", ["group", {}]],
                           endkey=["rd.conv.summary", "target-timestamp", ["group"]],
                          )

    def broadcast(self, req):
        return self._query(req,
                           startkey=["rd.conv.summary", "target-timestamp", ["broadcast", {}]],
                           endkey=["rd.conv.summary", "target-timestamp", ["broadcast"]],
                           )

    def impersonal(self, req):
        return self._query(req,
                           startkey=["rd.conv.summary", "target-timestamp", ["impersonal", {}]],
                           endkey=["rd.conv.summary", "target-timestamp", ["impersonal"]],
                           )

    def personal(self, req):
        return self._query(req,
                           startkey=["rd.conv.summary", "target-timestamp", ["personal", {}]],
                           endkey=["rd.conv.summary", "target-timestamp", ["personal"]],
                           )

    def twitter(self, req):
        opts = {
            'startkey': ["rd.msg.tweet.raw", "twitter_created_at_in_seconds", 9999999999999999],
            'endkey': ["rd.msg.tweet.raw", "twitter_created_at_in_seconds", 0],
            'reduce': False,
            'descending': True,
        }

        self.requires_get(req)
        args = self.get_args(req, limit=30, skip=0, message_limit=None)
        opts['limit'] = args['limit']
        opts['skip'] = args['skip']
        db = RDCouchDB(req)

        result = db.megaview(**opts)

        keys = [row['value']['rd_key'] for row in result['rows']]
        convos = self._with_messages(db, keys, args['message_limit'])
        
        convos.sort(key=lambda item: item['messages'][0]['schemas']['rd.msg.body']['timestamp'],
                   reverse=True)
        return convos

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
        log("error response: %s", resp)
    except Exception, exc:
        import traceback, StringIO
        s = StringIO.StringIO()
        traceback.print_exc(file=s)
        resp = make_response(s.getvalue(), 400)
        log("exception response: %s", resp)
    return resp
