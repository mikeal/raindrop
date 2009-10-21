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

from urllib2 import HTTPError # errors thrown by twitter...
import twitter

from raindrop.proto.twitter import user_to_raw


# Twitter identities...
_twitter_id_converter = None

def handler(doc):
    typ, (id_type, id_id) = doc['rd_key']
    assert typ=='identity' # Must be an 'identity' to have this schema type!
    if id_type != 'twitter':
        # Not a twitter ID.
        return

    # if we already have a twitter.raw schema for the user just skip it
    # XXX - later we should check the items are accurate...
    key = ['rd.core.content', 'key-schema_id', [doc['rd_key'], 'rd.identity.twitter']]
    results = open_view(key=key, reduce=False)
    if results['rows']:
        logger.debug("already seen this twitter user - skipping")
        return
    
    # Is a new twitter ID - attach to twitter and process it.
    global _twitter_id_converter
    if _twitter_id_converter is None:
        _twitter_id_converter = twitter.Api()
    twit = _twitter_id_converter

    try:
        user = twit.GetUser(id_id)
    # *sob* - twitter package causes urllib2 errors :(
    except HTTPError, exc:
        if exc.code == 400:
            raise RuntimeError("we seem to have saturated twitter - "
                               "please try again in an hour or so...")
        elif exc.code == 404:
            logger.info("twitter user %r does not exist", id_id)
            return
        else:
            raise

    items = user_to_raw(user)
    emit_schema('rd.identity.twitter', items)
