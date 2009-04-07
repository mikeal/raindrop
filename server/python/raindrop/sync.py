import logging

from twisted.internet import reactor, defer, task
from twisted.python.failure import Failure
import twisted.web.error
import paisley

from . import proto as proto

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
    self.coop = task.Cooperator()
    reactor.addSystemEventTrigger("before", "shutdown", self._kill_coop)
    self.doc_model = get_doc_model()

    self.active_accounts = []

  def _kill_coop(self):
    logger.debug('stopping the coordinator')
    self.coop.stop()
    logger.debug('coordinator stopped')

  def _ohNoes(self, failure, *args, **kwargs):
    self.log.error('OH NOES! failure! %s', failure)

  def _getAllAccounts(self):
    return self.doc_model.open_view('raindrop!accounts!all', 'all'
      ).addCallback(self._gotAllAccounts
      ).addErrback(self._ohNoes)

  def _gotAllAccounts(self, result):
    # we don't use the cooperator here as we want them all to run in parallel.
    return defer.DeferredList([d for d in self._genAccountSynchs(result['rows'])])

  def _genAccountSynchs(self, rows):
    self.log.info("Have %d accounts to synch", len(rows))
    to_synch = []
    for row in rows:
      account_details = row['value']
      kind = account_details['kind']
      self.log.debug("Found account using protocol %s", kind)
      if not self.options.protocols or kind in self.options.protocols:
        if kind in proto.protocols:
          account = proto.protocols[kind](self.doc_model, account_details)
          self.log.info('Starting sync of %s account: %s',
                        kind, account_details.get('name', '(un-named)'))
          self.active_accounts.append(account)
          yield account.startSync(self
                    ).addBoth(self._cb_sync_finished, account)
        else:
          self.log.error("Don't know what to do with account kind: %s", kind)
      else:
          self.log.info("Skipping account - protocol '%s' is disabled", kind)

  def sync(self, whateva=None):
    return self._getAllAccounts()

  def _cb_sync_finished(self, result, account):
    if isinstance(result, Failure):
      self.log.error("Account %s failed with an error: %s", account, result)
    else:
      self.log.debug("Account %s finished successfully", account)
    assert account in self.active_accounts, (account, self.active_accounts)
    self.active_accounts.remove(account)
    if not self.active_accounts:
      self.log.info("all accounts have finished synchronizing")


if __name__ == '__main__':
  # normal entry-point is the app itself; this is purely for debugging...
  logging.basicConfig()
  logging.getLogger().setLevel(logging.DEBUG)

  conductor = get_conductor()
  conductor.reactor.callWhenRunning(conductor.sync)

  logger.debug('starting reactor')
  conductor.reactor.run()
  logger.debug('reactor done')
