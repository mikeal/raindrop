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

# http://www.flickr.com/services/api/misc.urls.html
BASE58_ALPHABET = "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"

# Grab the hash code from links
# TODO: make these regexps better: they could match parts of a malicious
# link.
flickr_photo_regex = re.compile('flickr.com/photos/[\w@]+/(\d+)/.*')
flickr_canonical_photo_regex = re.compile('flic.kr/p/(['+BASE58_ALPHABET+']+)')

def handler(doc):

    if not 'links' in doc:
        return

    flickrs = {}
    links = doc['links']
    for link in links:
        # Check for normal flickr urls and only add to list if not
        # already in the list.
        match = flickr_photo_regex.search(link['url'])
        if match and match.group(1):
            if not link['url'] in flickrs:
                flickrs[link['url']] = match.group(1)
        else:
            # Try the shortened flickr URL service.
            match = flickr_canonical_photo_regex.search(link['url'])
            if match and match.group(1):
                if not link['url'] in flickrs:
                    flickrs[link['url']] = base58decode(match.group(1))

    if len(flickrs) == 0:
        return

    for link, photo_id in flickrs.items():
        # http://www.flickr.com/services/api/response.json.html
        options = {
            "method"       : "flickr.photos.getInfo",
            # http://www.flickr.com/services/apps/23470/
            "api_key"      : "f6c619b20c6dbe75f9c940cfdf5c2f44",
            "photo_id"     : photo_id,
            "format"       : "json",
            "nojsoncallback" : "1"
        }

        info_api = "http://api.flickr.com/services/rest/?%s" % "&".join(['%s=%s' % v for v in options.items()])
        opener = urllib2.build_opener()
        obj = json.load(opener.open(info_api))

        if obj.get('stat') == "ok":
            schema = obj.get('photo')
            schema['is_attachment'] = True
            schema['ref_link'] = link
            emit_schema('rd.msg.body.flickr', schema)

# This function decodes the special base58 (62 - 4) flic.kr canonical urls
def base58decode(s):
    num = len(s)
    decoded = 0
    multi = 1
    for i in reversed(range(0, num)):
        decoded = decoded + multi * BASE58_ALPHABET.index(s[i])
        multi = multi * len(BASE58_ALPHABET)
    return u"%d" % decoded
