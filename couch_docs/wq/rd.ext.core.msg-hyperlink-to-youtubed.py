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
import urllib2, json

# Grab the hash code from links
# TODO: make this more robust to malicious use.
youtube_regex = re.compile("youtube\.com\/watch\?v=([A-Za-z0-9._%-]*)[&\w;=\+_\-]*")
youtube_short_regex = re.compile("youtu\.be\/([A-Za-z0-9._%-]*)[&\w;=\+_\-]*")

# Creates 'rd.msg.body.youtubed' schemas for emails...
def handler(doc):
    #Skip docs that do not have a links property.
    if not 'links' in doc:
        return

    youtubes = {}
    links = doc['links']
    for link in links:
        # Check for normal youtube urls and only add to list if not
        # already in the list.
        match = youtube_regex.search(link) or youtube_short_regex.search(link)
        if match and match.group(1):
            if not link in youtubes:
                youtubes[link] = match.group(1)

    if len(youtubes) == 0:
        return

    for link, hash in youtubes.items():
        logger.debug("working on youtube video http://www.youtube.com/watch?v=%s ", hash)
        gdata_api = "http://gdata.youtube.com/feeds/api/videos/%s?v=2&alt=json" % hash
        try:
            opener = urllib2.build_opener()
            obj = json.load(opener.open(gdata_api))
            opener.close()

            obj = obj.get("entry")
            obj["is_attachment"] = True
            obj['ref_link'] = link
            emit_schema('rd.msg.body.youtubed', obj)
        except urllib2.HTTPError, exc:
            if exc.code == 404:
                logger.debug("404 at video: http://www.youtube.com/watch?v=%s",
                              hash)
            pass
