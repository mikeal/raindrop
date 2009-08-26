#! /usr/bin/env python

import json
import couchdb
import base64
import time
import random
import string
from pprint import pprint

server = couchdb.Server('http://127.0.0.1:5984')
if 'test' in server:
    del server['test']

server.create('test')
db = server['test']

def timeit(desc, func, *args):
    start = time.clock()
    func(*args)
    print desc, "took", time.clock()-start

def load_docs(nraw=7000):
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
            ret = db.update(bulk_docs)
            bulk_docs = []
            for row in ret:
                data = '\0' * random.randint(100, 50000)
                db.put_attachment(row, data, 'raw')
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
        {"_id": "_design/views", 
         "views" : {
           "megaview" : {
                # This is a verbatim copy of our mega-view, including comments etc.
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
                                           'rd_source' : doc.rd_source,
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
        {"_id": "_design/views2", 
         "views" : {
           "simple" : {
                "map": """function(doc) {if (doc.foo) emit(doc.foo, doc.etc);}"""
                },
            },
        },
    ]
    db.update(ddocs)

def run_view(view):
    # must open the view *and* access the results due to black magic :(
    len(db.view(view))

timeit("loading docs", load_docs)
print "database info is:"; pprint(db.info())
load_views() # fast - not worth timing

for view in ('_design/views/_view/megaview', '_design/views2/_view/simple'):
    timeit('view %r' % view, run_view, view)

print "database info is:"; pprint(db.info())
