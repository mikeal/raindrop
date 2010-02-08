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

# This extension extracts information about a mailing list through which
# a message has been sent.  It creates rd.mailing-list docs for the mailing
# lists, one per list, and rd.msg.email.mailing-list docs for the emails,
# one per email sent through a list.  All the information about a list
# is stored in its rd.mailing-list doc; a rd.msg.email.mailing-list doc
# just links an email to its corresponding list.

import re

# Dictionary of services we support indexed by the domain name we will be
# looking for in the link
SERVICES = {
  "twitgoo.com" : {
   'prop' : 'path', 'regex' : re.compile('^/(\w+)'),
   'thumb' : "http://twitgoo.com/show/thumb/%s",
   'img' : "http://twitgoo.com/show/img/%s"
   },
  "twitpic.com" : {
   'prop' : 'path', 'regex' : re.compile('^/(\w+)'),
   'thumb' : "http://twitpic.com/show/thumb/%s",
   'img' : "http://twitpic.com/show/img/%s"
   },
  "yfrog.com" : {
   'prop' : 'path', 'regex' : re.compile('^/(\w+)'),
   'thumb' : "http://yfrog.com/%s.th.jpg",
   'img' : "http://yfrog.com/%s.jpg"
   },
  "tweetphoto.com" : {
   'prop' : 'path', 'regex' : re.compile('^/(\d+)'),
   'thumb' : "http://TweetPhotoAPI.com/api/TPAPI.svc/imagefromurl?size=thumbnail&url=http://tweetphoto.com/%s",
   'img' : "http://TweetPhotoAPI.com/api/TPAPI.svc/imagefromurl?size=medium&url=http://tweetphoto.com/%s"
   },
}

# Creates 'rd.msg.body.attachment.link.img' for simple img url services
# If an img url service doesn't fit easily into this pattern we likely want
# to create a separate extension for that type
def handler(doc):
    if not 'links' in doc:
        return

    thumbs = []
    links = doc['links']
    for link in links:
        if link['domain'] in SERVICES:
            prop = SERVICES.get(link['domain']).get('prop')
            match = SERVICES.get(link['domain']).get('regex').search(link[prop])
            if match and match.group(1):
                thumbs.append( (link, match.group(1)) )

    if len(thumbs) == 0:
        return

    for link, hash in thumbs:
        schema = {"thumb"       : SERVICES.get(link['domain']).get('thumb') % hash,
                  "img"         : SERVICES.get(link['domain']).get('img') % hash,
                  "title"       : link['url'],
                  "href"        : link['url'],
                  "userName"    : "",
                  "realName"    : "",
                  "description" : "",
                  "ref_link"    : link['url']
                  }
        emit_schema('rd.msg.body.attachment.link.img', schema)
