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

def handler(doc):
    # emit the normalized identity schema
    items = {'nickname': doc['twitter_screen_name']}
    # the rest are optional...
    for dest, src in [
        ('name', 'name'),
        ('url', 'url'),
        ('image', 'profile_image_url'),
        ]:
        val = doc.get('twitter_' + src)
        if val:
            items[dest] = val
    emit_schema('rd.identity', items)

    # and we use the same extension to emit the 'known identities' too...
    def gen_em():
        # the primary 'twitter' one first...
        yield ('twitter', doc['twitter_screen_name']), None
        v = doc.get('twitter_url')
        if v:
            yield ('url', v.rstrip('/')), 'homepage'

    def_contact_props = {'name': doc['twitter_name'] or doc['twitter_screen_name']}
    emit_related_identities(gen_em(), def_contact_props)
