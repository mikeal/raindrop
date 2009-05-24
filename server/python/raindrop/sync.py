import logging

from twisted.internet import reactor, defer, task
from twisted.python.failure import Failure
import twisted.web.error
import paisley

from . import proto as proto
from .config import get_config

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

  def _genAccountSynchs(self, rows):
    self.log.info("Have %d accounts to synch", len(rows))

    # Now see what account-info we have locally so we can merge missing
    # data - particularly the password...
    config_accts = {}
    for acct_name, acct_info in get_config().accounts.iteritems():
      config_accts[acct_info['id']] = acct_info

    to_synch = []
    for row in rows:
      account_details = row['doc']
      acct_id = account_details['id']
      try:
        account_details['password'] = config_accts[acct_id]['password']
      except KeyError:
        pass
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

  @defer.inlineCallbacks
  def sync(self, whateva=None):
    result = yield self.doc_model.open_view('raindrop!content!all',
                                            'by_raindrop_schema',
                                            startkey=['rd/account'],
                                            endkey=['rd/account', {}],
                                            reduce=False,
                                            include_docs=True)

    # we don't use the cooperator here as we want them all to run in parallel.
    _ = yield defer.DeferredList([d for d in self._genAccountSynchs(result['rows'])])

  def _cb_sync_finished(self, result, account):
    if isinstance(result, Failure):
      self.log.error("Account %s failed with an error: %s", account, result)
      if self.options.stop_on_error:
        self.log.info("--stop-on-error specified - re-throwing error")
        result.raiseException()
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
