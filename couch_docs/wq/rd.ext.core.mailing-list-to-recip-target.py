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
#   Bryan Clark

# This the extension version of handling mailing list message recipient targets
# We look for the list-id header or the list-unsubscribe header to identify that
# a message was sent from a mailing list using proper headers

# Eventually we should be looking at mailing-list types to see if the from
# address matches that such that we aren't relying on mailing lists always
# sending the correct headers like a number of newsletters seem to do.  Gmail
# for one only requires that the list-unsubscribe header be sent every so often
# and this causes us to miss detecting that those newsletters are still part
# of the same scheme

def handler(msg):
    if 'list-id' in msg["headers"] or 'list-unsubscribe' in msg["headers"]:
        #logger.debug("detected list %s", msg["headers"].get('list-id', msg["headers"].get('list-unsubscribe')))
        recip_target = {'target' : "broadcast",
                        'timestamp': msg['timestamp'],
                        'target-timestamp': ["broadcast", msg['timestamp']]
                        }
        emit_schema('rd.msg.recip-target', recip_target)
