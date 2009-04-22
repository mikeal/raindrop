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

USER_PROPS = [
    # extras include 'handle' and 'IsSkypeOutContact'
    ('ABOUT', unicode),
    ('ALIASES', list),
    ('BIRTHDAY', unicode),
    ('CITY', unicode),
    ('COUNTRY', unicode),
    ('DISPLAYNAME', unicode),
    ('FULLNAME', unicode),
    ('HASCALLEQUIPMENT', bool),
    ('HOMEPAGE', unicode),
    ('ISAUTHORIZED', bool),
    ('ISBLOCKED', bool),
    ('IS_VIDEO_CAPABLE', bool),
    ('IS_VOICEMAIL_CAPABLE', bool),
    ('LANGUAGE', unicode),
    ('MOOD_TEXT', unicode),
    ('ONLINESTATUS', unicode),
    ('PHONE_HOME', unicode),
    ('PHONE_MOBILE', unicode),
    ('PHONE_OFFICE', unicode),
    ('PROVINCE', unicode),
    ('RICH_MOOD_TEXT', unicode),
    ('SEX', unicode),
    ('SPEEDDIAL', unicode),
    ('TIMEZONE', int),
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

    def get_provid_for_chat(self, chat):
        return chat.Name.encode('utf8') # hrmph!

    def get_provid_for_msg(self, msg):
        return "%s-%d" % (self.account.details['username'], msg._Id)

    def get_provid_for_user(self, user):
        return user.Handle

    def attach(self):
        logger.info("attaching to skype...")
        d = threads.deferToThread(self.skype.Attach)
        d.addCallback(self.attached)
        return d

    def attached(self, status):
        logger.info("attached to skype - getting chats")
        return defer.DeferredList([
            threads.deferToThread(self.skype._GetChats
                    ).addCallback(self._cb_got_chats
                    ),
            threads.deferToThread(self.skype._GetFriends
                    ).addCallback(self._cb_got_friends
                    ),
            ])

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
        return self.doc_model.open_view('raindrop!proto!seen', 'skype',
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
        tow = [] # documents to write.
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
        doc ={}
        for (name, typ), (ok, val) in zip(CHAT_PROPS, results):
            if ok:
                doc['skype_'+name.lower()] = simple_convert(val, typ)

        # 'Name' is a special case that doesn't come via a prop.  We use
        # 'chatname' as that is the equiv attr on the messages themselves.
        doc['skype_chatname'] = chat.Name
        provid = self.get_provid_for_chat(chat)
        pending.append(('msg', 'proto/skype-chat', provid, doc))

    def _cb_got_msg_props(self, results, chat, msg, pending):
        logger.debug("got message properties for %s", msg._Id)
        doc = {}
        for (name, typ), (ok, val) in zip(MSG_PROPS, results):
            if ok:
                doc['skype_'+name.lower()] = simple_convert(val, typ)
        doc['skype_id'] = msg._Id
        # we include the skype username with the ID as they are unique per user.
        provid = self.get_provid_for_msg(msg)
        pending.append(('msg', 'proto/skype-msg', provid, doc))

    # friends...
    def _cb_got_friends(self, friends):
        logger.debug("skype has %d friends(s) total", len(friends))

        def gen_friends():
            for friend in friends:
                # make a 'deferred list' to fetch each property one at a time.
                ds = [threads.deferToThread(friend._Property, p)
                      for p, _ in USER_PROPS]
                yield defer.DeferredList(ds
                            ).addCallback(self._cb_got_friend_props, friend)
                
            logger.info("skype has finished processing all friends")

        return self.conductor.coop.coiterate(gen_friends())

    def _cb_got_friend_props(self, results, friend):
        def check_identity(doc, friend, friend_raw):
            fhandle = friend._Handle
            if doc is None or doc['raw'] != friend_raw:
                new_doc = {}
                if doc is not None:
                    new_doc['_rev'] = doc['_rev']
                new_doc['raw'] = friend_raw
                
                # *sob* - these identity ids kinda suck.
                new_doc['identity_id'] = friend_raw['identity_id'] = \
                                    ['skype', fhandle]
                dinfos = [('id', 'skype', fhandle, new_doc)]
                logger.info('creating new doc for contact %r', fhandle)
                return self.doc_model.create_raw_documents(self.account, dinfos)
            else:
                logger.debug('existing contact %r is up to date', fhandle)

        logger.debug("got friend properties for %s", friend._Handle)
        raw = {}
        for (name, typ), (ok, val) in zip(USER_PROPS, results):
            if ok:
                raw['skype_'+name.lower()] = simple_convert(val, typ)
        raw['skype_id'] = friend._Handle

        # See if we have an existing contact - if so, update it.
        return self.doc_model.open_document('id', friend._Handle, 'skype'
                    ).addCallback(check_identity, friend, raw
                    )


# A 'converter' - takes a proto/skype-msg as input and creates a
# 'message' as output (some other intermediate step might end up more
# appopriate)
class SkypeConverter(base.SimpleConverterBase):
    target_type = 'msg', 'message'
    sources = [
        ('msg', 'proto/skype-msg'),
    ]
    def simple_convert(self, doc):
        # We need to open the 'chat' for this Message.  Clearly this is
        # going to be inefficient...
        proto_id = doc['skype_chatname'].encode('utf8') # hrmph!
        return self.doc_model.open_document('msg', proto_id,
                                            'proto/skype-chat'
                        ).addCallback(self.finish_convert, doc)

    def finish_convert(self, chat_doc, doc):
        assert chat_doc is not None, "failed to fetch skype chat!"
        subject = chat_doc['skype_friendlyname']
        return {'from': ['skype', doc['skype_from_handle']],
                'subject': subject,
                'body': doc['skype_body'],
                'body_preview': doc['skype_body'][:128],
                'conversation_id': doc['skype_chatname'],
                'timestamp': doc['skype_timestamp'], # skype's works ok here?
                }

# An identity 'converter' for skype...
class SkypeRawConverter(base.SimpleConverterBase):
    target_type = 'id', 'skype/raw'
    sources = [('id', 'skype')]
    def simple_convert(self, doc):
        # here is a cheat - if the identity was created by our skype
        # processor, it will have written a 'raw' dict - this means we don't
        # need to revisit skype to get the details.  (If no 'raw' field
        # existed, then this was probably introduced by the front-end, where
        # all they know is the ID)
        assert 'raw' in doc, "Sorry front-end, you can't do that yet!"
        return doc['raw'].copy()


# The intent of this class is a 'union' of the useful fields we might want...
class SkypeBakedConverter(base.SimpleConverterBase):
    target_type = 'id', 'identity'
    sources = [('id', 'skype/raw')]
    def simple_convert(self, doc):
        ret = {
            'name' : doc['skype_displayname'],
            'nickname' : doc['skype_id'],
            'url' : doc['skype_homepage'],
            # image is interesting... - skype lets us save it to a file.
            # I wonder if we can get away with a relative URL pointing to
            # our user's attachment?
        }
        # XXX - this sucks - the ID things needs more thought - does it
        # really need to be carried forward?
        ret['identity_id'] = doc['identity_id']
        return ret


class SkypeAccount(base.AccountBase):
  def startSync(self, conductor):
    return TwistySkype(self, conductor).attach()
