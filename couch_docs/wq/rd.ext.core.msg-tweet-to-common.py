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

import re
# A 'converter' - takes a rd.msg.tweet.raw as input and creates various
# schema outputs for that message
re_tags = re.compile(r'#(\w+)')

def handler(doc):
    # body schema
    body = doc['twitter_text']
    bdoc = {'from': ['twitter', doc['twitter_user']],
            'from_display': doc['twitter_user_name'],
            'body': body,
            'body_preview': body[:140],
            # we shoved GetCreatedAtInSeconds inside the func tweet_to_raw 
            # to fake having this property that doesn't come with AsDict
            'timestamp': doc['twitter_created_at_in_seconds']
    }
    emit_schema('rd.msg.body', bdoc)
    # and a conversation schema
    conversation_id = 'twitter-%s' % doc.get('twitter_in_reply_to_status_id', doc['twitter_id'])
    cdoc = {'conversation_id': conversation_id}
    emit_schema('rd.msg.conversation', cdoc)
    # and tags
    tags = re_tags.findall(body)
    if tags:
        tdoc = {'tags': tags}
        emit_schema('rd.tags', tdoc)
