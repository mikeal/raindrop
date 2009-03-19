#!/usr/bin/env python
'''
Fetch skype contacts and chats.
'''

import base64, datetime
import pprint
import time
import re
import logging
from urllib2 import urlopen

import twisted.python.log
from twisted.internet import defer, threads

from ..proc import base
from ..model import get_db

import Skype4Py

logger = logging.getLogger(__name__)

# These are the raw properties we fetch from skype.
CHAT_PROPS = [
    ('ACTIVEMEMBERS',   list),
    ('ACTIVITY_TIMESTAMP', float),
    ('ADDER', unicode),
    ('APPLICANTS', list),
    #'BLOB'??
    ('BOOKMARKED', bool),
    ('DESCRIPTION', unicode),
    #'DIALOG_PARTNER',
    ('FRIENDLYNAME', unicode),
    ('GUIDELINES', unicode),
    #'MEMBEROBJECTS',
    ('MEMBERS', list),
    ('MYROLE', unicode),
    ('MYSTATUS', unicode),
    ('OPTIONS', int),
    ('PASSWORDHINT', unicode),
    ('POSTERS', list),
    ('STATUS', unicode),
    ('TIMESTAMP', float),
    ('TOPICXML', unicode),
    ('TOPIC', unicode),
    ('TYPE', unicode),
]

MSG_PROPS = [
    ('BODY', unicode),
    ('CHATNAME', unicode),
    ('EDITED_BY', unicode),
    ('EDITED_TIMESTAMP', float),
    ('FROM_DISPNAME', unicode),
    ('FROM_HANDLE', unicode),
    ('IS_EDITABLE', bool),
    ('LEAVEREASON', unicode),
    ('STATUS', unicode),
    ('TIMESTAMP', float),
    ('TYPE', unicode),
    ('USERS', list),
]


def simple_convert(str_val, typ):
    if typ is list:
        return str_val.split()
    if typ is bool:
        return str_val == "TRUE"
    # all the rest are callables which 'do the right thing'
    return typ(str_val)


class TwistySkype(object):
    def __init__(self, account, conductor):
        self.account = account
        self.conductor = conductor
        self.skype = Skype4Py.Skype()

    def attach(self):
        logger.info("attaching to skype...")
        d = threads.deferToThread(self.skype.Attach)
        d.addCallback(self.attached)
        return d

    def attached(self, status):
        logger.info("attached to skype - getting chats")
        return threads.deferToThread(self.skype._GetChats
                    ).addCallback(self.got_chats
                    )

    def got_chats(self, chats):
        logger.debug("skype has %d chat(s) total", len(chats))
        # work out which ones are 'new'
        startkey=['skype/chat', self.account.details['_id']]
        # oh for https://issues.apache.org/jira/browse/COUCHDB-194 to be fixed...
        endkey=['skype/chat', self.account.details['_id'] + 'ZZZZZZZZZZZZZZZZZZ']
        # XXX - this isn't quite right - the properties of each chat may have
        # changed, so we need to re-process the ones we've seen.  Later...
        get_db().openView('raindrop!messages!by', 'by_storage',
                          startkey=startkey, endkey=endkey,
            ).addCallback(self.got_seen_chats, chats)

    def got_seen_chats(self, rows, all_chats):
        seen_chats = set([r['key'][2] for r in rows])
        need = [chat for chat in all_chats if chat.Name not in seen_chats]
        logger.info("Skype has %d chats(s), %d of which we haven't seen",
                     len(all_chats), len(need))
        # Is a 'DeferredList' more appropriate here?
        d = defer.Deferred()
        for chat in need:
            d.addCallback(self.got_chat, chat)
        # But *every* chat must have its messages processed, new and old.
        for chat in all_chats:
            d.addCallback(self.start_processing_messages, chat)

        # and when this deferred chain completes, this account is complete.
        d.addCallback(self.finished)

        return d.callback(None)

    def finished(self, result):
      return self.conductor.on_synch_finished(self.account, result)

    def got_chat(self, result, chat):
        logger.debug("starting processing of chat '%s'", chat.Name)
        # make a 'deferred list' to fetch each property one at a time.
        ds = [threads.deferToThread(chat._Property, p)
              for p, _ in CHAT_PROPS]

        return defer.DeferredList(ds
                    ).addCallback(self.got_chat_props, chat)

    def got_chat_props(self, results, chat):
        # create the couch document for the chat itself.
        doc = dict(
          type='rawMessage',
          subtype='skype/chat',
          account_id=self.account.details['_id'],
          storage_key=chat.Name
          )
        for (name, typ), (ok, val) in zip(CHAT_PROPS, results):
            if ok:
                doc['skype_'+name.lower()] = simple_convert(val, typ)

        # 'Name' is a special case that doesn't come via a prop.  We use
        # 'chatname' as that is the equiv attr on the messages themselves.
        doc['skype_chatname'] = chat.Name
        return get_db().saveDoc(doc
                ).addCallback(self.saved_chat, chat
                )

    def saved_chat(self, result, chat):
        logger.debug("Finished processing of new chat '%s'", chat.Name)
        # nothing else to do for the chat (the individual messages are
        # processed by a different path; we are here only for new ones...

    def start_processing_messages(self, result, chat):
        # Get each of the messages in the chat
        return threads.deferToThread(chat._GetMessages
                    ).addCallback(self.got_messages, chat,
                    )

    def got_messages(self, messages, chat):
        logger.debug("chat '%s' has %d message(s) total; looking for new ones",
                     chat.Name, len(messages))
        startkey=['skype/message', self.account.details['_id'], [chat.Name, 0]]
        endkey=['skype/message', self.account.details['_id'], [chat.Name, 4000000000]]
        return get_db().openView('raindrop!messages!by', 'by_storage',
                                 startkey=startkey, endkey=endkey,
                    ).addCallback(self.got_seen_messages, messages, chat)

    def got_seen_messages(self, rows, messages, chat):
        seen_ids = set([r['key'][2][1] for r in rows])
        need = [msg for msg in messages if msg._Id not in seen_ids]
        logger.info("Chat '%s' has %d messages, %d of which we haven't seen",
                     chat.Name, len(messages), len(need))
        
        dl = []
        for i, msg in enumerate(need):
            d = defer.Deferred()
            d.addCallback(self.got_new_msg, chat, msg, i)
            dl.append(d)
            d.callback(None)
        return defer.DeferredList(dl)

    def got_new_msg(self, result, chat, msg, i):
        logger.debug("Processing message %d from chat '%s'", i, chat.Name)
        # make a 'deferred list' to fetch each property one at a time.
        ds = [threads.deferToThread(msg._Property, p) for p, _ in MSG_PROPS]
        return defer.DeferredList(ds
                    ).addCallback(self.got_msg_props, chat, msg)

    def got_msg_props(self, results, chat, msg):
        # create the couch document for the chat message itself.
        doc = dict(
          type='rawMessage',
          subtype='skype/message',
          account_id=self.account.details['_id'],
          storage_key=[chat.Name, msg._Id]
          )
        for (name, typ), (ok, val) in zip(MSG_PROPS, results):
            if ok:
                doc['skype_'+name.lower()] = simple_convert(val, typ)
        # The 'Id' attribute doesn't come via a property.
        doc['skype_msgid'] = msg._Id

        return get_db().saveDoc(doc
                ).addCallback(self.saved_message, chat
                )

    def saved_message(self, result, chat):
        logger.debug('message processing complete')


class SkypeAccount(base.AccountBase):
  def __init__(self, db, details):
    self.db = db
    self.details = details

  def startSync(self, conductor):
    TwistySkype(self, conductor).attach()
