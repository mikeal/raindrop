#!/usr/bin/env python
'''
Fetch skype contacts and chats.
'''

import base64, datetime
import pprint
import time
import logging
from urllib2 import urlopen

import twisted.python.log
from twisted.internet import defer, threads

from ..proc import base

import Skype4Py

logger = logging.getLogger(__name__)

max_run = 4 # for the deferred semaphore...

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
    def __init__(self, account, conductor, doc_model):
        self.account = account
        self.conductor = conductor
        self.doc_model = doc_model
        self.skype = Skype4Py.Skype()

    def get_docid_for_chat(self, chat):
        return "skypechat-" + chat.Name.encode('utf8') # hrmph!

    def get_docid_for_msg(self, msg):
        return "skypemsg-%s-%d" % (self.account.details['username'], msg._Id)

    def attach(self):
        logger.info("attaching to skype...")
        d = threads.deferToThread(self.skype.Attach)
        d.addCallback(self.attached)
        return d

    def attached(self, status):
        logger.info("attached to skype - getting chats")
        return threads.deferToThread(self.skype._GetChats
                    ).addCallback(self._cb_got_chats
                    )

    def _cb_got_chats(self, chats):
        logger.debug("skype has %d chat(s) total", len(chats))
        # chats is a tuple...
        self.remaining_chats = list(chats)
        return self.process_next_chat()

    def process_next_chat(self):
        if not self.remaining_chats:
            logger.debug("finished processing chats")
            self.finished(None) # not sure this is the right place...
            return

        chat = self.remaining_chats.pop()
        d = defer.Deferred()
        # process the chat object itself if its not seen before.
        d.addCallback(self._cb_maybe_process_chat, chat)
        # process all messages in all chats - there may be new ones even if
        # we previously have seen the chat itself.
        d.addCallback(self._cb_process_chat_messages, chat)
        d.addCallback(self._cb_processed_chat)
        d.callback(None)
        return d

    def _cb_processed_chat(self, result):
        # the 'pattern' we copied from the imap sample code calls for us
        # to recurse - but that can recurse too far...
        return self.conductor.reactor.callLater(0, self.process_next_chat)

    def _cb_maybe_process_chat(self, result, chat):
        logger.debug("seeing if skype chat %r exists", chat.Name)
        return self.doc_model.open_document(self.get_docid_for_chat(chat),
                        ).addCallback(self._cb_process_chat, chat)

    def _cb_process_chat(self, existing_doc, chat):
        if existing_doc is None:
            logger.info("Creating new skype chat %r", chat.Name)
            # make a 'deferred list' to fetch each property one at a time.
            ds = [threads.deferToThread(chat._Property, p)
                  for p, _ in CHAT_PROPS]
            return defer.DeferredList(ds
                        ).addCallback(self._cb_got_chat_props, chat)
        else:
            logger.debug("Skipping skype chat %r - already exists", chat.Name)
            # we are done.

    def _cb_got_chat_props(self, results, chat):
        logger.debug("got chat %r properties: %s", chat.Name, results)
        docid = self.get_docid_for_chat(chat)
        doc ={}
        for (name, typ), (ok, val) in zip(CHAT_PROPS, results):
            if ok:
                doc['skype_'+name.lower()] = simple_convert(val, typ)

        # 'Name' is a special case that doesn't come via a prop.  We use
        # 'chatname' as that is the equiv attr on the messages themselves.
        doc['skype_chatname'] = chat.Name
        return self.doc_model.create_raw_document(docid, doc,
                                                  'proto/skype-chat',
                                                  self.account
                    )

    def finished(self, result):
        return self.conductor.on_synch_finished(self.account, result)

    # Processing the messages for each chat...
    def _cb_process_chat_messages(self, result, chat):
        # Get each of the messages in the chat
        return threads.deferToThread(chat._GetMessages
                    ).addCallback(self._cb_got_messages, chat,
                    )

    def _cb_got_messages(self, messages, chat):
        logger.debug("chat '%s' has %d message(s) total; looking for new ones",
                     chat.Name, len(messages))
        self.remaining_messages = list(messages) # message is a tuple.
        self.current_chat = chat
        return self.process_next_message()

    def process_next_message(self):
        if not self.remaining_messages:
            logger.debug("finished processing messages for this chat")
            return

        msg = self.remaining_messages.pop()
        chat = self.current_chat
        logger.debug("seeing if message %r exists (in chat %r)",
                     msg._Id, chat.Name)
        return self.doc_model.open_document(self.get_docid_for_msg(msg)
                        ).addCallback(self._cb_maybe_process_message, chat, msg
                        ).addCallback(self._cb_processed_message
                        )

    def _cb_processed_message(self, result):
        return self.conductor.reactor.callLater(0, self.process_next_message)

    def _cb_maybe_process_message(self, existing_doc, chat, msg):
        if existing_doc is None:
            logger.debug("New skype message %d", msg._Id)
            # make a 'deferred list' to fetch each property one at a time.
            ds = [threads.deferToThread(msg._Property, p) for p, _ in MSG_PROPS]
            return defer.DeferredList(ds
                        ).addCallback(self._cb_got_msg_props, chat, msg)
        else:
            logger.debug("already have raw doc for msg %r; skipping", msg._Id)

    def _cb_got_msg_props(self, results, chat, msg):
        doc = {}
        for (name, typ), (ok, val) in zip(MSG_PROPS, results):
            if ok:
                doc['skype_'+name.lower()] = simple_convert(val, typ)
        # we include the skype username with the ID as they are unique per user.
        docid = self.get_docid_for_msg(msg)
        return self.doc_model.create_raw_document(docid, doc, 'proto/skype-msg',
                                                  self.account
                    ).addCallback(self._cb_msg_saved
                    )

    def _cb_msg_saved(self, result):
        pass

# A 'converter' - takes a proto/skype-msg as input and creates a
# 'message' as output (some other intermediate step might end up more
# appopriate)
class SkypeConverter(base.ConverterBase):
    def convert(self, doc):
        # We need to open the 'chat' for this Message.  Clearly this is
        # going to be inefficient...
        chat_id = "skypechat-" + doc['skype_chatname'].encode('utf8') # hrmph!
        return self.doc_model.open_document(chat_id
                        ).addCallback(self.finish_convert, doc)

    def finish_convert(self, chat_doc, doc):
        if chat_doc is None:
            subject = "<failed to fetch skype chat!>"
        else:
            subject = chat_doc['skype_friendlyname']
        return {'from': ['skype', doc['skype_from_handle']],
                'subject': subject,
                'body': doc['skype_body'],
                'body_preview': doc['skype_body'][:128],
                'conversation_id': doc['skype_chatname'],
                'timestamp': doc['skype_timestamp'], # skype's works ok here?
                }


class SkypeAccount(base.AccountBase):
  def __init__(self, db, details):
    self.db = db
    self.details = details

  def startSync(self, conductor, doc_model):
    TwistySkype(self, conductor, doc_model).attach()
