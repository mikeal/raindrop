import re

#This regexp could be made smarter, but it is a very diffcult to do
#all the matching with just a regexp. See loop below, it depends on
#how this regexp is constructed.
url_regexp = re.compile('https?:\S+')

remove_regexp = re.compile('[\.,]$')
start_paren_regexp = re.compile('\(')
end_paren_regexp = re.compile('\)')

# Creates 'rd.msg.body.quoted.hyperlinks' schemas for messages...
def handler(doc):
    parts = doc['parts']
    ret = []
    matches = []
    found = {}    

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
                match = match[0:len(match) - 1]

        # Make sure it is unique
        if not match in found:
            ret.append(match)
            found[match] = 1

    return ret
    #if len(ret) > 0:
    #    emit_schema('rd.msg.body.quoted.hyperlinks', {
    #        "links": ret
    #    })


print handler({
    "parts": [
    {
      "text": "Greetings, person.\n\nA category to which you have subscribed has been updated. http://bit.ly/HQFyP\nTo view the thread, navigate to http://www.example.com/2009/01/01/upcoming-events-new-york-london\n\n--\nThis is an automatic message from Test.\nTo manage your subscriptions, browse to http://www.example.com/user/1/subscriptions\nNow to do something weird things.\n here is a link to a wikipedia URL with parentheses \nhttp://en.wikipedia.org/wiki/Sport_(disambiguation) Then something within parentheses (http://en.wikipedia.org/wiki/Sport_(magazine)), and then something that has a period on the end of it: http://python.org/about/index.html."
    },
    {
      "type": "quote",
      "text": "This URL should not be picked up: http://example.com/quoted ok?"
    },
    {
      "text": "http://mozilla.com, These URLs should be picked up. Something with a comma in it, http://example.com/something/0,123,133.html, but do not get the last comma. And something on the end. http://bit.ly/HQFyP"
    } 
  ] 
})