from twisted.internet import protocol, ssl, defer, error, task
from twisted.mail import imap4
from twisted.python.failure import Failure
import logging
from email.utils import mktime_tz, parsedate_tz
import time
import re

from ..proc import base
from ..model import DocumentSaveError

brat = base.Rat

logger = logging.getLogger(__name__)

# Set this to see IMAP lines printed to the console.
# NOTE: lines printed may include your password!
TRACE_IMAP = False

NUM_QUERYERS = 3
NUM_FETCHERS = 3


def log_exception(msg, *args):
  # inlineCallbacks don't work well with the logging module's handling of
  # exceptions - we need to use the Failure() object...
  msg = (msg % args) + "\n" + Failure().getTraceback()
  logger.error(msg)

def get_rdkey_for_email(msg_id):
  # message-ids must be consistent everywhere we use them, and we decree
  # the '<>' is stripped (if for no better reason than the Python email
  # package's 'unquote' function will strip them by default...
  if msg_id.startswith("<") and msg_id.endswith(">"):
    msg_id = msg_id[1:-1]
  return ("email", msg_id)

# Finding an imap ENVELOPE structure with non-character data isn't good -
# couch can't store it (except in attachments) and we can't do anything with
# it anyway.  It *appears* from the IMAP spec that only 7bit data is valid,
# so that is what we check
def check_envelope_ok(env):
  # either strings, or (nested) lists of strings.
  def flatten(what):
    ret = []
    for item in what:
      if item is None:
        pass
      elif isinstance(what, str):
        ret.append(what)
      elif isinstance(what, list):
        ret.extend(flatten(item))
      else:
        raise TypeError, what
    return ret

  for item in flatten(env):
    try:
      item.encode('ascii')
    except UnicodeError:
      return False
  return True

class ImapClient(imap4.IMAP4Client):
  def _defaultHandler(self, tag, rest):
    # XXX - worm around a bug related to MismatchedQuoting exceptions.
    # Probably: http://twistedmatrix.com/trac/ticket/1443
    # "[imap4] mismatched quoting spuriously raised" - raised early 2006 :(
    try:
      imap4.IMAP4Client._defaultHandler(self, tag, rest)
    except imap4.MismatchedQuoting, exc:
      logger.warn('ignoring mismatched quoting error: %s', exc)
      # The rest seems necessary to 'gracefully' ignore the error.
      cmd = self.tags[tag]
      cmd.defer.errback(exc)
      del self.tags[tag]
      self.waiting = None
      self._flushQueue()
      # *sob* - but it doesn't always do a great job at ignoring them - most
      # other handlers of imap4.IMAP4Exceptions are also handling this :(

  def serverGreeting(self, caps):
    logger.debug("IMAP server greeting: capabilities are %s", caps)
    return self._doAuthenticate()

  def _doAuthenticate(self):
    def return_self(_):
      return self.deferred.callback(self)
    if self.account.details.get('crypto') == 'TLS':
      d = self.startTLS(self.factory.ctx)
      d.addCallback(self._doLogin)
    else:
      d = self._doLogin()
    d.addCallback(return_self)
    return d

  def _doLogin(self, *args, **kwargs):
    return self.login(self.account.details['username'],
                      self.account.details['password'])

  def xlist(self, reference, wildcard):
    # like 'list', but does XLIST.  Caller is expected to have checked the
    # server offers this capability.
    cmd = 'XLIST'
    args = '"%s" "%s"' % (reference, wildcard.encode('imap4-utf-7'))
    resp = ('XLIST',)
    # Have I mentioned I hate the twisted IMAP client yet today?
    # Tell the Command class about the new XLIST command...
    cmd = imap4.Command(cmd, args, wantResponse=resp)
    cmd._1_RESPONSES = cmd._1_RESPONSES  + ('XLIST',)
    d = self.sendCommand(cmd)
    d.addCallback(self.__cbXList, 'XLIST')
    return d

  # *sob* - duplicate the callback due to twisted using private '__'
  # attributes...
  def __cbXList(self, (lines, last), command):
    results = []
    for L in lines:
        parts = imap4.parseNestedParens(L)
        if len(parts) != 4:
            raise imap4.IllegalServerResponse, L
        if parts[0] == command:
            parts[1] = tuple(parts[1])
            results.append(tuple(parts[1:]))
    return results

  if TRACE_IMAP:
    def sendLine(self, line):
      print 'C: %08x: %s' % (id(self), repr(line))
      return imap4.IMAP4Client.sendLine(self, line)
  
    def lineReceived(self, line):
      if len(line) > 50:
        lrepr = repr(line[:50]) + (' <+ %d more bytes>' % len(line[50:]))
      else:
        lrepr = repr(line)
      print 'S: %08x: %s' % (id(self), lrepr)
      return imap4.IMAP4Client.lineReceived(self, line)


class ImapProvider(object):
  # The 'id' of this extension
  # XXX - should be managed by our caller once these 'protocols' become
  # regular extensions.
  rd_extension_id = 'proto.imap'

  def __init__(self, account, conductor, options):
    self.account = account
    self.options = options
    self.conductor = conductor
    self.doc_model = account.doc_model
    # We have a couple of queues to do the work
    self.query_queue = defer.DeferredQueue() # IMAP folder etc query requests 
    self.fetch_queue = defer.DeferredQueue() # IMAP message fetch requests
    self.updated_folder_infos = None

  @defer.inlineCallbacks
  def write_items(self, items):
    try:
      _ = yield self.conductor.pipeline.provide_schema_items(items)
    except DocumentSaveError, exc:
      # So - conflicts are a fact of life in this 'queue' model: we check
      # if a record exists and it doesn't, so we queue the write.  By the
      # time the write gets processed, it may have been written by a
      # different extension...
      conflicts = []
      for info in exc.infos:
        if info['error']=='conflict':
          # The only conflicts we are expecting are creating the rd.msg.rfc822
          # schema, which arise due to duplicate message IDs (eg, an item
          # in 'sent items' and also the received copy).  Do a 'poor-mans'
          # check that this is indeed the only schema with a problem...
          if not info.get('id', '').endswith('!rd.msg.rfc822'):
            raise
          conflicts.append(info)
        else:
          raise
      if not conflicts:
        raise # what error could this be??
      # so, after all the checking above, a debug log is all we need for this
      logger.debug('ignored %d conflict errors writing this batch (first 3=%r)',
                   len(conflicts), conflicts[:3])

  @defer.inlineCallbacks
  def maybe_queue_fetch_items(self, folder_path, infos):
    if not infos:
      return
    by_uid = yield self._findMissingItems(folder_path, infos)
    if not by_uid:
      return
    self.fetch_queue.put((self._processFolderBatch, (folder_path, by_uid)))

  @defer.inlineCallbacks
  def _reqList(self, conn, *args, **kwargs):
    self.account.reportStatus(brat.EVERYTHING, brat.GOOD)
    caps = yield conn.getCapabilities()
    if 'XLIST' in caps:
      result = yield conn.xlist('', '*')
      kind = self.account.details.get('kind','')
      if kind is '':
        logger.warning("set kind=gmail for account %s in your .raindrop for correct settings",
                        self.account.details.get('id',''))
    else:
      logger.warning("This IMAP server doesn't support XLIST, so performance may suffer")
      result = yield conn.list('', '*')
    # quickly scan through the folders list building the ones we will
    # process and the order.
    logger.info("examining folders")
    folders_use = []
    # First pass - filter folders we don't care about.
    for flags, delim, name in result:
      ok = True
      for flag in (r'\Noselect', r'\AllMail', r'\Trash', r'\Spam'):
        if flag in flags:
          logger.debug("'%s' has flag %r - skipping", name, flag)
          ok = False
          break
      if ok and self.options.folders and \
         name.lower() not in [o.lower() for o in self.options.folders]:
        logger.debug('skipping folder %r - not in specified folder list', name)
        ok = False
      if ok:
        folders_use.append((flags, delim, name ))

    # Second pass - prioritize the folders into the order we want to
    # process them - 'special' ones first in a special order, then remaining
    # top-level folders the order they appear, then sub-folders in the order
    # they appear...
    special_flags = [r'\Inbox', r'\Sent', r'\Drafts'] # indexes into special
    special = [None] * len(special_flags) # None means 'not found'
    todo_top = []
    todo_sub = []

    if 'XLIST' in caps:
      for flags, delim, name in folders_use:
        folder_info = (delim, name)
        special_index = None
        for flag in flags:
          try:
            ndx = special_flags.index(flag)
          except ValueError:
            pass
          else:
            special[ndx] = folder_info
            break
        else:
          # for loop wasn't broken - no special tags...
          if delim in name:
            todo_sub.append(folder_info)
          else:
            todo_top.append(folder_info)
    else:
      # older mapi server - just try and find the inbox.
      for flags, delim, name in folders_use:
        folder_info = (delim, name)
        if delim in name:
          todo_sub.append(folder_info)
        elif name.lower()=='inbox':
          todo_top.insert(0, folder_info)
        else:
          todo_top.append(folder_info)

    todo = [n for n in special if n is not None] + todo_top + todo_sub
    try:
      _ = yield self._updateFolders(conn, todo)
    except:
      log_exception("Failed to update folders")
    # and tell the query queue everything is done.
    self.query_queue.put(None)

  @defer.inlineCallbacks
  def _checkQuickRecent(self, conn, folder_path, max_to_fetch):
    _ = yield conn.select(folder_path)
    nitems = yield conn.search("((OR UNSEEN (OR RECENT FLAGGED))"
                               " UNDELETED SMALLER 50000)", uid=True)
    if not nitems:
      logger.debug('folder %r has no quick items', folder_path)
      return
    nitems = nitems[-max_to_fetch:]
    batch = imap4.MessageSet(nitems[0], nitems[-1])
    results = yield conn.fetchAll(batch, uid=True)
    logger.info('folder %r has %d quick items', folder_path, len(results))
    # Make a simple list.
    infos = [results[seq] for seq in sorted(int(k) for k in results)
             if self.shouldFetchMessage(results[seq])]
    _ = yield self.maybe_queue_fetch_items(folder_path, infos)

  @defer.inlineCallbacks
  def _updateFolders(self, conn, all_names):
    # Fetch all state cache docs for all mailboxes in one go.
    # XXX - need key+schema here, but we don't use multiple yet.
    acct_id = self.account.details.get('id')
    startkey = ['rd.core.content', 'key', ['imap-mailbox', [acct_id]]]
    endkey = ['rd.core.content', 'key', ['imap-mailbox', [acct_id, {}]]]
    results = yield self.doc_model.open_view(startkey=startkey,
                                             endkey=endkey, reduce=False,
                                             include_docs=True)
    # build a map of the docs keyed by folder-name.
    caches = {}
    for row in results['rows']:
      doc = row['doc']
      folder_name = doc['rd_key'][1][1]
      if doc['rd_schema_id'] == 'rd.core.error':
        # ack - failed last time for some reason - skip it.
        continue
      assert doc['rd_schema_id'] in ['rd.imap.mailbox-cache',
                                     'rd.core.error'], doc ## fix me above
      caches[folder_name] = doc
    logger.debug('opened cache documents for %d folders', len(caches))

    # All folders without cache docs get the special 'fetch quick'
    # treatment...
    for delim, name in all_names:
      if name not in caches:
        self.query_queue.put((self._checkQuickRecent, (name, 20)))

    # We only update the cache of the folder once all items from that folder
    # have been written, so extensions only run once all items fetched.
    assert not self.updated_folder_infos
    self.updated_folder_infos = []

    for delim, name in all_names:
      self.query_queue.put((self._updateFolderFromCache, (caches, delim, name)))

  @defer.inlineCallbacks
  def _updateFolderFromCache(self, conn, cache_docs, folder_delim, folder_name):
    # Now queue the updates of the folders
    acct_id = self.account.details.get('id')
    info = yield conn.select(folder_name)
    logger.debug("info for %r is %r", folder_name, info)

    cache_doc = cache_docs.get(folder_name, {})
    dirty = yield self._syncFolderCache(conn, folder_name, info, cache_doc)

    if dirty:
      logger.debug("need to update folder cache for %r", folder_name)
      items = {'uidvalidity': cache_doc['uidvalidity'],
               'infos': cache_doc['infos']
               }
      new_item = {'rd_key' : ['imap-mailbox', [acct_id, folder_name]],
                  'schema_id': 'rd.imap.mailbox-cache',
                  'ext_id': self.rd_extension_id,
                  'items': items,
      }
      if '_id' in cache_doc:
        new_item['_id'] = cache_doc['_id']
        new_item['_rev'] = cache_doc['_rev']
      self.updated_folder_infos.append(new_item)
      sync_items = cache_doc['infos']
    else:
      sync_items = cache_doc.get('infos')

    # fetch folder info, and delete information about 'stale' locations
    # before fetching the actual messages.
    loc_to_nuke, loc_needed = yield self._makeLocationInfos(folder_name,
                                                            folder_delim,
                                                            sync_items)

    # queue the write of location records we want to nuke first.
    if loc_to_nuke:
      _ = yield self.write_items(loc_to_nuke)

    todo = sync_items[:]
    while todo:
      # do later ones first and limit the batch size - larger batches means
      # fewer couch queries, but the queue appears to 'stall' for longer.
      batch = []
      while len(batch) < 100 and todo:
          mi = todo.pop()
          if self.shouldFetchMessage(mi):
              batch.insert(0, mi)
      logger.log(1, 'queueing check of %d items in %r', len(batch), folder_name)
      _ = yield self.maybe_queue_fetch_items(folder_name, batch)
      # see if these items also need location records...
      new_locs = []
      for mi in batch:
        try:
          new_locs.append(loc_needed[mi['UID']])
        except KeyError:
          pass
      if new_locs:
        logger.debug('queueing %d new location records', len(new_locs))
        _ = yield self.write_items(new_locs)
    # XXX - todo - should nuke old folders which no longer exist.

  @defer.inlineCallbacks
  def _syncFolderCache(self, conn, folder_path, server_info, cache_doc):
    # Queries the server for the current state of a folder.  Returns True if
    # the cache document was updated so needs to be written back to couch.
    suidv = int(server_info['UIDVALIDITY'])
    dirty = False
    if suidv != cache_doc.get('uidvalidity'):
      infos = cache_doc['infos'] = []
      cache_doc['uidvalidity'] = suidv
      dirty = True
    else:
      try:
        infos = cache_doc['infos']
      except KeyError:
        infos = cache_doc['infos'] = []
        dirty = True

    if infos:
      cached_uid_next = int(infos[-1]['UID']) + 1
    else:
      cached_uid_next = 1

    suidn = int(server_info.get('UIDNEXT', -1))

    try:
      if suidn == -1 or suidn > cached_uid_next:
        if suidn == -1:
          logger.warn("This server doesn't provide UIDNEXT - it will take longer to synch...")
        logger.debug('requesting info for items in %r from uid %r', folder_path,
                     cached_uid_next)
        new_infos = yield conn.fetchAll("%d:*" % (cached_uid_next,), True)
      else:
        logger.info('folder %r has no new messages', folder_path)
        new_infos = {}
      # Get flags for all 'old' messages.
      if cached_uid_next > 1:
        updated_flags = yield conn.fetchFlags("1:%d" % (cached_uid_next-1,), True)
      else:
        updated_flags = {}
    except imap4.MismatchedQuoting, exc:
      log_exception("failed to fetchAll/fetchFlags folder %r", folder_path)
      new_infos = {}
      updated_flags = {}
    logger.info("folder %r has %d new items, %d flags for old items",
                folder_path, len(new_infos), len(updated_flags))

    # Turn the dicts back into the sorted-by-UID list it started as, nuking
    # old messages
    infos_ndx = 0
    for seq in sorted(int(k) for k in updated_flags):
      info = updated_flags[seq]
      this_uid = int(info['UID'])
      # remove items which no longer exist.
      while int(infos[infos_ndx]['UID']) < this_uid:
        old = infos.pop(infos_ndx)
        logger.debug('detected a removed imap item %r', old)
        dirty = True
      if int(infos[infos_ndx]['UID']) == this_uid:
        old_flags = infos[infos_ndx].get('FLAGS')
        new_flags = info["FLAGS"]
        if old_flags != new_flags:
          dirty = True
          infos[infos_ndx]['FLAGS'] = new_flags
          logger.debug('new flags for UID %r - were %r, now %r',
                       this_uid, old_flags, new_flags)
        infos_ndx += 1
        # we might get more than we asked for - that's OK - we should get
        # them in 'new_infos' too.
        if infos_ndx >= len(infos):
          break
      else:
        # We see this happen when we previously rejected an item due to
        # invalid or missing ENVELOPE etc.
        logger.debug("message %r never seen before - probably invalid", this_uid)
        continue
    # Records we had in the past now have accurate flags; next up is to append
    # new message info we just received...
    for seq in sorted(int(k) for k in new_infos):
      info = new_infos[seq]
      # Sadly, asking for '900:*' in gmail may return a single item
      # with UID of 899 - and that is already in our list.  So only append
      # new items when they are > then what we know about.
      this_uid = int(info['UID'])
      if this_uid < cached_uid_next:
        continue
      # Some items from some IMAP servers don't have an ENVELOPE record, and
      # lots of later things get upset at that.  It isn't clear what such
      # items are yet...
      try:
        envelope = info['ENVELOPE']
      except KeyError:
        logger.debug('imap item has no envelope - skipping: %r', info)
        continue
      if envelope[-1] is None:
        logger.debug('imap item has no message-id - skipping: %r', info)
        continue
      if not check_envelope_ok(envelope):
        logger.debug('imap info has invalid envelope - skipping: %r', info)
        continue
      # it is good - keep it.
      cached_uid_next = this_uid + 1
      infos.append(info)
      dirty = True
    defer.returnValue(dirty)

  @defer.inlineCallbacks
  def _makeLocationInfos(self, folder_name, delim, results):
    # We used to write all location records - even those we were never going
    # to fetch - in one hit - after fetchng the messages.  For large IMAP
    # accounts, this was unacceptable as too many records hit the couch at
    # once.
    # Note a key requirement here is to fetch new messages quickly, and to
    # perform OK with a new DB.  So, the general process is:
    # * Query all couch items which say they are in this location.
    # * Find the set of messages no longer in this location and delete them
    #   all in one go.
    # * Find the set of messages which we don't have location records for.
    #   As we process and filter each individual message, check this map to
    #   see if a new record needs to be written and write it with the message
    #   itself.
    # This function returns the 2 maps - the caller does the delete/update...
    folder_path = folder_name.split(delim)
    logger.debug("checking what we know about items in folder %r", folder_path)
    acct_id = self.account.details.get('id')
    # Build a map keyed by the rd_key of all items we know are currently in
    # the folder
    current = {}
    for result in results:
      msg_id = result['ENVELOPE'][-1]
      rdkey = get_rdkey_for_email(msg_id)
      current[tuple(rdkey)] = result['UID']

    # fetch all things in couch which (a) are currently tagged with this
    # location and (b) was tagged by this mapi account.  We do (a) via the
    # key param, and filter (b) here...
    key = ['rd.msg.location', 'location', folder_path]
    existing = yield self.doc_model.open_view(key=key, reduce=False,
                                              include_docs=True)
    scouch = set()
    to_nuke = []
    for row in existing['rows']:
      doc = row['doc']
      if doc.get('source') != ['imap', acct_id]:
        # Something in this location, but it was put there by other than
        # this IMAP account - ignore it.
        continue
      rdkey = tuple(doc['rd_key'])
      if rdkey not in current:
        to_nuke.append({'_id': doc['_id'],
                        '_rev': doc['_rev'],
                        '_deleted': True,
                        })
      scouch.add(rdkey)

    # Finally find the new ones we need to add
    to_add = {}
    for rdkey in set(current) - scouch:
      # Item in the folder but couch doesn't know it is there.
      # We hack the 'extension_id' in a special way to allow multiple of the
      # same schema; multiple IMAP accounts, for example, may mean the same
      # rdkey ends up with multiple of these location records.
      # XXX - this is a limitation in the doc model we should fix!
      ext_id = "%s~%s~%s" % (self.rd_extension_id, acct_id, ".".join(folder_path))
      uid = current[rdkey]
      new_item = {'rd_key': list(rdkey),
                  'ext_id': ext_id,
                  'schema_id': 'rd.msg.location',
                  'items': {'location': folder_path,
                            'location_sep': delim,
                            'uid': uid,
                            'source': ['imap', acct_id]},
                  }
      to_add[uid] = new_item
    logger.debug("folder %r info needs to update %d and delete %d location records",
                 folder_name, len(to_add), len(to_nuke))
    defer.returnValue((to_nuke, to_add))

  @defer.inlineCallbacks
  def _findMissingItems(self, folder_path, results):
    # Transform a list of IMAP infos into a map with the results keyed by the
    # 'rd_key' (ie, message-id)
    assert results, "don't call me with nothing to do!!"
    msg_infos = {}
    for msg_info in results:
      msg_id = msg_info['ENVELOPE'][-1]
      if msg_id in msg_infos:
        # This isn't a very useful check - we are only looking in a single
        # folder...
        logger.warn("Duplicate message ID %r detected", msg_id)
        # and it will get clobbered below :(
      msg_infos[get_rdkey_for_email(msg_id)] = msg_info

    # Get all messages that already have this schema
    keys = [['rd.core.content', 'key-schema_id', [k, 'rd.msg.rfc822']]
            for k in msg_infos.keys()]
    result = yield self.doc_model.open_view(keys=keys, reduce=False)
    seen = set([tuple(r['value']['rd_key']) for r in result['rows']])
    # convert each key elt to a list like we get from the views.
    remaining = set(msg_infos)-set(seen)

    logger.debug("batch for folder %s has %d messages, %d new", folder_path,
                len(msg_infos), len(remaining))
    rem_uids = [int(msg_infos[k]['UID']) for k in remaining]
    # *sob* - re-invert keyed by the UID.
    by_uid = {}
    for key, info in msg_infos.iteritems():
      uid = int(info['UID'])
      if uid in rem_uids:
        info['RAINDROP_KEY'] = key
        by_uid[uid] = info
    defer.returnValue(by_uid)

  @defer.inlineCallbacks
  def _processFolderBatch(self, conn, folder_path, by_uid):
    """Called asynchronously by a queue consumer"""
    conn.select(folder_path) # should check if it already is selected?
    acct_id = self.account.details.get('id')
    num = 0
    # fetch most-recent (highest UID) first...
    left = sorted(by_uid.keys(), reverse=True)
    while left:
      # do 10 at a time...
      this = left[:10]
      left = left[10:]
      to_fetch = ",".join(str(v) for v in this)
      # We need to use fetchSpecific so we can 'peek' (ie, not reset the
      # \\Seen flag) - note that gmail does *not* reset the \\Seen flag on
      # a fetchMessages, but rfc-compliant servers do...
      logger.debug("starting fetch of %d items from %r", len(this), folder_path)
      results = yield conn.fetchSpecific(to_fetch, uid=True, peek=True)
      logger.debug("fetch from %r got %d", folder_path, len(results))
      #results = yield conn.fetchMessage(to_fetch, uid=True)
      # Run over the results stashing in our by_uid dict.
      infos = []
      for info in results.values():
        # hrmph - fetchSpecific's return value is undocumented and strange!
        assert len(info)==1
        uidlit, uid, bodylit, req_data, content = info[0]
        assert uidlit=='UID'
        assert bodylit=='BODY'
        assert not req_data, req_data # we didn't request headers etc.
        uid = int(uid)
        # but if we used fetchMessage:
        #   uid = int(info['UID'])
        #   content = info['RFC822']
        flags = by_uid[uid]['FLAGS']
        rdkey = by_uid[uid]['RAINDROP_KEY']
        mid = rdkey[-1]
        # XXX - we need something to make this truly unique.
        logger.debug("new imap message %r (flags=%s)", mid, flags)
  
        # put our schemas together
        attachments = {'rfc822' : {'content_type': 'message',
                                   'data': content,
                                   }
        }
        items = {'_attachments': attachments}
        infos.append({'rd_key' : rdkey,
                      'ext_id': self.rd_extension_id,
                      'schema_id': 'rd.msg.rfc822',
                      'items': items})
      num += len(infos)
      _ = yield self.write_items(infos)
    defer.returnValue(num)

  def shouldFetchMessage(self, msg_info):
    if self.options.max_age:
      # XXX - we probably want the 'internal date'...
      date_str = msg_info['ENVELOPE'][0]
      try:
        date = mktime_tz(parsedate_tz(date_str))
      except (ValueError, TypeError):
        return False # invalid date - skip it.
      if date < time.time() - self.options.max_age:
        logger.log(1, 'skipping message - too old')
        return False
    return True


class ImapUpdater:
  def __init__(self, account, conductor):
    self.account = account
    self.conductor = conductor
    self.doc_model = account.doc_model

  # Outgoing items related to IMAP - eg, \\Seen flags, deleted, etc...
  @defer.inlineCallbacks
  def handle_outgoing(self, conductor, src_doc, dest_doc):
    account = self.account
    # Establish a connection to the server
    logger.debug("setting flags for %(rd_key)r: folder %(folder)r, uuid %(uid)s",
                 dest_doc)
    client = yield get_connection(account, conductor)
    _ = yield client.select(dest_doc['folder'])
    # Write the fact we are about to try and (un-)set the flag.
    _ = yield account._update_sent_state(src_doc, 'sending')
    try:
      try:
        flags_add = dest_doc['flags_add']
      except KeyError:
        pass
      else:
        client.addFlags(dest_doc['uid'], flags_add, uid=1)
      try:
        flags_rem = dest_doc['flags_remove']
      except KeyError:
        pass
      else:
        client.removeFlags(dest_doc['uid'], flags_rem, uid=1)
    except IMAP4Exception, exc:
      logger.error("Failed to update flags: %s", fun, exc)
      # XXX - we need to differentiate between a 'fatal' error, such as
      # when the message has been deleted, or a transient error which can be
      # retried.  For now, assume retryable...
      _ = yield account._update_sent_state(src_doc, 'error', exc,
                                           outgoing_state='outgoing')
    else:
      _ = yield account._update_sent_state(src_doc, 'sent')
      logger.debug("successfully adjusted flags for %(rd_key)r", src_doc)
    client.logout()

def get_connection(account, conductor):
    factory = ImapClientFactory(account, conductor)
    return factory.connect()
  

class ImapClientFactory(protocol.ClientFactory):
  protocol = ImapClient

  def __init__(self, account, conductor):
    # base-class has no __init__
    self.account = account
    self.conductor = conductor
    self.doc_model = account.doc_model # this is a little confused...

    self.ctx = ssl.ClientContextFactory()
    self.backoff = 8 # magic number
    self.retries_left = 4

  def buildProtocol(self, addr):
    p = self.protocol(self.ctx)
    p.factory = self
    p.account = self.account
    p.doc_model = self.account.doc_model
    p.deferred = self.deferred # this isn't going to work in reconnect scenarios
    return p

  def connect(self):
    details = self.account.details
    logger.debug('attempting to connect to %s:%d (ssl: %s)',
                 details['host'], details['port'], details['ssl'])
    reactor = self.conductor.reactor
    self.deferred = defer.Deferred()
    if details.get('ssl'):
      reactor.connectSSL(details['host'], details['port'], self, self.ctx)
    else:
      reactor.connectTCP(details['host'], details['port'], self)
    return self.deferred

  def clientConnectionFailed(self, connector, reason):
    self.account.reportStatus(brat.SERVER, brat.BAD, brat.UNREACHABLE,
                              brat.TEMPORARY)
    # It occurs that some "account manager" should be reported of the error,
    # and *it* asks us to retry later?  eg, how do I ask 'ignore backoff -
    # try again *now*"?
    self.maybeRetry(reason, self.connect)

  def maybeRetry(self, reason, func, *args):
    self.retries_left -= 1
    if not self.retries_left:
      reason.raiseException()
    logger.warning('Failed to connect, will retry after %d secs: %s',
                   self.backoff, reason.getErrorMessage())
    # XXX - check reason for errors which can be retried.
    self.conductor.reactor.callLater(self.backoff, func, *args)
    self.backoff = min(self.backoff * 2, 600) # magic number


class IMAPAccount(base.AccountBase):
  rd_outgoing_schemas = ['rd.proto.outgoing.imap-flags']
  def startSend(self, conductor, src_doc, dest_doc):
    # Check it really is for our IMAP account.
    if dest_doc['account'] != self.details.get('id'):
      logger.info('outgoing item not for imap acct %r (target is %r)',
                  self.details.get('id'), dest_doc['account'])
      return
    # caller should check items are ready to send.
    assert src_doc['outgoing_state'] == 'outgoing', src_doc
    # We know IMAP currently only has exactly 1 outgoing schema type.
    assert dest_doc['rd_schema_id'] == 'rd.proto.outgoing.imap-flags', src_doc

    updater = ImapUpdater(self, conductor)
    return updater.handle_outgoing(conductor, src_doc, dest_doc)

  @defer.inlineCallbacks
  def startSync(self, conductor, options):
    prov = ImapProvider(self, conductor, options)

    @defer.inlineCallbacks
    def consume_connection_queue(q):
      """Processes the query queue."""
      conn = None
      while True:
        result = yield q.get()
        if result is None:
          logger.debug('queue processor stopping')
          q.put(None) # for anyone else processing the queue...
          break
        # else a real item to process.
        if conn is None:
          # getting the initial connection has its own retry semantics...
          conn = yield get_connection(self, conductor)

        try:
          func, xargs = result
          args = (conn,) + xargs
          _ = yield func(*args)
        except imap4.IMAP4Exception, exc:
          # put the item back in the queue for later
          q.put(result)
          # then queue a 'retry' of the queue.
          logger.debug("handling connection error: %s", exc)
          conn.transport.loseConnection()
          conn.factory.maybeRetry(Failure(), consume_connection_queue, q)
          return
        except:
          if not conductor.reactor.running:
            break
          log_exception('failed to process an IMAP query request')
      if conn is not None:
        _ = yield conn.close()

    @defer.inlineCallbacks
    def start_queryers(n):
      ds = []
      for i in range(n):
        ds.append(consume_connection_queue(prov.query_queue))
      _ = yield defer.DeferredList(ds)
      # queryers done - post to the fetch queue telling it everything is done.
      acid = self.details.get('id','')
      logger.info('%r imap querying complete - waiting for fetch queue',
                  acid)
      prov.fetch_queue.put(None)

    @defer.inlineCallbacks
    def start_fetchers(n):
      ds = []
      for i in range(n):
        ds.append(consume_connection_queue(prov.fetch_queue))
      _ = yield defer.DeferredList(ds)
      # fetchers done - write the cache docs last.
      if prov.updated_folder_infos:
        _ = yield prov.write_items(prov.updated_folder_infos)

    @defer.inlineCallbacks
    def start_producing(conn):
      _ = yield prov._reqList(conn)

    def log_status():
      nf = sum(len(i[1][1]) for i in prov.fetch_queue.pending if i is not None)
      if nf:
        logger.info('%r fetch queue has %d messages',
                    self.details.get('id',''), nf)

    lc = task.LoopingCall(log_status)
    lc.start(10)
    # put something in the fetch queue to fire things off...
    prov.query_queue.put((start_producing, ()))

    # fire off the producer and queue consumers.
    _ = yield defer.DeferredList([start_queryers(NUM_QUERYERS),
                                  start_fetchers(NUM_FETCHERS)])

    lc.stop()

  def get_identities(self):
    addresses = self.details.get('addresses')
    if not addresses:
      username = self.details.get('username')
      if '@' not in username:
        logger.warning(
          "IMAP account '%s' specifies a username that isn't an email address.\n"
          "This account should have an 'addresses=' entry added to the config\n"
          "file with a list of email addresses to be used with this account\n"
          "or raindrop will not be able to detect items sent by you.",
          self.details['id'])
        ret = []
      else:
        ret = [['email', username]]
    else:
      ret = [['email', addy] for addy in re.split("[ ,]", addresses) if addy]
    logger.debug("email identities for %r: %s", self.details['id'], ret)
    return ret
