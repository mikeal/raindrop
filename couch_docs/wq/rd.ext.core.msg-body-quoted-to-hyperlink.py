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
from urllib2 import urlparse

#This regexp could be made smarter, but it is a very diffcult to do
#all the matching with just a regexp. See loop below, it depends on
#how this regexp is constructed.
url_regexp = re.compile('https?:\S+')

remove_regexp = re.compile('[\.,>]$')
start_paren_regexp = re.compile('\(')
end_paren_regexp = re.compile('\)')

# Creates 'rd.msg.body.quoted.hyperlinks' schemas for messages...
def handler(doc):
    parts = doc['parts']
    ret = []
    matches = []
    found = {}
    ret = []

    # Do the raw regexp work to find candidates in all
    # non-quoted parts.
    for part in parts:
        #skip the quoted parts
        if "type" in part and part["type"] == "quote":
            continue
        else:
            raw_urls = url_regexp.findall(part["text"])
            matches.extend(raw_urls)

    # normalize each URL, and only add it once to the schema.
    for match in matches:
        # Remove any trailing period or comma, mostly likely
        # it is an end of a sentence segment.
        match = remove_regexp.sub('', match)

        # If the string ends in a paren, then a bit more tricky step,
        # only remove it if the count of open vs closed is off.
        # Still not bulletproof, but should catch lots of wikipedia URLs.
        if match.endswith(")"):
            if len(start_paren_regexp.findall(match)) != len(start_paren_regexp.findall(match)):
                match = match[:-1]

        # process only the unique urls
        if match in found:
            continue
        found[match] = True

        parse = urlparse.urlparse(match)
        if parse.hostname:
            try: # get the domain name without sub-host names
                domain = parse.hostname[parse.hostname.rindex(".", 0, parse.hostname.rindex(".")) + 1:]
            except:
                domain = parse.hostname

            ret.append({
                        'url' : match,
                        'domain' : domain,
                        'scheme' : parse.scheme,
                        'username' : parse.username or '',
                        'password' : parse.password or '',
                        'hostname' : parse.hostname,
                        'port' : parse.port or '',
                        'path' : parse.path,
                        'params' : parse.params,
                        'query' : parse.query,
                        'fragment' : parse.fragment
                        })

    if len(ret) > 0:
        emit_schema('rd.msg.body.quoted.hyperlinks', {
            "links": ret
        })


