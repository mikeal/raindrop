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
  PASSWORD = 'password'
  MAINTENANCE = 'maintenance'
  BUSY = 'busy'
  #: something is up with the crypto; this needs to be exploded
  CRYPTO = 'crypto'

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
  def __init__(self, doc_model, details):
    self.doc_model = doc_model
    self.details = details

  def reportStatus(self, what, state, why=Rat.UNKNOWN,
                   expectedDuration=Rat.UNKNOWN):
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
                 what, state, why, expectedDuration)

  def sync(self):
    pass

  def verify(self):
    '''
    '''
    pass


# The base class for something which 'sends' an item of content, such as an
# email or tweet.  All senders share a common base model for performing the
# 'transaction' with the real outgoing service (eg, the SMTP server) and the
# couch to take care not to send items multiple time.
# Overview of the send process:
# * Front-end writes a simplified 'outgoing' schema.
# * Extension points run, ending up with a 'raw' outgoing type, eg SMTP.
# * This class manages the sending of the final 'raw' type, but tracks the
#   sent state in the original simplified outgoing schema.
# End result is that as state is maintained directly on the source document,
# re-running the extensions etc will not re-send the message - only modifying
# the saved state on the source doc will.
class ContentSender(Rat):
  def __init__(self, doc_model, source_doc, out_doc):
    self.source_doc = source_doc # simplified outgoing schema
    self.out_doc = out_doc # raw document suitable

class OutgoingAccountBase(AccountBase):
  rd_outgoing_schemas = None # list of 'raw' schemas we can handle.

  def sync_outgoing(self, src_doc, raw_doc):
    # A key difference to 'sync' is that our conductor etc determines the
    # queue of outgoing docs and passes them to us.

    # src_doc - the doc where 'sent' state (and only that) should be written.
    # raw_doc - the 'transformed' doc with the raw data ready to send.

    # NOTE: These asserts are never executed - they are just 'logical'
    # assertions :) Feel free to copy them to your handler.
    # 'drafts' etc should have been intercepted before here...
    assert src_doc['outgoing_state']['state'] == 'outgoing', src_doc
    # The 'sent state' must be nothing or a previous error.
    assert src_doc['sent_state'] is None or \
           src_doc['sent_state']['state'] in [None, 'error'], src_doc
    raise NotImplementedError

  @defer.inlineCallbacks
  def _update_sent_state(self, src_doc, new_state, reason=None, message=None):
    # update the doc
    sent_state = src_doc['sent_state']
    sent_state['state'] = new_state
    sent_state['timestamp'] = get_now()
    if reason:
      sent_state['reason'] = reason
    elif 'reason' in sent_state:
      del sent_state['reason']
    if message:
      sent_state['message'] = reason
    elif 'message' in sent_state:
      del sent_state['message']
    assert '_id' in src_doc and '_rev' in src_doc, src_doc
    did = self.doc_model.quote_id(src_doc['_id'])
    result = yield self.doc_model.db.saveDoc(src_doc, did)
    # track the _rev for next time...
    src_doc['_rev'] = result['rev']
    logger.debug('set sent state to %(sent_state)s at rev %(_rev)s', src_doc)
