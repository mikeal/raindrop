#!/usr/bin/env python
'''
Fetch skype contacts and chats.
'''
import logging

import twisted.python.log
from twisted.internet import defer, threads

from ..proc import base

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
        self.doc_model = account.doc_model # this is a little confused...
        self.conductor = conductor
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
        # fetch all the messages (future optimization; all we need are the
        # IDs, but we suffer from creating an instance wrapper for each item.
        # Sadly the skype lib doesn't offer a clean way of doing this.)
        def gen_chats(chats):
            for chat in chats:
                yield threads.deferToThread(chat._GetMessages
                        ).addCallback(self._cb_got_messages, chat,
                        )
            logger.info("skype has finished processing all chats")

        return self.conductor.coop.coiterate(gen_chats(chats))

    def _cb_got_messages(self, messages, chat):
        logger.debug("chat '%s' has %d message(s) total; looking for new ones",
                     chat.Name, len(messages))

        # Finally got all the messages for this chat.  Execute a view to
        # determine which we have seen (note that we obviously could just
        # fetch the *entire* chats+msgs view once - but we do it this way on
        # purpose to ensure we remain scalable...)
        return self.doc_model.open_view('raindrop!proto!skype', 'seen',
                                        startkey=[chat.Name],
                                        endkey=[chat.Name, {}]
                    ).addCallback(self._cb_got_seen, chat, messages
                    )

    def _cb_got_seen(self, result, chat, messages):
        msgs_by_id = dict((m._Id, m) for m in messages)
        chatname = chat.Name
        # The view gives us a list of [chat_name, msg_id], where msg_id is
        # None if we've seen the chat itself.  Create a set of messages we
        # *haven't* seen - including the [chat_name, None] entry if applic.
        all_keys = [(chatname, None)]
        all_keys.extend((chatname, mid) for mid in msgs_by_id.keys())
        seen_chats = set([tuple(row['key']) for row in result['rows']])
        add_bulk = [] # we bulk-update these at the end!
        remaining = set(all_keys)-set(seen_chats)
        # we could just process the empty list as normal, but the logging of
        # an info when we do have items is worthwhile...
        if not remaining:
            logger.debug("Chat %r has no new items to process", chatname)
            return None
        # we have something to do...
        logger.info("Chat %r has %d items to process", chatname,
                    len(remaining))
        logger.debug("we've already seen %d items from this chat",
                     len(seen_chats))
        return self.conductor.coop.coiterate(
                    self.gen_items(chat, remaining, msgs_by_id))

    def gen_items(self, chat, todo, msgs_by_id):
        tow = []
        for _, msgid in todo:
            if msgid is None:
                # we haven't seen the chat itself - do that.
                logger.debug("Creating new skype chat %r", chat.Name)
                # make a 'deferred list' to fetch each property one at a time.
                ds = [threads.deferToThread(chat._Property, p)
                      for p, _ in CHAT_PROPS]
                yield defer.DeferredList(ds
                            ).addCallback(self._cb_got_chat_props, chat, tow)
            else:
                msg = msgs_by_id[msgid]
                # A new msg in this chat.
                logger.debug("New skype message %d", msg._Id)
                # make a 'deferred list' to fetch each property one at a time.
                ds = [threads.deferToThread(msg._Property, p) for p, _ in MSG_PROPS]
                yield defer.DeferredList(ds
                            ).addCallback(self._cb_got_msg_props, chat, msg, tow)

        if tow:
            yield self.doc_model.create_raw_documents(self.account, tow)
        logger.debug("finished processing chat %r", chat.Name)

    def _cb_got_chat_props(self, results, chat, pending):
        logger.debug("got chat %r properties: %s", chat.Name, results)
        docid = self.get_docid_for_chat(chat)
        doc ={}
        for (name, typ), (ok, val) in zip(CHAT_PROPS, results):
            if ok:
                doc['skype_'+name.lower()] = simple_convert(val, typ)

        # 'Name' is a special case that doesn't come via a prop.  We use
        # 'chatname' as that is the equiv attr on the messages themselves.
        doc['skype_chatname'] = chat.Name
        pending.append((docid, doc, 'proto/skype-chat'))

    def _cb_got_msg_props(self, results, chat, msg, pending):
        logger.debug("got message properties for %s", msg._Id)
        doc = {}
        for (name, typ), (ok, val) in zip(MSG_PROPS, results):
            if ok:
                doc['skype_'+name.lower()] = simple_convert(val, typ)
        doc['skype_id'] = msg._Id
        # we include the skype username with the ID as they are unique per user.
        docid = self.get_docid_for_msg(msg)
        pending.append((docid, doc, 'proto/skype-msg'))


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
  def startSync(self, conductor):
    return TwistySkype(self, conductor).attach()
