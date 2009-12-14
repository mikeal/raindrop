#! /usr/bin/env python
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


try:
    import json
except ImportError:
    import simplejson as json

import couchdb
from couchdb.client import ResourceNotFound
import base64
import time
import random
import string
from pprint import pprint

import httplib2

server = couchdb.Server('http://127.0.0.1:5984')
try:
    del server['test']
except ResourceNotFound:
    pass

db = server.create('test')

def timeit(desc, func, *args):
    start = time.clock()
    func(*args)
    print desc, "took", time.clock()-start

def configure_erlang_views():
    headers = {'X-Couch-Persist': 'false'}
    h = httplib2.Http()
    uri = server.resource.uri + '/_config/native_query_servers/erlang'
    resp, content = h.request(uri, "PUT",
                              json.dumps('{couch_native_process, start_link, []}'),
                              headers=headers)
    assert resp['status']=='200', resp
    
def load_docs(nraw=1000):
    # load 'nraw' raw documents, them simulate each of these raw docs having
    # 5 additional 'simple' documents each...
    common = {
       'rd_schema_id' : 'something',
       'rd_ext_id' : 'something else',
       'rd_key' : 'some key',
    }
    bulk_docs = []
    for i in xrange(nraw):
        doc = {'foo' : 'bar',
               'etc' : 'cough'
               }
        doc['_id'] = str(i) + ('a' * 200)
        doc.update(common)
        bulk_docs.append(doc)
        if len(bulk_docs) >= 1000 or (i==nraw-1):
            db.update(bulk_docs)
            # db.update modified each doc in place
            for doc in bulk_docs:
                data = '\0' * random.randint(100, 50000)
                db.put_attachment(doc, data, 'raw')
            bulk_docs = []
            print "created", i+1, "raw docs with attachments"

    bulk_docs = []
    for i in xrange(nraw * 7):
        what = i % 2
        if what == 0:
            doc = {'field1' : 'a' * 50,
                   'field2' : 'b' * 50,
                   'field3' : 'c' * 50,
                   'complex' : {
                        'sub_field' : 'sub_value',
                        'extras' : range(50),
                   },
                   'simple_list' : range(20),
                   'another_complex' : {},
                   'rd_megaview_expandable' : ['simple_list'],
            }
            ac = doc['another_complex']
            for l in string.ascii_lowercase:
                ac[l * 20] = [l * 20]
        else:
            doc = {'anotherfield1' : 'a' * 10,
                   'anotherfield2' : 'b' * 10,
                   'anotherfield3' : 'c' * 10,
                   'anotherfield4' : 'd' * 10,
                   'anotherfield5' : 'e' * 10,
                   'anotherfield6' : 'f' * 10,
                   'anotherfield7' : 'g' * 10,
                   }
        doc['_id'] = str(i) + ('b' * 200)
        doc.update(common)
        bulk_docs.append(doc)
        if len(bulk_docs) >= 1000:
            db.update(bulk_docs)
            bulk_docs = []
            print "created", i+1, "simple docs"
    if bulk_docs:
        db.update(bulk_docs)

def load_views():
    ddocs = [
        {"_id": "_design/js-megaview", 
         "views" : {
           "view" : {
                # This is an old verbatim copy of our mega-view, including comments etc.
                "map": """
                        // A doc may have rd_megaview_ignore_doc set - this excludes the doc
                        // completely from the megaview.
                        // A doc may also have rd_megaview_ignore_values set - this writes the
                        // 'rd.core.*' schemas (so the document IDs can still be located) but the
                        // values aren't written.

                        function(doc) {
                          if (doc.rd_schema_id
                            && !doc.rd_megaview_ignore_doc
                            && doc.rd_schema_id.indexOf("ui") != 0) { // ui extensions should be ok here?
                            // every row we emit for this doc uses an identical 'value'.
                            var row_val = {'_rev': doc._rev,
                                           'rd_key' : doc.rd_key,
                                           'rd_ext' : doc.rd_ext_id,
                                           'rd_schema_id' : doc.rd_schema_id,
                                          }
                            // first emit some core 'pseudo-schemas'.
                            emit(['rd.core.content', 'key', doc.rd_key], row_val);
                            emit(['rd.core.content', 'schema_id', doc.rd_schema_id], row_val);
                            emit(['rd.core.content', 'key-schema_id', [doc.rd_key, doc.rd_schema_id]], row_val);
                            emit(['rd.core.content', 'ext_id', doc.rd_ext_id], row_val);
                            emit(['rd.core.content', 'ext_id-schema_id', [doc.rd_ext_id, doc.rd_schema_id]], row_val);
                            // don't emit the revision from the source in the key.
                            var src_val;
                            if (doc.rd_source)
                              src_val = doc.rd_source[0];
                            else
                              src_val = null;
                              
                            emit(['rd.core.content', 'source', src_val], row_val);
                            emit(['rd.core.content', 'key-source', [doc.rd_key, src_val]], row_val);
                            emit(['rd.core.content', 'ext_id-source', [doc.rd_ext_id, src_val]], row_val);

                            if (doc.rd_schema_confidence)
                              emit(['rd.core.content', 'rd_schema_confidence', doc.rd_schema_confidence],
                                   row_val);

                            // If this schema doesn't want/need values indexed, bail out now.
                            if (doc.rd_megaview_ignore_values)
                              return

                            var rd_megaview_expandable = doc.rd_megaview_expandable || [];
                            for (var prop in doc) {
                                //Skip text fields that are big (better served by full
                                //text search), private props and raindrop-housekeeping
                                //props.
                                if ( prop.charAt(0) == "_"
                                     || prop.indexOf("rd_") == 0
                                     || prop.indexOf("raindrop") == 0) {
                                  continue;
                                }

                              var val;
                              // don't emit long string values, but do still emit a row with NULL
                              // so it can be found.
                              if ((typeof doc[prop] == "string") && doc[prop].length > 140)
                                val = null;
                              else
                                val = doc[prop];
                              // If the doc has a special attribute rd_megaview_expandable and this
                              // property is in it, then that attribute is an array that each
                              // elt can be expanded - eg 'tags'. We can't do this unconditionally as
                              // things like identity_ids don't make sense expanded. Note we may also
                              // want to unpack real objects?
                              var expand = false;
                              for (var i=0; i<rd_megaview_expandable.length && !expand; i++) {
                                if (prop==rd_megaview_expandable[i]) {
                                  expand = true;
                                }
                              }
                              if (expand) {
                                for (var i=0; i<doc[prop].length; i++)
                                  emit([doc.rd_schema_id, prop, val[i]], row_val);
                              } else {
                                emit([doc.rd_schema_id, prop, val], row_val);
                              }
                            }
                          }
                        }
                       """,
                "reduce": "_count",
                },
            },
        },

        {"_id": "_design/js-simpleview", 
         "views" : {
           "view" : {
                "map": """function(doc) {if (doc.foo) emit(doc.foo, doc.foo);}""",
                "reduce": "_count",
                },
            },
        },

        {"_id": "_design/erlang-megaview", 
         "language": "erlang",
         "views" : {
           "view" : {
                "map": """\
% An erlang implementation of the mega-view.
fun({ThisDoc}) ->
    % return every field in the document which isn't 'reserved'
    User_fields = fun(Doc) ->
        RawFields = lists:filter( 
            fun({K, _V}) -> 
                case K of
                % leading '_'
                <<$_, _/binary >>            -> false;
                % leading 'rd_'
                <<$r, $d, $_, _/binary >>    -> false;
                % else...
                _                            -> true
               end
            end,
            Doc),
        case proplists:get_value(<<"rd_megaview_expandable">>, Doc) of
        undefined ->
            % result is just the raw fields.
            RawFields;
        Expandable ->
            % there is a rd_megaview_expandable field - process it
            % any field value in 'rd_megaview_expandable' will be a nested list.
            lists:flatten(
                lists:map(
                    fun({K, V}) ->
                        case lists:any( fun(X) -> K==X end, Expandable) of
                        true  -> lists:map( fun(Y) -> {K, Y} end, V);
                        false -> {K,V}
                        end
                    end,
                    RawFields
                )
            )
        end
    end,

    Emit_for_rd_item = fun(Doc, SchemaID) ->
        RDKey = proplists:get_value(<<"rd_key">>, Doc),
        ExtID = proplists:get_value(<<"rd_ext_id">>, Doc),
        SchemaConf = proplists:get_value(<<"rd_schema_confidence">>, Doc),
        % we don't emit the revision from the source in the key.
        RDSource = proplists:get_value(<<"rd_source">>, Doc),
        SrcVal = case RDSource of
                    undefined -> null;
                    null -> null;
                    _    -> hd(RDSource)
                end,

        % The value that gets written for every row we write.
        Value = {[ {<<"_rev">>, proplists:get_value(<<"_rev">>, Doc)},
                   {<<"rd_key">>, proplists:get_value(<<"rd_key">>, Doc)},
                   {<<"rd_ext">>, ExtID},
                   {<<"rd_schema_id">>, SchemaID}
                ]},

        Fixed = [
            {[<<"rd.core.content">>, <<"key">>, RDKey]},
            {[<<"rd.core.content">>, <<"schema_id">>, SchemaID]},
            {[<<"rd.core.content">>, <<"key-schema_id">>, [RDKey, SchemaID]]},
            {[<<"rd.core.content">>, <<"ext_id">>, ExtID]},
            {[<<"rd.core.content">>, <<"ext_id-schema_id">>, [ExtID, SchemaID]]},
            {[<<"rd.core.content">>, <<"source">>, SrcVal]},
            {[<<"rd.core.content">>, <<"key-source">>, [RDKey, SrcVal]]},
            {[<<"rd.core.content">>, <<"ext_id-source">>, [ExtID, SrcVal]]},
            % a condition
            {[<<"rd.core.content">>, <<"rd_schema_confidence">>, SchemaConf], SchemaConf}
        ],

        FilteredFixed = lists:map( 
            fun(K) -> element(1, K) end,
            lists:filter( 
               fun(V) -> 
                   case V of
                   {_Key} -> true;
                   {_Key, null} -> false;
                   {_Key, undefined} -> false;
                   {_Key, _} -> true
                   end
               end,
               Fixed
            )
        ),

        % If this schema doesn't want/need values indexed, don't fetch them.
        AllKeys = case proplists:get_value(<<"rd_megaview_ignore_values">>, Doc) of
        undefined ->
            % fetch the user fields too...
            UserKeys = lists:map(
                fun({K, V}) ->
                    % emit null if a string value > 140 chars is seen.
                    NV = case V of 
                            <<_:(140*8), _/binary>> -> null;
                            _                       -> V
                        end,
                    [SchemaID, K, NV]
                end,
                User_fields(Doc)
            ),
            FilteredFixed ++ UserKeys;
        _ ->
            FilteredFixed
        end,
        % finally the results
        lists:foreach(
            fun (K) -> Emit(K, Value) end,
         AllKeys )
    end,

    case proplists:get_value(<<"rd_megaview_ignore_doc">>, ThisDoc) of
    undefined ->
        SchemaID = proplists:get_value(<<"rd_schema_id">>, ThisDoc),
        case SchemaID of
            undefined -> none;
            _         -> Emit_for_rd_item(ThisDoc, SchemaID)
        end;
    _ -> none
    end
end.
""",
                "reduce": "_count",
                },
            },
        },

        {"_id": "_design/erlang-simpleview", 
         "language": "erlang",
         "views" : {
           "view" : {
                "map": """\
fun({Doc}) ->
    case proplists:get_value(<<"foo">>, Doc) of
    undefined -> none;
    Val       -> Emit(Val, Val)
    end
end.
""",
                "reduce": "_count",
                },
            },
        },

    ]
    db.update(ddocs)

def run_view(view):
    # must open the view *and* access the results due to black magic :(
    len(db.view(view))

configure_erlang_views()
timeit("loading docs", load_docs)
print "database info is:"; pprint(db.info())
load_views() # fast - not worth timing

for viewtype in ('megaview', 'simpleview'):
    results = []
    for lang in ('js', 'erlang'):
        view = '_design/' + lang + "-" + viewtype + '/_view/view'
        timeit('view %r' % view, run_view, view)
        # now do it again with reduce=False, so we can sanity
        # check the benchmark is checking what we thing it is
        # (ie, that the results are identical)
        results.append(list(db.view(view, reduce=False)))

    r1, r2 = results
    if len(r1) != len(r2):
        print "View results aren't the same! - %d rows vs %d rows" % (r1, r2)
        continue

    for i, (rw1, rw2) in enumerate(zip(r1, r2)):
        if rw1 != rw2:
            print "View results aren't the same! - at row", i
            pprint(rw1)
            pprint(rw2)
            continue # stop after first problem!
    

print "database info is:"; pprint(db.info())
