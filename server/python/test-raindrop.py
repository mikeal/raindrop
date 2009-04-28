#!/usr/bin/env python

# Twisted's 'trial' package has its own idea of logging and cmdline args etc -
# we still need to work out how to best integrate our world and theirs - for
# now we just do the simplest thing possible...

import sys
# If no args specified run all tests...
if len(sys.argv)==1:
    sys.argv.append('raindrop.tests')

from twisted.scripts.trial import run
run()
