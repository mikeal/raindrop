#!/usr/bin/env python
'''
Fetch skype contacts and chats.
'''
import os
import logging
import tempfile

import twisted.python.log
from twisted.internet import defer, threads
from twisted.python.failure import Failure

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
        return threads.deferToThread(self.skype.Attach
                    ).addCallback(self.attached
                    )

    def attached(self, status):
        def get_friends_and_me():
            return (self.skype.CurrentUser,) + self.skype.Friends

        logger.info("attached to skype - getting chats")
        return defer.DeferredList([
            threads.deferToThread(self.skype._GetChats
                    ).addCallback(self._cb_got_chats
                    ),
            threads.deferToThread(get_friends_and_me
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

        def check_identity(doc, friend):
            fhandle = friend._Handle
            # See if we have an existing contact - if so, update it.
            if doc is None:
                new_doc = {'identity_id': ['skype', fhandle],
                          }
                # XXX - needs refactoring so each protocol doesn't know this,
                # the 'provider_id' is currently a hack of 'proto/id'
                prov_id = 'skype/%s' % fhandle
                dinfos = [('id', 'skype', prov_id, new_doc)]
                logger.info('creating new doc for %r', fhandle)
                return self.doc_model.create_raw_documents(self.account, dinfos)
            else:
                logger.debug('existing contact %r is up to date', fhandle)
                return None

        def gen_friend_checks():
            for friend in friends:
                prov_id = 'skype/%s' % friend._Handle
                yield self.doc_model.open_document('id', prov_id, 'skype'
                    ).addCallback(check_identity, friend,
                    )
            logger.info("skype has finished processing all friends")

        return self.conductor.coop.coiterate(gen_friend_checks())


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
                'body_preview': doc['skype_body'][:140],
                'conversation_id': doc['skype_chatname'],
                'timestamp': doc['skype_timestamp'], # skype's works ok here?
                }

# An identity 'converter' for skype...
class SkypeRawConverter(base.SimpleConverterBase):
    target_type = 'id', 'skype/raw'
    sources = [('id', 'skype')]

    def __init__(self, *args, **kw):
        super(SkypeRawConverter, self).__init__(*args, **kw)
        self.skype = Skype4Py.Skype()
        self.attached = False

    def _get_skype(self):
        # *sob* - this is painful as attach may block for a very long time :(
        if self.attached:
            return self.skype
        def return_skype(result):
            self.attached = True
            return self.skype
        return threads.deferToThread(self.skype.Attach
                    ).addCallback(return_skype
                    )

    def _fetch_user_info(self, skype, doc):
        # Called in a thread so we can block...
        proto, iid = doc['identity_id']
        assert proto=='skype'
        user = skype.User(iid)
        props = {}
        for name, typ in USER_PROPS:
            val = user._Property(name)
            props['skype_'+name.lower()] = simple_convert(val, typ)

        # XXX - this sucks - the ID things needs more thought - does it
        # really need to be carried forward?
        props['identity_id'] = doc['identity_id']

        # Avatars...
        # for now just attempt to get one avatar for this user...
        avfname = tempfile.mktemp(".jpg", "raindrop-skype-avatar")
        try:
            try:
                user.SaveAvatarToFile(avfname)
                # apparently the avatar was saved...
                with open(avfname, "rb") as f:
                    data = f.read()
            finally:
                # apparently skype still creates a 0-byte file when there
                # are no avatars...
                try:
                    os.unlink(avfname)
                except os.error, why:
                    logger.warning('failed to remove avatar file %r: %s',
                                   avfname, why)
            logger.debug("got an avatar for %r", iid)
            # the literal '1' reflects the 1-based indexing of skype..
            attachments = {'avatar1' :
                                {'content_type': 'image/jpeg',
                                 'data': data,
                                }
                           }
            props['_attachments'] = attachments
        except Skype4Py.errors.ISkypeError, why:
            # apparently:
            # invalid 'avatar' index: [Errno 114] GET Invalid avatar
            # no avatar at all: [Errno 122] GET Unable to load avatar
            if why[0] in (114, 122):
                logger.debug("friend %r has no avatar (%s)", iid, why)
            else:
                logger.warning("Cannot save avatar for skype user %s", iid)
        return props

    def simple_convert(self, doc):
        def return_props(ret, props):
            return props

        def fetch(skype):
            return threads.deferToThread(self._fetch_user_info, skype, doc)

        return defer.maybeDeferred(self._get_skype
                ).addCallback(fetch
                )

# The intent of this class is a 'union' of the useful fields we might want...
class SkypeBakedConverter(base.SimpleConverterBase):
    target_type = 'id', 'identity'
    sources = [('id', 'skype/raw')]
    def simple_convert(self, doc):
        ret = {
            'name' : doc['skype_displayname'] or doc['skype_fullname'],
            'nickname' : doc['identity_id'][1],
            'url' : doc['skype_homepage'],
        }

        if '_attachments' in doc:
            assert 'avatar1' in doc['_attachments'], doc
            ret['image'] = '/%s/avatar1' % self.doc_model.quote_id(doc['_id'])

        ret['identity_id'] = doc['identity_id']
        return ret

# An 'identity spawner' skype/raw as input and creates a number of identities.
class SkypeIdentitySpawner(base.IdentitySpawnerBase):
    source_type = 'id', 'skype/raw'
    def get_identity_rels(self, src_doc):
        return [r for r in self._gen_em(src_doc)]

    def _gen_em(self, props):
        # the primary 'skype' one first...
        yield props['identity_id'], None
        v = props.get('skype_homepage')
        if v:
            yield ('url', v.rstrip('/')), 'homepage'
        # NOTE: These 'phone' identities are only marginally useful now as
        # although skype seems to help convert it to the +... format, it
        # doesn't normalize the rest of it.
        # may want to normalize to something like "remove everything not a
        # number except the leading + and an embedded 'x' for extension".
        # Optionally, if we wind up storing an unnormalized one for display
        # purposes just nuke all non-numbers.
        v = props.get('skype_phone_home')
        if v:
            yield ('phone', v), 'home'
        v = props.get('skype_phone_mobile')
        if v:
            yield ('phone', v), 'mobile'
        v = props.get('skype_phone_office')
        if v:
            yield ('phone', v), 'office'
        # skype-out contacts seem a little strange - they don't have
        # any phone numbers - but their ID is the phone-number!  Skype
        # displays the number as a 'home' number...
        if props.get('skype_onlinestatus')=='SKYPEOUT':
            yield ('phone', props['identity_id'][1]), 'home'

    def get_default_contact_props(self, src_doc):
        return {
            'name': src_doc['skype_displayname'] or src_doc['skype_fullname'],
        }


class SkypeAccount(base.AccountBase):
  def startSync(self, conductor):
    return TwistySkype(self, conductor).attach()
