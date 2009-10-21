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

# this needs to become a 'plugin' mechanism...

_protocol_infos = [
    ('imap', 'raindrop.proto.imap', 'IMAPAccount'),
    ('skype', 'raindrop.proto.skype', 'SkypeAccount'),
    ('twitter', 'raindrop.proto.twitter', 'TwitterAccount'),
    ('smtp', 'raindrop.proto.smtp', 'SMTPAccount'),
    ('rss', 'raindrop.proto.rss', 'RSSAccount'),
]

_test_protocol_infos = [
    ('test', 'raindrop.proto.test', 'TestAccount'),
]

protocols = {}
def init_protocols(include_test_protocols=False):
    import sys, logging
    logger = logging.getLogger('raindrop.proto')
    to_init = _protocol_infos[:]
    if include_test_protocols:
        to_init.extend(_test_protocol_infos)
    for name, mod, factname in to_init:
        try:
            logger.debug("attempting import of '%s' for '%s'", mod, factname)
            __import__(mod)
            mod = sys.modules[mod]
            fact = getattr(mod, factname)
        except ImportError, why:
            logger.error("Failed to import '%s' factory: %s", name, why)
        except:
            logger.exception("Error creating '%s' factory", name)
        else:
            protocols[name] = fact

__all__ = [protocols, init_protocols]
