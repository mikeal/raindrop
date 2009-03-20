import logging

from twisted.internet import reactor, defer
from twisted.python.failure import Failure
import twisted.web.error
import paisley

from . import proto as proto
from .model import get_db

logger = logging.getLogger(__name__)

_conductor = None
from .model import get_doc_model

def get_conductor(options=None):
  global _conductor
  if _conductor is None:
    proto.init_protocols()
    _conductor = SyncConductor(options)
  else:
    assert options is None, 'can only set this at startup'
  return _conductor
  

# XXX - rename this to plain 'Conductor' and move to a different file.
# This 'conducts' synchronization, the work queues and the interactions with
# the extensions and database.
class SyncConductor(object):
  def __init__(self, options):
    self.log = logger
    self.options = options
    # apparently it is now considered 'good form' to pass reactors around, so
    # a future of multiple reactors is possible.
    # We capture it here, and all the things we 'conduct' use this reactor
    # (but later it should be passed to our ctor too)
    self.reactor = reactor

    self.db = get_db()

    self.active_accounts = []

  def _ohNoes(self, failure, *args, **kwargs):
    self.log.error('OH NOES! failure! %s', failure)
    #self.reactor.stop()

  def _getAllAccounts(self):
    return self.db.openView('raindrop!accounts!all', 'all'
      ).addCallback(self._gotAllAccounts
      ).addErrback(self._ohNoes)

  def _gotAllAccounts(self, rows, *args, **kwargs):
    doc_model = get_doc_model()
    self.log.info("Have %d accounts to synch", len(rows))
    for row in rows:
      account_details = row['value']
      kind = account_details['kind']
      self.log.debug("Found account using protocol %s", kind)
      if not self.options.protocols or kind in self.options.protocols:
        if kind in proto.protocols:
          account = proto.protocols[kind](self.db, account_details)
          self.log.info('Starting sync of %s account: %s',
                        kind, account_details.get('name', '(un-named)'))
          account.startSync(self, doc_model)
          self.active_accounts.append(account)
        else:
          self.log.error("Don't know what to do with account kind: %s", kind)
      else:
          self.log.info("Skipping account - protocol '%s' is disabled", kind)

  def sync(self, whateva=None):
    return self._getAllAccounts()

  # The callbacks called by the accounts as they do interesting things.
  # XXX - this kinda sucks - ideally when we start the sync we would get
  # a deferred, which we could add own callback to to manage this.
  # The complication is IMAP - ProtocolFactory based clients don't lend
  # themselves to this.
  def on_synch_finished(self, account, result):
    if isinstance(result, Failure):
      self.log.error("Account %s failed with an error: %s", account, result)
    else:
      self.log.debug("Account %s reports it has finished", account)
    assert account in self.active_accounts, (account, self.active_accounts)
    self.active_accounts.remove(account)
    if not self.active_accounts:
      self.log.info("sync has finished; NOT stopping reactor yet, but I should...")
      #self.log.info("sync has finished; stopping reactor")
      #return self.reactor.stop()

if __name__ == '__main__':
  # normal entry-point is the app itself; this is purely for debugging...
  logging.basicConfig()
  logging.getLogger().setLevel(logging.DEBUG)

  conductor = get_conductor()
  conductor.reactor.callWhenRunning(conductor.sync)

  logger.debug('starting reactor')
  conductor.reactor.run()
  logger.debug('reactor done')
