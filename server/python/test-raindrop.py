#!/usr/bin/env python

# Twisted's 'trial' package has its own idea of logging and cmdline args etc -
# we still need to work out how to best integrate our world and theirs - for
# now we just do the simplest thing possible...

import sys
import os
import tempfile

# If no args specified run all tests...
if len(sys.argv)==1:
    sys.argv.append('raindrop.tests')

import twisted.scripts.trial

# poke into twisted to change one or 2 defaults - these can still be adjusted
# via cmdline args...
for opt in twisted.scripts.trial.Options.optParameters:
    if opt[0]=='temp-directory' and opt[2]=='_trial_temp':
        opt[2] = os.path.join(tempfile.gettempdir(), 'raindrop_trial_temp')

# now run it...
twisted.scripts.trial.run()
