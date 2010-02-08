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

# http://www.youtube.com/watch?v=YOUTUBE_ID
youtube_query_regex = re.compile("v=([A-Za-z0-9._%-]*)[&\w;=\+_\-]*")
# http://www.youtube.com/v/YOUTUBE_ID
youtube_path_regex = re.compile("^/v/([A-Za-z0-9._%-]*)")
# http://youtu.be/YOUTUBE_ID
youtube_short_path_regex = re.compile("^/([A-Za-z0-9._%-]*)[&\w;=\+_\-]*")

# Creates 'rd.msg.body.youtubed' schemas for emails...
def handler(doc):
    if not 'links' in doc:
        return

    youtubes = []
    links = doc['links']
    for link in links:
        if link['domain'] == "youtube.com":
            match = youtube_query_regex.search(link['query']) or youtube_path_regex.search(link['path'])
            if match and match.group(1):
                youtubes.append( (link['url'], match.group(1)) )
        elif link['domain'] == "youtu.be":
            match = youtube_short_path_regex.search(link['path'])
            if match and match.group(1):
                youtubes.append( (link['url'], match.group(1)) )

    if len(youtubes) == 0:
        return

    for link, hash in youtubes:
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
