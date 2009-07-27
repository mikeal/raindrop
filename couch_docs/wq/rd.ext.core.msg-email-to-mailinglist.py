# This extension extracts information about a mailing list through which
# a message has been sent.  It creates rd.mailing-list docs for the mailing
# lists, one per list, and rd.msg.email.mailing-list docs for the emails,
# one per email sent through a list.  All the information about a list
# is stored in its rd.mailing-list doc; a rd.msg.email.mailing-list doc
# just links an email to its corresponding list.

# We extract mailing list info from RFC 2369 headers, which look like this:
#
#   Mailing-List: list raindrop-core@googlegroups.com;
#       contact raindrop-core+owner@googlegroups.com
#   List-Id: <raindrop-core.googlegroups.com>
#   List-Post: <mailto:raindrop-core@googlegroups.com>
#   List-Help: <mailto:raindrop-core+help@googlegroups.com>
#   List-Unsubscribe: <http://googlegroups.com/group/raindrop-core/subscribe>,
#       <mailto:raindrop-core+unsubscribe@googlegroups.com>

# Here's another example (with some other headers that may be relevant):

#   Archived-At: <http://www.w3.org/mid/49F0D9FC.6060103@w3.org>
#   Resent-From: public-webapps@w3.org
#   X-Mailing-List: <public-webapps@w3.org> archive/latest/3067
#   Sender: public-webapps-request@w3.org
#   Resent-Sender: public-webapps-request@w3.org
#   Precedence: list
#   List-Id: <public-webapps.w3.org>
#   List-Help: <http://www.w3.org/Mail/>
#   List-Unsubscribe: <mailto:public-webapps-request@w3.org?subject=unsubscribe>

# XXX Split this into two extensions, one that extracts mailing list info
# and makes sure the mailing list doc exists and one that simple associates
# the message with its mailing list.  That will improve performance,
# because the latter task performs no queries so can be batched.

import re

def handler(doc):
    if 'list-id' not in doc['headers']:
        return

    logger.debug("list-* headers: %s",
                 [h for h in doc['headers'].keys() if h.startswith('list-')])

    list_id = doc['headers']['list-id'][0]
    msg_id = doc['headers']['message-id'][0]

    # Extract the ID and name of the mailing list from the message headers.
    # Note: I haven't actually seen a list-id value that includes the name
    # of the list, but this regexp was in the old JavaScript code for extracting
    # mailing list meta-data, so we do it here too.
    match = re.search('([\W\w]*)\s*<(.+)>.*', list_id)
    if (match):
        logger.debug("complex list-id header with name '%s' and ID '%s'",
              match.group(1), match.group(2))
        id = match.group(2)
        name = match.group(1)
    else:
        logger.debug("simple list-id header with ID '%s'", list_id)
        # In the absence of an explicit name, use the ID as the name.
        # XXX Should we perhaps leave the name blank here and make the front-end
        # do the deriving of it?  After all, it already does some additional
        # deriving, since it strips the @host.tld portion from this value.
        id = list_id
        name = ""


    # Retrieve an existing document for the mailing list or create a new one.
    keys = [['rd.core.content', 'key-schema_id',
             [['mailing-list', id], 'rd.mailing-list']]]
    result = open_view(keys=keys, reduce=False, include_docs=True)
    # Build a map of the keys we actually got back.
    rows = [r for r in result['rows'] if 'error' not in r]
    if rows:
        logger.debug("FOUND LIST %s for message %s", id, msg_id)
        assert 'doc' in rows[0], rows
        # TODO update the list info if it has changed, including its status
        # (i.e. subscribed), but only if the message we are currently processing
        # is newer than the message from which we derived the list info
        # we currently have in the datastore (newer messages are considered
        # more authoritative, but we can't assume that we're processing messages
        # in chronological order).
    else:
        logger.debug("CREATING LIST %s for message %s", id, msg_id)
    
        # For now just reflect the literal values of the various headers
        # into the doc; eventually we'll want to do some processing of them
        # to make life easier on the front-end.
        # XXX reflect other list-related headers like (X-)Mailing-List
        # and Archived-At?
        list = { 'id': id, 'status': 'subscribed' }
        if name != "":
            list['name'] = name
        for key in ['list-post', 'list-archive', 'list-help', 'list-subscribe',
                    'list-unsubscribe']:
            if key in doc['headers']:
                val = doc['headers'][key][0]
                logger.debug("setting %s to %s", key[5:], val)
                list[key[5:]] = val

        emit_schema('rd.mailing-list', list, rd_key=["mailing-list", id])


    # Link to the message to its mailing list.
    logger.debug("linking message %s to its mailing list %s", msg_id, id)
    emit_schema('rd.msg.email.mailing-list', { 'list_id': id })
