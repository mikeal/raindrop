# It took me all of a day to get graphviz working on Windows at all - so
# a smarter tool to customize output filenames etc can wait.

import pygraphviz as pgv

from raindrop import pipeline
from raindrop.model import get_doc_model

pipeline.load_converters(get_doc_model())

G=pgv.AGraph()
G.graph_attr['label']='raindrop message pipeline'

for sid, targets in pipeline.depends.iteritems():
    for target_type in targets:
        cvtr = pipeline.converters[sid, target_type]
        fname = cvtr.__class__.__module__.replace('.', '/') + '.py'
        label = "%s (%s)" % (cvtr.__class__.__name__, fname)
        G.add_edge(sid, target_type, label=label)
G.draw("pipeline.svg", prog="dot")
