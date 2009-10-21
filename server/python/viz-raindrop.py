#!/usr/bin/env python
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


# It took me all of a day to get graphviz working on Windows at all - so
# a smarter tool to customize output filenames etc can wait.

import pygraphviz as pgv

from raindrop import pipeline
from raindrop.model import get_doc_model
from raindrop.proc import base
from raindrop.config import init_config

from twisted.internet import reactor, defer


import logging
logging.basicConfig() # so we can see errors in the pipeline loader.

@defer.inlineCallbacks
def get_schemas_created_by(dm, ext_id):
    results = yield dm.open_view(startkey=["rd.core.content", "ext_id-schema_id", [ext_id]],
                                 endkey=["rd.core.content", "ext_id-schema_id", [ext_id, {}]],
                                 reduce=False)
    ret = set()
    for row in results['rows']:
        ret.add(row['value']['rd_schema_id'])
    defer.returnValue(ret)

@defer.inlineCallbacks
def get_raw_sources(dm):
    ret = {}
    # query for all items with a null source.
    results = yield dm.open_view(key=["rd.core.content", "source", None],
                                 reduce=False)
    for row in results['rows']:
        sid = row['value']['rd_schema_id']
        # worm around where imap abuses ext_id.
        ext_id = row['value']['rd_ext'].split("~")[0]
        ret.setdefault(ext_id, set()).add(sid)
    defer.returnValue(ret)
   
@defer.inlineCallbacks
def make_graph(dm, filename="pipeline.svg", prog="dot"):    
    G=pgv.AGraph()
    G.graph_attr['label']='raindrop message pipeline'

    sources = yield get_raw_sources(dm)
    for ext_id, schemas in sources.iteritems():
        label = "%s" % (ext_id,)
        for sid in schemas:
            print ext_id, "is a source of", sid
            G.add_edge("the intertubez", sid, label=label)
    
    exts = yield pipeline.load_extensions(dm)    
    for ext_id, ext in exts.iteritems():
        for sid in ext.source_schemas:
            label = "%s" % (ext_id,)
            target_types = yield get_schemas_created_by(dm, ext_id)
            for tt in target_types:
                G.add_edge(sid, tt, label=label)
    G.draw(filename, prog=prog)

@defer.inlineCallbacks
def go(_):
    try:
        _ = yield init_config()
        dm = get_doc_model()
        _ = yield make_graph(dm)
    finally:
        print "stopping"
        reactor.stop()


def main():
    reactor.callWhenRunning(go, None)
    reactor.run()

if __name__=='__main__':
    main()
