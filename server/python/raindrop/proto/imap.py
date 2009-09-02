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

def log_exception(msg, *args):
  # inlineCallbacks don't work well with the logging module's handling of
  # exceptions - we need to use the Failure() object...
  msg = (msg % args) + "\n" + Failure().getTraceback()
  logger.error(msg)

# Set this to see IMAP lines printed to the console.
# NOTE: lines printed may include your password!
TRACE_IMAP = False

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
      d.addErrback(self.accountStatus,
                   brat.SERVER, brat.BAD, brat.CRYPTO, brat.PERMANENT)
      d.addCallback(self._doLogin)
    else:
      d = self._doLogin()
    d.addErrback(self.accountStatus,
                 brat.SERVER, brat.BAD, brat.PASSWORD, brat.PERMANENT)
    d.addCallback(return_self)
    return d

  def _doLogin(self, *args, **kwargs):
    return self.login(self.account.details['username'],
                      self.account.details['password'])

  # XXX - this is misplaced...
  def accountStatus(self, result, *args):
    return self.account.reportStatus(*args)

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
      print 'C:', repr(line)
      return imap4.IMAP4Client.sendLine(self, line)
  
    def lineReceived(self, line):
      if len(line) > 50:
        lrepr = repr(line[:50]) + (' <+ %d more bytes>' % len(line[50:]))
      else:
        lrepr = repr(line)
      print 'S:', lrepr
      return imap4.IMAP4Client.lineReceived(self, line)


class ImapProvider(object):
  # The 'id' of this extension
  # XXX - should be managed by our caller once these 'protocols' become
  # regular extensions.
  rd_extension_id = 'proto.imap'

  def __init__(self, account, options, reactor):
    self.account = account
    self.options = options
    self.doc_model = account.doc_model
    self.reactor = reactor
    self.fetch_queue = defer.DeferredQueue()
    self.write_queue = defer.DeferredQueue()
    self.updated_folder_infos = None

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
    logger.info('imap queue generation finished - waiting for queues to finish')

  @defer.inlineCallbacks
  def _checkQuickRecent(self, conn, folder_path, max_to_fetch):
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
    if infos:
      self.fetch_queue.put((folder_path, infos))

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
        try:
          _ = yield conn.select(name)
          _ = yield self._checkQuickRecent(conn, name, 20)
        except imap4.IMAP4Exception, exc:
          logger.error("Failed to check %r for quick items: %s", name, exc)

    # We only update the cache of the folder once all items from that folder
    # have been written, so extensions which runwritten once all items from folder fetched.
    assert self.updated_folder_infos is None
    self.updated_folder_infos = []

    # Now update the cache for all folders...
    sync_by_name = {}
    all_loc_to_nuke = [] # simple list of schema items to nuke.
    all_loc_to_add = {} # map of maps [folder_path][uid] = item_to_add
    for delim, name in all_names:
      try:
        info = yield conn.select(name)
        logger.debug("info for %r is %r", name, info)
  
        cache_doc = caches.get(name, {})
        dirty = yield self._syncFolderCache(conn, name, info, cache_doc)
      except imap4.IMAP4Exception, exc:
        logger.error("Failed to synch folder %r: %s", name, exc)
        continue

      if dirty:
        logger.debug("need to update folder cache for %r", name)
        items = {'uidvalidity': cache_doc['uidvalidity'],
                 'infos': cache_doc['infos']
                 }
        new_item = {'rd_key' : ['imap-mailbox', [acct_id, name]],
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
      sync_by_name[(delim, name)] = sync_items[:]
      # fetch folder info, and delete information about 'stale' locations
      # before fetching.
      loc_to_nuke, loc_needed = yield self._makeLocationInfos(name, delim,
                                                              sync_items)
      all_loc_to_nuke.extend(loc_to_nuke)
      all_loc_to_add[name] = loc_needed
    # XXX - todo - should nuke old folders which no longer exist.

    if all_loc_to_nuke:
      self.write_queue.put(all_loc_to_nuke)

    # now use the cached info to sync the IMAP nessages for each and every
    # mailbox.
    while sync_by_name:
      # do 'n' in each folder, then n more in each folder, etc.
      for info in all_names:
        try:
          todo = sync_by_name[info]
        except KeyError:
          continue
        else:
          delim, name = info
          # do later ones first...
          batch = [mi for mi in todo[-50:] if self.shouldFetchMessage(mi)]
          rest = todo[:-50]
          logger.log(1, 'queueing check of %d items in %r', len(batch), name)
          self.fetch_queue.put((name, batch))
          # see if these items also need location records...
          new_locs = []
          for mi in batch:
            try:
              new_locs.append(all_loc_to_add[name][mi['UID']])
            except KeyError:
              pass
          if new_locs:
            logger.debug('queueing %d new location records', len(new_locs))
            self.write_queue.put(new_locs)
          if rest:
            sync_by_name[info] = rest
          else:
            del sync_by_name[info]

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
        to_nuke.append({'_id': id,
                        '_rev': rev,
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
    logger.info("folder %r info needs to update %d and delete %d location records",
                folder_name, len(to_add), len(to_nuke))
    defer.returnValue((to_nuke, to_add))

  def results_by_rdkey(self, infos):
    # Transform a list of IMAP infos into a map with the results keyed by the
    # 'rd_key' (ie, message-id)
    msg_infos = {}
    for msg_info in infos:
      msg_id = msg_info['ENVELOPE'][-1]
      if msg_id in msg_infos:
        # This isn't a very useful check - we are only looking in a single
        # folder...
        logger.warn("Duplicate message ID %r detected", msg_id)
        # and it will get clobbered below :(
      msg_infos[get_rdkey_for_email(msg_id)] = msg_info
    return msg_infos

  @defer.inlineCallbacks
  def _findMissingItems(self, results, folder_path):
    # 'invert' the map so we have one keyed by our raindrop key
    msg_infos = self.results_by_rdkey(results)
    if not msg_infos:
      # nothing new in this batch
      defer.returnValue(None)

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
  def _processFolderBatch(self, conn, folder_path, infos):
    """Called asynchronously by a queue consumer"""
    conn.select(folder_path) # should check if it already is selected?
    acct_id = self.account.details.get('id')
    by_uid = yield self._findMissingItems(infos, folder_path)
    if not by_uid:
      # nothing new in this batch
      defer.returnValue(0)

    num = 0
    # fetch most-recent (highest UID) first...
    left = sorted(by_uid.keys(), reverse=True)
    while left:
      # do 10 at a time...
      this = left[:10]
      left = left[10:]
      to_fetch = ",".join(str(v) for v in this)
      results = yield conn.fetchMessage(to_fetch, uid=True)
      # Run over the results stashing in our by_uid dict.
      infos = []
      for info in results.values():
        uid = int(info['UID'])
        content = info['RFC822']
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
      self.write_queue.put(infos)
    defer.returnValue(num)

  @defer.inlineCallbacks
  def _consumeFetchRequests(self, conn):
    q = self.fetch_queue
    while True:
      result = yield q.get()
      if result is None:
        logger.info('fetch queue processor stopping')
        q.put(None) # for anyone else processing the queue...
        break
      # else a real item to process.
      folder, items = result
      logger.debug('checking %d items from %r', len(items), folder)
      try:
        num = yield self._processFolderBatch(conn, folder, items)
        logger.debug('queued %d items for %r', num, folder)
      except:
        if not self.reactor.running:
          break
        log_exception('failed to process a message batch in folder %r',
                      folder)

  @defer.inlineCallbacks
  def _consumeWriteRequests(self):
    q = self.write_queue
    while True:
      items = yield q.get()
      if items is None:
        logger.info('write queue processor stopping')
        break
      # else a real set of schemas to write and process.
      logger.debug('write queue popped %d schema items', len(items))
      try:
        _ = yield self.doc_model.create_schema_items(items)
      except DocumentSaveError, exc:
        # So - conflicts are a fact of life in this 'queue' model: we check
        # if a record exists and it doesn't, so we queue the write.  By the
        # time the write gets processed, it may have been written by a
        # different extension...
        nc = 0
        for info in exc.infos:
          if info['error']=='conflict':
            nc += 1
          else:
            raise
        logger.info('ignored %d conflict errors writing this batch', nc)
      except:
        # premature shutdown...
        if not self.reactor.running:
          break
        raise

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
    factory = ImapClientFactory(account, self.conductor)
    client = yield factory.connect()
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
  

class ImapClientFactory(protocol.ClientFactory):
  protocol = ImapClient

  def __init__(self, account, conductor):
    # base-class has no __init__
    self.account = account
    self.conductor = conductor
    self.doc_model = account.doc_model # this is a little confused...

    self.ctx = ssl.ClientContextFactory()
    self.backoff = 8 # magic number

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
    logger.warning('Failed to connect, will retry after %d secs',
                   self.backoff)
    # It occurs that some "account manager" should be reported of the error,
    # and *it* asks us to retry later?  eg, how do I ask 'ignore backoff -
    # try again *now*"?
    self.conductor.reactor.callLater(self.backoff, self.connect)
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
  def startSync(self, conductor):
    prov = ImapProvider(self, conductor.options, conductor.reactor)

    @defer.inlineCallbacks
    def start_fetchers(n):
      ds = []
      conns = []
      for i in range(n):
        factory = ImapClientFactory(self, conductor)
        fetch_connection = yield factory.connect()
        conns.append(fetch_connection)
        ds.append(prov._consumeFetchRequests(fetch_connection))
      _ = yield defer.DeferredList(ds)
      # fetchers done - write the cache docs last.
      if prov.updated_folder_infos:
        prov.write_queue.put(prov.updated_folder_infos)
      # and finally post a stop request to the writer...
      prov.write_queue.put(None)
      for c in conns:
        _ = yield c.logout()

    @defer.inlineCallbacks
    def start_producer():
      factory = ImapClientFactory(self, conductor)
      client = yield factory.connect()
      _ = yield prov._reqList(client)
      # We've now finished producing 'fetch' requests for the queue - but with
      # a perfectly good connection sitting here doing nothing - so first,
      # post a message to the queue telling it we are done, then immediately
      # start processing the queue to help it finish.
      logger.debug('producer done - posting stop request to consumer')
      prov.fetch_queue.put(None)
      _ = yield prov._consumeFetchRequests(client)
      logger.debug('producer finished consuming!')
      _ = yield client.logout()

    @defer.inlineCallbacks
    def start_writer():
      _ = yield prov._consumeWriteRequests()

    def log_status():
      nf = sum(len(i) for i in prov.fetch_queue.pending if i is not None)
      nw = sum(len(i) for i in prov.write_queue.pending if i is not None)
      if nf or nw:
        logger.info('fetch queue has %d items, write queue has %d', nf, nw)

    lc = task.LoopingCall(log_status)
    lc.start(10)
    # fire off the producer and queue consumers.  We have 2 'fetchers', which
    # are io-bound talking to the IMAP server, and a single 'writer', which
    # is responsible for writing couch docs, and as a side-effect, doing the
    # 'processing' of these items (we can't have multiple things writing at
    # the moment as the 'conversation' extension in particular will generate
    # conflicts if run concurrently...)
    _ = yield defer.DeferredList([start_producer(),
                                  start_fetchers(2),
                                  start_writer()])

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
