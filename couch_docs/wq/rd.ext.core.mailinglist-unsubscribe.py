# This extension handles most of the process of Raindrop-assisted mailing list
# unsubscription.  Once a user has requested unsubscription via the Raindrop
# front-end, this extension fields the request from the mailing list to confirm
# the unsubscription.  Afterwards it fields the notification from the list
# that the user has been unsubscribed.

# There is no standard for these messages; we have to employ unique techniques
# for each mailing list server software.  For now we do this by hardcoding
# detectors for major servers; in the future there might be a way to abstract
# the detectors into a set of declarations (such that detectors can be simpler
# extensions of this extension) or to define a standard mechanism that we get
# mailing list software vendors to adopt.

# Life cycle of Raindrop-assisted unsubscription:
#
# Initial State:
#   The mailing list status is "subscribed".
#
# Step 1: User Requests Unsubscription
#   The user tells Raindrop's front-end to unsubscribe from a mailing list.
#   Raindrop's front-end sends an unsubscription request to the mailing list.
#   Raindrop's front-end sets the mailing list status to "unsubscribe-pending".
#
# Step 2: List Requests Confirmation
#   The mailing list requests confirmation of the unsubscription request.
#   This extension responds with confirmation of the unsubscription request.
#   This extension sets the mailing list status to "unsubscribe-confirmed".
#
# Final State: User is Unsubscribed
#   The mailing list sends an unsubscription notification to the user.
#   This extension sets the mailing list status to "unsubscribed".

import re
import time

def handler(message):
    # Google Groups Step 2 (List Requests Confirmation) Detector
    # A request is a message from the address "noreply@googlegroups.com"
    # with an "X-Google-Loop: unsub_requested" header.
    if 'from' in message['headers'] and \
        message['headers']['from'][0] == "noreply@googlegroups.com" and \
        'x-google-loop' in message['headers'] and \
        message['headers']['x-google-loop'][0] == 'unsub_requested' and \
        'reply-to' in message['headers']:

        # The list ID is the part of the Reply-To header before the plus sign
        # followed by ".googlegroups.com".  For example, based on the following
        # header the ID is mozilla-labs-personas.googlegroups.com:
        #     Reply-To: mozilla-labs-personas+unsubconfirm-ttVMSQwAAAAyzbmfKdXzOjrwK-0FmDri@googlegroups.com
        list_id = message['headers']['reply-to'][0].split('+')[0] + '.googlegroups.com'
        logger.info('received confirm unsubscribe request from %s', list_id)

        keys = [['rd.core.content', 'key-schema_id',
         [['mailing-list', list_id], 'rd.mailing-list']]]
        result = open_view(keys=keys, reduce=False, include_docs=True)
        # Build a map of the keys we actually got back.
        rows = [r for r in result['rows'] if 'error' not in r]

        if rows:
            list = rows[0]['doc']
            logger.info('found list in datastore')
            if (list['status'] == 'unsubscribe-pending'):
                logger.info('list status is unsubscribe-pending; confirming')
                list['status'] = 'unsubscribe-confirmed'
                update_documents([list])

                # Confirmation entails responding to the address in the Reply-To
                # header, which contains the confirmation token, f.e.:
                #   mozilla-labs-personas+unsubconfirm-ttVMSQwAAAAyzbmfKdXzOjrwK-0FmDri@googlegroups.com
                confirmation = {
                  'from': list['identity'],
                  # TODO: use the user's name in the from_display.
                  'from_display': list['identity'][1],
                  'to': [['email', message['headers']['reply-to'][0]]],
                  'to_display': [''],
                  'subject': '',
                  'body': '',
                  'outgoing_state': 'outgoing'
                };

                # TODO: make a better rd_key.
                emit_schema('rd.msg.outgoing.simple', confirmation,
                            rd_key=['manually_created_doc', time.time()])
            else:
                logger.info('list status is not unsubscribe-pending; ignoring')
        else:
            logger.info("didn't find list; can't confirm request")

    # Google Groups Step 3 (User is Unsubscribed) Detector
    # A request is a message from the address "noreply@googlegroups.com"
    # with an "X-Google-Loop: unsub_success" header.
    elif 'from' in message['headers'] and \
        message['headers']['from'][0] == "noreply@googlegroups.com" and \
        'x-google-loop' in message['headers'] and \
        message['headers']['x-google-loop'][0] == 'unsub_success':

        # The list ID is the part of the Subject header after the text
        # "Google Groups: You have unsubscribed from " followed by
        # ".googlegroups.com".  For example, based on the following header
        # the ID is mozilla-labs-personas.googlegroups.com:
        #     Subject: Google Groups: You have unsubscribed from mozilla-labs-personas
        # TODO: figure out how to extract the list ID from a localized subject.
        list_id = message['headers']['subject'][0]. \
                  split('Google Groups: You have unsubscribed from ', 1)[1] + \
                  '.googlegroups.com'
        logger.info('received unsubscription confirmation from %s', list_id)

        keys = [['rd.core.content', 'key-schema_id',
         [['mailing-list', list_id], 'rd.mailing-list']]]
        result = open_view(keys=keys, reduce=False, include_docs=True)
        # Build a map of the keys we actually got back.
        rows = [r for r in result['rows'] if 'error' not in r]

        if rows:
            list = rows[0]['doc']
            logger.info('found list in datastore')
            if (list['status'] == 'unsubscribe-confirmed'):
                logger.info('list status is unsubscribe-confirmed; setting to unsubscribed')
                list['status'] = 'unsubscribed'
                update_documents([list])
            else:
                logger.info('list status is not unsubscribe-confirmed; ignoring')
        else:
            logger.info("didn't find list; can't update it")

    # Mailman Step 2 (List Requests Confirmation) Detector
    # A request is a message with X-Mailman-Version and X-List-Administrivia
    # headers (the latter set to "yes") with a Reply-To header that contains
    # the string "-confirm+".
    # TODO: find a way to identify a request with greater certainty.
    elif 'x-mailman-version' in message['headers'] \
            and 'x-list-administrivia' in message['headers'] \
            and message['headers']['x-list-administrivia'][0] == "yes" \
            and 'reply-to' in message['headers'] \
            and re.search('-confirm\+', message['headers']['reply-to'][0]):

        # The list ID is in the List-ID header.
        if 'list-id' not in message['headers']:
            logger.info("couldn't determine list ID; ignoring")
            return

        # Extract the ID from the List-ID header.
        match = re.search('([\W\w]*)\s*<(.+)>.*',
                          message['headers']['list-id'][0])
        if (match):
            logger.debug("complex list-id header with name '%s' and ID '%s'",
                  match.group(1), match.group(2))
            list_id = match.group(2)
        else:
            logger.debug("simple list-id header with ID '%s'",
                         message['headers']['list-id'][0])
            list_id = message['headers']['list-id'][0]

        logger.info('received confirm unsubscribe request from %s', list_id)

        keys = [['rd.core.content', 'key-schema_id',
         [['mailing-list', list_id], 'rd.mailing-list']]]
        result = open_view(keys=keys, reduce=False, include_docs=True)
        # Build a map of the keys we actually got back.
        rows = [r for r in result['rows'] if 'error' not in r]

        if not rows:
            logger.info("didn't find list; can't confirm request")
            return

        logger.info('found list in datastore')

        list = rows[0]['doc']

        if (list['status'] != 'unsubscribe-pending'):
            logger.info('list status is not unsubscribe-pending; ignoring')
            return

        logger.info('list status is unsubscribe-pending; confirming')

        # Confirmation entails responding to the address in the Reply-To
        # header, which contains the confirmation token, f.e.:
        #   test-confirm+018e404890076d94e6026d8333c887f8edd0c41f@lists.mozilla.org
        # Also, the subject line must contain the subject of the message
        # requesting confirmation, f.e.:
        #   "Your confirmation is required to leave the test mailing list"
        confirmation = {
          'from': list['identity'],
          # TODO: use the user's name in the from_display.
          'from_display': list['identity'][1],
          'to': [['email', message['headers']['reply-to'][0]]],
          'to_display': [''],
          'subject': message['headers']['subject'][0],
          'body': '',
          'outgoing_state': 'outgoing'
        };

        # TODO: make a better rd_key.
        emit_schema('rd.msg.outgoing.simple', confirmation,
                    rd_key=['manually_created_doc', time.time()])

        list['status'] = 'unsubscribe-confirmed'
        update_documents([list])
