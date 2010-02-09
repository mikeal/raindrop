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

# http://4sq.com/HASH
foursq_path_regex = re.compile('^/(\w+)')

# http://foursquare.com/venue/VID
foursquare_venue_path_regex = re.compile('^/venue/(\d+)')

def handler(doc):
    if not 'links' in doc:
        return

    foursqs = []
    links = doc['links']
    for link in links:
        if link['domain'] == "4sq.com" and foursq_path_regex.search(link['path']):
            try:
                opener = urllib2.build_opener()
                redir = opener.open(link['url'])
                path = urllib2.urlparse.urlparse(redir.url).path
                match = foursquare_venue_path_regex.search(path)
                if match and match.group(1):
                    foursqs.append( (link, match.group(1)) )
            except e:
                logger.error("link: %s error: %s",link['url'], e)
        elif link['domain'] == "foursquare.com":
            match = foursquare_venue_path_regex.search(link['path'])
            if match and match.group(1):
                foursqs.append( (link, match.group(1)) )

    if len(foursqs) == 0:
        return

    for link, hash in foursqs:
        options = {
            'vid'    : hash
        }

        info_api = "http://api.foursquare.com/v1/venue.json?%s" % "&".join(['%s=%s' % v for v in options.items()])
        opener = urllib2.build_opener()
        obj = json.load(opener.open(info_api))
        if obj:
            obj['is_attachment'] = True
            obj["ref_link"] = link['url']
            emit_schema('rd.msg.body.attachment.link.foursquare', obj)
