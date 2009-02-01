import logging

from twisted.internet import reactor, defer
import paisley

import junius.config
import junius.proto as proto

config = junius.config.get_config()

DB = None
def get_db(couchname="local"):
  global DB
  if DB is None:
    local = config.couches['local']
    DB = paisley.CouchDB(local['host'], local['port'], local['name'])
  return DB

class SyncConductor(object):
  def __init__(self):
    self.log = logging.getLogger('sync')

    self.db = get_db()
    self.db_name = config.db

    self.active_accounts = []

  def _ohNoes(self, failure, *args, **kwargs):
    self.log.error('OH NOES! failure! %s', str(failure))
    reactor.stop()

  def _getAllAccounts(self):
    return self.db.openView('accounts', 'all'
      ).addCallBack(self._gotAllAccounts
      ).addErrback(self._ohNoes)

  def _gotAllAccounts(self, rows, *args, **kwargs):
    for row in rows:
      account_details = row['value']
      if account_details['kind'] in proto.protocols:
        account = proto.protocols[account['kind']](self.db, account_details)
        log.info('Starting sync of %s account: %s',
                 account_details['kind'],
                 account_details.get('name', '(un-named)'))
        account.startSync(self)
        self.active_accounts.append(account)
      else:
        log.error("Don't know what to do with account kind: %s",
                  account_details['kind'])

  def sync(self):
    reactor.callWhenRunning(self._getAllAccounts)
    self.log.debug('starting reactor')
    reactor.run()
    self.log.debug('reactor done')


if __name__ == '__main__':
  conductor = SyncConductor()
  conductor.sync()
