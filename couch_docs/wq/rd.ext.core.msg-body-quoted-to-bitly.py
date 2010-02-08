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
bitly_path_regex = re.compile('^/(\w+)')

# Creates 'rd.msg.attachment' for bit.ly urls from 'rd.msg.body.quoted.hyperlinks'
def handler(doc):
    if not 'links' in doc:
        return

    bitlys = []
    links = doc['links']
    for link in links:
        if link['domain'] in ["bit.ly", "bitly.com", "j.mp"]:
            match = bitly_path_regex.search(link['path'])
            if match and match.group(1):
                bitlys.append( (link['url'], match.group(1)) )

    if len(bitlys) == 0:
        return

    for link, hash in bitlys:
        options = {
            'version' : '2.0.1',
            'login'   : 'bitlyapidemo', # demo API user
            'apiKey'  : 'R_0da49e0a9118ff35f52f629d2d71bf07', # demo API key
            'hash'    : hash
        }

        info_api = "http://api.bit.ly/info?%s" % "&".join(['%s=%s' % v for v in options.items()])
        opener = urllib2.build_opener()
        obj = json.load(opener.open(info_api))

        if obj.get('errorCode') == 0:
            schema = obj.get('results').get(hash)
            schema["is_attachment"] = True
            schema["ref_link"] = link
            emit_schema('rd.msg.body.bit.ly', schema)
