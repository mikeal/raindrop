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
          def_done = account.startSync(self)
          if def_done is not None:
            yield def_done.addBoth(self._cb_sync_finished, account)
        else:
          self.log.error("Don't know what to do with account kind: %s", kind)
      else:
          self.log.info("Skipping account - protocol '%s' is disabled", kind)

  @defer.inlineCallbacks
  def _process_outgoing_row(self, row, outgoing_handlers, pipeline):
    val = row['value']
    # push it through the pipeline.
    todo = {val['rd_schema_id']: [(row['id'], val['_rev'])]}
    _ = yield pipeline.sync_processor.process_schema_items(todo)

    # Now attempt to find the 'outgoing' message.
    keys = []
    for ot in outgoing_handlers:
      keys.append(['rd.core.content', 'key-schema_id', [val['rd_key'], ot]])
    out_schema = None
    out_result = yield self.doc_model.open_view(keys=keys, reduce=False)
    for out_row in out_result['rows']:
      if 'error' not in row:
        # hrm - I don't think we want to let multiple accounts handle the
        # same item without more thought...
        if out_schema is not None:
          raise RuntimeError, "Found multiple outgoing schemas!!"
        out_schema = out_row['value']['rd_schema_id']
        out_id = out_row['id']
        break
    else:
      raise RuntimeError("the queues failed to create an outgoing schema")
    logger.info('found outgoing message with schema %s', out_schema)
    # open the original source doc and the outgoing schema we just found.
    dids = [row['id'], out_id]
    src_doc, out_doc = yield self.doc_model.open_documents_by_id(dids)
    if src_doc['_rev'] != val['_rev']:
      raise RuntimeError('the document changed since it was processed.')
    sender = outgoing_handlers[out_schema]
    _ = yield sender.startSend(self, src_doc, out_doc)

  @defer.inlineCallbacks
  def sync_outgoing(self, outgoing_handlers, pipeline):
    # XXX - we need a registry of 'outgoing source docs'.
    source_schemas = ['rd.msg.outgoing.simple']

    keys = []
    for ss in source_schemas:
      keys.append([ss, 'outgoing_state', 'outgoing'])

    result = yield self.doc_model.open_view(keys=keys, reduce=False)
    for row in result['rows']:
      logger.info("found outgoing document %(id)r", row)
      try:
        _ = yield self._process_outgoing_row(row, outgoing_handlers, pipeline)
      except Exception:
        logger.error("Failed to process doc %r\n%s", row['id'],
                     Failure().getTraceback())
    logger.info("outgoing sync done")

  @defer.inlineCallbacks
  def sync(self, pipeline):
    if not self.options.no_process:
      pipeline.prepare_sync_processor()
    try:
      # get all accounts from the couch.
      key = ['rd.core.content', 'schema_id', 'rd.account']
      result = yield self.doc_model.open_view(key=key, reduce=False,
                                              include_docs=True)

      dl = [d for d in self._genAccountSynchs(result['rows'])]
      out_handlers = {}
      for aa in self.active_accounts:
        out_schemas = aa.rd_outgoing_schemas
        if out_schemas:
          for sid in out_schemas:
            out_handlers[sid] = aa
      if out_handlers:
        dl.append(self.sync_outgoing(out_handlers, pipeline))
      # we don't use the cooperator here as we want them all to run in parallel.
      _ = yield defer.DeferredList(dl)
    finally:
      if not self.options.no_process:
        num = pipeline.finish_sync_processor()
        logger.info("generated %d documents", num)

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
