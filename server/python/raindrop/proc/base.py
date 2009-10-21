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

import logging
import time
from twisted.internet import defer

__all__ = ['Rat', 'AccountBase', 'OutgoingAccountBase']

def get_now():
    return time.time()

logger = logging.getLogger("accounts")

class Rat(object):
  '''
  Account reasons rationale... this is here to make typing easier...
  '''
  #: all whats for this account
  EVERYTHING = 'everything'
  #: the problem is with the server (or the network)
  SERVER = 'server'
  #: the problem is with the account
  ACCOUNT = 'account'

  UNREACHABLE = 'unreachable'
  TIMEOUT = 'timeout'
  PASSWORD = 'password'
  MAINTENANCE = 'maintenance'
  BUSY = 'busy'
  #: something is up with the crypto; this needs to be exploded
  CRYPTO = 'crypto'

  #: 'authorizing' indicates that raindrop is doing auth, and depending on
  # the protocol (eg Skype), may require user interaction with an external
  # application.
  AUTHORIZING = 'authorizing'

  #: good indicates that all-is-well
  GOOD = 'good'
  '''
  Neutral indicates an expected transient lack of success (maintenance,
   overloaded servers, etc.)  It is tracked (rather than silently not updating
   good) because it potentially allows for higher-level logic to escalate
   continued inability to connect to something user-visible.

  For example, twitter being down for short periods of time (at least in the
   past) was business as usual; there would be no reason to notify the user.
   Howerver, if twitter is down for an extended period of time, we want to let
   the user know (in an ambient sort of way) that there's a problem with
   twitter, and that's why they're not getting any messages.

  The primary difference between a TEMPORARY BAD thing and a TEMPORARY NEUTRAL
   thing is that we will let the user know about a TEMPORARY BAD thing
   when it happens.
  '''
  NEUTRAL = 'neutral'
  '''
  Bad indicates an unexpected problem which may be TEMPORARY or PERMANENT.
   Temporary problems are expressed to the user in an ambient fashion when
   they happen, but may not require any action.  If a temporary problem stays
   a problem for an extended period of time, it will be escalated to a
   more explicit notification.  A permanent problem requires user action and
   the user will be immediately notified.

  For example, bad passwords and suspended accounts are permanent problems.  The
   former is actionable within the UI, whereas the latter is not.  However, it
   is important that the user be notified at the earliest opportunity so they
   can take real-world action promptly.  A server being inaccessible is a
   TEMPORARY BAD problem rather than a TEMPORARY NEUTRAL thing because a user
   may benefit from knowing their connection or server is flakey.  (Note:
   temporarily lacking an internet connection is different from a flakey one;
   we don't want to bother the user if we know they don't have a connection.)
  '''
  BAD = 'bad'

  #: temporary implies it may fix itself without user intervention
  TEMPORARY = 'temporary'
  #: permanent implies the user must take some action to correct the problem
  PERMANENT = 'permanent'
  #: unknown means it either doesn't matter or it could be temporary but the
  #:  user should potentially still be informed
  UNKNOWN = 'unknown'


class AccountBase(Rat):
  rd_outgoing_schemas = None # list of 'raw' schemas we can send.
  def __init__(self, doc_model, details):
    self.doc_model = doc_model
    self.details = details
    self.status = {}

  def reportStatus(self, what, state, why=Rat.UNKNOWN,
                   duration=Rat.UNKNOWN, message=None):
    '''
    Report status relating to this account.

    Everything is peachy: EVERYTHING GOOD
    Wrong password: ACCOUNT BAD PASSWORD PERMANENT
    (may be temporary if a bad password can mean many things)
    Can't contact server: SERVER BAD UNREACHABLE TEMPORARY
    Server maintenance: SERVER NEUTRAL MAINTENANCE TEMPORARY
    (indicates a temporary lapse in service but there's not much we can do)
    Server busy: SERVER NEUTRAL BUSY TEMPORARY
    (for example, last.fm will sometimes refuse submission requests)
    '''
    logger.debug("ReportStatus: %s %s (why=%s, duration=%s)",
                 what, state, why, duration)
    self.status = {'what': what,
                   'state': state,
                   'why': why,
                   'duration': duration,
                   'message': message,
    }

  def startSync(self, conductor, options):
    """Check for incoming messages, or do nothing if this account doesn't
    have incoming messages.
    """
    pass

  def startSend(self, conductor, src_doc, raw_doc):
    """Send an outgoing item"""
    # Overview of the send process:
    # * Front-end writes a simplified 'outgoing' schema.
    # * Extension points run, ending up with a 'raw' outgoing type, eg SMTP.
    # * This function manages the sending of the final 'raw' type, but tracks
    #   the sent state in the original simplified outgoing schema.
    # End result is that as state is maintained directly on the source document,
    # re-running the extensions etc will not re-send the message - only modifying
    # the saved state on the source doc will.
    pass

  def get_identities(self):
    """Return a sequence of 'identity ids' for each identity associated with
    this account.

    This is just a helper for the 'bootstrap' process - the 'official'
    location of this list is inside the couch doc holding the account info.
    """
    raise NotImplementedError

  def can_send_from(self, identity):
    """Return True if we can send messages from the specified identity.  Any
    identity may be passed, not just ones returned by get_identities
    (although only one such address is likely to return True)
    """
    return False

  # helper function to manage the 'sent state' for an item.
  @defer.inlineCallbacks
  def _update_sent_state(self, src_doc, new_state, reason=None, message=None,
                         outgoing_state=None):
    # update the doc
    src_doc['sent_state'] = new_state
    src_doc['sent_state_timestamp'] = get_now()
    if reason:
      src_doc['sent_state_reason'] = reason
    elif 'sent_state_reason' in src_doc:
      del src_doc['sent_state_reason']
    if message:
      src_doc['sent_state_message'] = message
    elif 'sent_state_message' in src_doc:
      del src_doc['sent_state_message']
    # By default, we set outgoing state to the sending state - if they wind
    # up being stuck at 'sending' then we may recover later.  outgoing_state
    # might get reset to 'outgoing' of a retry-able error is detected.
    if outgoing_state is None:
        outgoing_state = new_state
    src_doc['outgoing_state'] = outgoing_state
    assert '_id' in src_doc and '_rev' in src_doc, src_doc
    did = self.doc_model.quote_id(src_doc['_id'])
    result = yield self.doc_model.db.saveDoc(src_doc, did)
    # track the _rev for next time...
    src_doc['_rev'] = result['rev']
    logger.debug('set sent state to %(sent_state)r at rev %(_rev)s', src_doc)
