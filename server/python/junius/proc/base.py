import logging

__all__ = ['Rat', 'AccountBase']

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

class ConverterBase(object):
    def __init__(self, doc_model):
       self.doc_model = doc_model
