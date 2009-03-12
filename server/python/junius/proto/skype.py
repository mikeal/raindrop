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
from twisted.internet import reactor, defer, threads

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
    def __init__(self, account, reactor):
        self.account = account
        self.reactor = reactor
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
        logger.debug("Processing %d chat(s)", len(chats))
        # Is a 'DeferredList' more appropriate here?
        d = defer.Deferred()
        for chat in chats:
            d.addCallback(self.got_chat, chat)
        return d.callback(None)

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
        # saved the chat - now start on the messages...
        return threads.deferToThread(chat._GetMessages
                    ).addCallback(self.got_messages, chat
                    )

    def got_messages(self, messages, chat):
        logger.info("Processing chat '%s' (%d messages)",
                    chat.Name, len(messages))
        d = defer.Deferred()
        for msg in messages:
            d.addCallback(self.got_msg, chat, msg)
        return d.callback(None)

    def got_msg(self, result, chat, msg):
        logger.debug("Processing message")
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
    TwistySkype(self, reactor).attach()
