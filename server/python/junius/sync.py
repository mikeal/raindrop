import logging

from twisted.internet import reactor, defer
import paisley

import junius.proto as proto
from junius.model import get_db

logger = logging.getLogger(__name__)

_conductor = None
def get_conductor():
  global _conductor
  if _conductor is None:
    _conductor = SyncConductor()
  return _conductor
  
  
class SyncConductor(object):
  def __init__(self):
    self.log = logger

    self.db = get_db()

    self.active_accounts = []

  def _ohNoes(self, failure, *args, **kwargs):
    self.log.error('OH NOES! failure! %s', failure)
    reactor.stop()

  def _getAllAccounts(self):
    return self.db.openView('raindrop!accounts!all', 'all'
      ).addCallback(self._gotAllAccounts
      ).addErrback(self._ohNoes)

  def _gotAllAccounts(self, rows, *args, **kwargs):
    self.log.info("Have %d accounts to synch", len(rows))
    for row in rows:
      account_details = row['value']
      kind = account_details['kind']
      if kind in proto.protocols:
        account = proto.protocols[kind](self.db, account_details)
        self.log.info('Starting sync of %s account: %s',
                      account_details['kind'],
                      account_details.get('name', '(un-named)'))
        account.startSync(self)
        self.active_accounts.append(account)
      else:
        log.error("Don't know what to do with account kind: %s",
                  account_details['kind'])

  def accountFinishedSync(self, account):
    self.active_accounts.remove(account)
    if not self.active_accounts:
      self.log.info("sync has finished; stopping reactor")
      return reactor.stop()

  def sync(self, whateva=None):
    return self._getAllAccounts()


if __name__ == '__main__':
  # normal entry-point is the app itself; this is purely for debugging...
  logging.basicConfig()
  logging.getLogger().setLevel(logging.DEBUG)

  conductor = get_conductor()
  reactor.callWhenRunning(conductor.sync)

  logger.debug('starting reactor')
  reactor.run()
  logger.debug('reactor done')
