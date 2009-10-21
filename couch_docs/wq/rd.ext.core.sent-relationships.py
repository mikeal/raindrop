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

# An 'identity spawner' which simply looks for identities we send things to.
# This works on normalized 'body' so is suitable for all message objects.
def handler(doc):
    ids = get_my_identities()
    if doc.get('from') in ids:
        # emit_related_identies accepts multiple identities all identifying the
        # same contact - but in the case of emails, each email addy is
        # (presumably) a different person.
        all_to = doc.get('to', []) + doc.get('cc', [])
        all_display = doc.get('to_display', []) + doc.get('cc_display', [])
        for idid, name in zip(all_to, all_display):
            # emit a sequence of (identity_id, relationship) tuples - where
            # all we know about this relationship is it is an email addy...
            emit_related_identities([(idid, 'email')], {'name': name})
