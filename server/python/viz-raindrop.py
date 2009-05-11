#!/usr/bin/env python

# It took me all of a day to get graphviz working on Windows at all - so
# a smarter tool to customize output filenames etc can wait.

import pygraphviz as pgv

from raindrop import pipeline
from raindrop.model import get_doc_model
from raindrop.proc import base


import logging
logging.basicConfig() # so we can see errors in the pipeline loader.

pipeline.load_extensions(get_doc_model())

G=pgv.AGraph()
G.graph_attr['label']='raindrop message pipeline'

for ext in pipeline.find_specified_extensions(base.ConverterBase):
    for sid in ext.sources:
        fname = ext.__class__.__module__.replace('.', '/') + '.py'
        label = "%s (%s)" % (ext.__class__.__name__, fname)
        G.add_edge(sid, ext.target_type, label=label)
G.draw("pipeline.svg", prog="dot")
