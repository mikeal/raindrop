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

# Grab the hash code from links
# TODO: make this more resilient to malicious URL use.
bitly_regex = re.compile('bit.ly/(\w+)')

# Creates 'rd.msg.attachment' for bit.ly urls from 'rd.msg.body.quoted.hyperlinks'
def handler(doc):

    if not 'links' in doc:
        return

    bitlys = {}
    links = doc['links']
    for link in links:
        # Check for normal flickr urls and only add to list if not
        # already in the list.
        match = bitly_regex.search(link)
        if match and match.group(1):
            if not link in bitlys:
                bitlys[link] = match.group(1)

    if len(bitlys) == 0:
        return

    for link, hash in bitlys.items():
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
