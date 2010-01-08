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
import urllib2, json

# Grab the numeric video code from links
vimeo_video_regex = re.compile('vimeo.com/(\d+)')

# Creates 'rd.msg.attachment' for bit.ly urls from 'rd.msg.body.quoted.hyperlinks'
def handler(doc):

    if not 'links' in doc:
        return

    vimeos = []
    links = doc['links']
    for link in links:
        vimeos += vimeo_video_regex.findall(link)

    if len(vimeos) == 0:
        return

    # uniquify this list
    vimeos = set(vimeos)

    for video_id in vimeos:
        # http://vimeo.com/api/docs/simple-api
        info_api = "http://vimeo.com/api/v2/video/%s.json" % video_id

        opener = urllib2.build_opener()
        # They don't like the urllib user-agent!
        opener.addheaders = [('User-agent', 'Mozilla/5.0')]
        obj = json.load(opener.open(info_api))
        opener.close()

        # Vimeo always returns a list and we only asked for one video
        schema = obj.pop()
        schema["is_attachment"] = True
        emit_schema('rd.msg.body.quoted.hyperlinks.vimeo', schema)
