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
