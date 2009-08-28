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
from email.utils import mktime_tz, parsedate_tz

def _get_subscribed_identity(headers):
    # Get the user's email identities and determine which one is subscribed
    # to the mailing list that sent a message with the given headers.

    identities = get_my_identities()
    logger.debug("identities: %s", identities);

    email_identities = [i for i in identities if i[0] == 'email'];

    # TODO: figure out what to do if the user has no email identities.
    if len(email_identities) == 0:
        logger.debug("no email identities")
        return None

    # If the user only has one email identity, it *should* be the one subscribed
    # to the list.
    # XXX could an alias not in the set of identities be subscribed to the list?
    if len(email_identities) == 1:
        logger.debug("one email identity: %s", email_identities[0])
        return email_identities[0]

    logger.debug("multiple email identities: %s", email_identities);

    # If the user has multiple email identities, try to narrow down the one
    # subscribed to the list using the Delivered-To header, which lists will
    # sometimes set to the subscribed email address.
    # TODO: figure out what to do if there are multiple Delivered-To headers.
    if 'delivered_to' in headers:
        logger.debug("Delivered-To: %s", headers['delivered-to']);
        dt_identities = [i for i in email_identities
                           if i[1] == headers['delivered-to'][0]]
        if len(dt_identities) == 1:
            logger.debug("one Delivered-To identity: %s", dt_identities[0])
            return dt_identities[0]

    # TODO: try to use the Received headers to narrow down the identity.

    # We have multiple identities, and we haven't narrowed down the one
    # subscribed to the list.  Pick the first one and hope for the best.
    # XXX Is this what we should be doing?  Maybe we should pick none of them
    # and make the front-end prompt the user for the address with which
    # they are subscribed to the list.
    return email_identities[0]

def _update_list(list, name, message):
    # Update the list based on the information contained in the headers
    # of the provided message.

    # For now we just reflect the literal values of the various headers
    # into the doc; eventually we'll want to do some processing of them
    # to make life easier on the front-end.

    # Note that we don't remove properties not provided by the message,
    # since it doesn't necessarily mean those properties are no longer
    # valid.  This might be an admin message that doesn't include them
    # (Mailman sends these sometimes).

    # Whether or not we changed the list.  We return this so callers
    # who are updating a list that is already stored in the datastore
    # know whether or not they need to update the datastore.
    changed = False

    # Update the name (derived from the list-id header).
    if name != "" and ('name' not in list or list['name'] != name):
        list['name'] = name
        changed = True

    # Update the properties derived from list- headers.
    # XXX reflect other list-related headers like (X-)Mailing-List,
    # Archived-At, and X-Mailman-Version?
    for key in ['list-post', 'list-archive', 'list-help', 'list-subscribe',
                'list-unsubscribe']:
        if key in message['headers']:
            val = message['headers'][key][0]
            # We strip the 'list-' prefix when writing the key to the list.
            if key[5:] not in list or list[key[5:]] != val:
                logger.debug("setting %s to %s", key[5:], val)
                list[key[5:]] = val
                changed = True

    return changed

def handler(doc):
    if 'list-id' not in doc['headers']:
        return

    logger.debug("list-* headers: %s",
                 [h for h in doc['headers'].keys() if h.startswith('list-')])

    list_id = doc['headers']['list-id'][0]
    msg_id = doc['headers']['message-id'][0]

    # Extract the ID and name of the mailing list from the list-id header.
    # Some mailing lists give only the ID, but others (Google Groups, Mailman)
    # provide both using the format 'NAME <ID>', so we extract them separately
    # if we detect that format.
    match = re.search('([\W\w]*)\s*<(.+)>.*', list_id)
    if (match):
        logger.debug("complex list-id header with name '%s' and ID '%s'",
              match.group(1), match.group(2))
        id = match.group(2)
        name = match.group(1)
    else:
        logger.debug("simple list-id header with ID '%s'", list_id)
        id = list_id
        name = ""

    # Extract the timestamp of the message we're processing.
    if 'date' in doc['headers']:
        date = doc['headers']['date'][0]
        if date:
            try:
                timestamp = mktime_tz(parsedate_tz(date))
            except (ValueError, TypeError), exc:
                logger.debug('Failed to parse date %r in doc %r: %s',
                             date, doc['_id'], exc)
                timestamp = 0


    # Retrieve an existing document for the mailing list or create a new one.
    keys = [['rd.core.content', 'key-schema_id',
             [['mailing-list', id], 'rd.mailing-list']]]
    result = open_view(keys=keys, reduce=False, include_docs=True)
    # Build a map of the keys we actually got back.
    rows = [r for r in result['rows'] if 'error' not in r]

    if rows:
        logger.debug("FOUND LIST %s for message %s", id, msg_id)
        assert 'doc' in rows[0], rows

        list = rows[0]['doc']

        # If this message is newer than the last one from which we derived
        # mailing list information, update the mailing list record with any
        # updated information in this message.
        if 'changed_timestamp' not in list \
                or timestamp >= list['changed_timestamp']:
            logger.debug("UPDATING LIST %s from message %s", id, msg_id)
            changed = _update_list(list, name, doc)
            if changed:
                logger.debug("LIST CHANGED; saving updated list")
                list['changed_timestamp'] = timestamp
                update_documents([list])

    else:
        logger.debug("CREATING LIST %s for message %s", id, msg_id)

        list = {
            'id': id,
            'status': 'subscribed',
            'identity': _get_subscribed_identity(doc['headers']),
            'changed_timestamp': timestamp
        }

        _update_list(list, name, doc)

        emit_schema('rd.mailing-list', list, rd_key=["mailing-list", id])


    # Link to the message to its mailing list.
    logger.debug("linking message %s to its mailing list %s", msg_id, id)
    emit_schema('rd.msg.email.mailing-list', { 'list_id': id })
