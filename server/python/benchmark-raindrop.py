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

# A very hacky script to try and get some "benchmarks" for raindrop's backend.
# The intent is that this script can help you determine the relative
# performance cost or benefit of particular strategies.

import os
import time
import optparse

from twisted.internet import reactor, defer
from twisted.python import log

from raindrop.tests import TestCaseWithCorpus, FakeOptions

class CorpusHelper(TestCaseWithCorpus):
    def __init__(self, opts):
        self.opt_dict = opts
    def get_options(self):
        opts = FakeOptions()
        for name, val in self.opt_dict.iteritems():
            setattr(opts, name, val)
        return opts

    # A helper for the enron corpos - nothing specific to enron really - just
    # a collection of files on disk, each one being a single rfc822 message
    def gen_enron_items(self, path):
        for root, dirs, files in os.walk(path):
            this = []
            for file in files:
                fq = os.path.join(root, file)
                this.append(self.rfc822_to_schema_item(open(fq, "rb")))
            if this:
                yield this

    @defer.inlineCallbacks
    def load_enron_messages(self, path):
        _ = yield self.init_corpus('enron')
        num = 0
        for items in self.gen_enron_items(path):
            num += len(items)
            _ = yield self.doc_model.create_schema_items(items)
        defer.returnValue(num)

    
@defer.inlineCallbacks
def load_corpus(testcase, opts):
    if opts.enron_dir:
        num = yield testcase.load_enron_messages(opts.enron_dir)
    else:
        # for now, just use the hand-rolled corpus
        num = yield testcase.load_corpus('hand-rolled')
    defer.returnValue(num)


@defer.inlineCallbacks
def load_and_sync(testcase, opts):
    num = yield load_corpus(testcase, opts)
    _ = yield testcase.ensure_pipeline_complete()
    defer.returnValue(num)


@defer.inlineCallbacks
def timeit(func, *args):
    start = time.clock()
    ret = yield defer.maybeDeferred(func, *args)
    took = time.clock()-start
    defer.returnValue((ret, took))

@defer.inlineCallbacks
def report_db_state(db):
    info = yield db.infoDB()
    print "DB has %(doc_count)d docs at seq %(update_seq)d in %(disk_size)d bytes" % info

@defer.inlineCallbacks
def run_timings_async(_, opts):
    print "Starting asyncronous loading and processing..."
    tc = CorpusHelper({'no_process': True})
    _ = yield tc.setUp()
    ndocs, avg = yield timeit(load_corpus, tc, opts)
    print "Loaded %d documents in %.3f" % (ndocs, avg)
    # now do a 'process' on one single extension.
    tc.pipeline.options.exts = ['rd.ext.core.msg-rfc-to-email']
    _, avg = yield timeit(tc.pipeline.start_backlog)
    print "Ran 1 extension in %.3f" % (avg)
    # now do a few in (hopefully) parallel
    tc.pipeline.options.exts = ['rd.ext.core.msg-email-to-body',
                                'rd.ext.core.msg-email-to-mailinglist',
                                'rd.ext.core.msg-email-to-recip-target',
                                'rd.ext.core.msg-body-to-quoted'
                                'rd.ext.core.msg-body-quoted-to-hyperlink',
                                ]
    _, avg = yield timeit(tc.pipeline.start_backlog)
    print "Ran %d extensions in %.3f" % (len(tc.pipeline.options.exts), avg)
    # now the 'rest'
    tc.pipeline.options.exts = None
    _, avg = yield timeit(tc.pipeline.start_backlog)
    print "Ran remaining extensions in %.3f" % (avg,)
    _ = yield report_db_state(tc.pipeline.doc_model.db)
    # try unprocess then process_backlog
    _, avg = yield timeit(tc.pipeline.unprocess)
    print "Unprocessed in %.3f" % (avg,)
    _, avg = yield timeit(tc.pipeline.start_backlog)
    print "re-processed in %.3f" % (avg,)
    _ = yield report_db_state(tc.pipeline.doc_model.db)


@defer.inlineCallbacks
def run_timings_sync(_, opts):
    print "Starting syncronous loading..."
    tc = CorpusHelper({})
    _ = yield tc.setUp()
    ndocs, avg = yield timeit(load_and_sync, tc, opts)
    print "Loaded and processed %d documents in %.3f" % (ndocs, avg)
    _ = yield report_db_state(tc.pipeline.doc_model.db)
   

def main():
    parser = optparse.OptionParser()
    parser.add_option("", "--enron-dir",
                      help=
"""Directory root of an enron-style corpus to use.  You almost certainly do
not want to specify the root of the enron corpus - specify one of the
child (leaf) directories.  For example {root}/beck-s/eurpoe holds 166
documents.""")
    opts, args = parser.parse_args()

    d = defer.Deferred()
    d.addCallback(run_timings_async, opts)
    d.addCallback(run_timings_sync, opts)

    def done(whateva):
        reactor.stop()

    d.addCallbacks(done, log.err)
    
    reactor.callWhenRunning(d.callback, None)
    reactor.run()


if __name__ == "__main__":
    main()
