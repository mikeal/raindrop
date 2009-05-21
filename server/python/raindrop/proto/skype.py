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
    # The 'id' of this extension
    # XXX - should be managed by our caller once these 'protocols' become
    # regular extensions.
    rd_extension_id = 'proto.skype'
    def __init__(self, account, conductor):
        self.account = account
        self.doc_model = account.doc_model # this is a little confused...
        self.conductor = conductor
        self.skype = Skype4Py.Skype()

    def get_rdkey_for_chat(self, chat):
        return ('skype-chat', chat.Name.encode('utf8')) # hrmph!

    def get_rdkey_for_msg(self, msg):
        return ('skype-msg',
                "%s-%d" % (self.account.details['username'], msg._Id))

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
        keys = [[self.get_rdkey_for_chat(c),
                 'rd/msg/skypechat/raw',
                 self.rd_extension_id] for c in chats]
        return self.doc_model.open_view('raindrop!docs!all', 'by_raindrop_key',
                                        keys=keys
                    ).addCallback(self._cb_got_seen_chats, chats
                    )

    def _cb_got_seen_chats(self, result, chats):
        seen_chats = set([r['key'][0][1] for r in result['rows']])
        nnew = len(chats)-len(seen_chats)
        logger.debug("skype has %d chat(s) total %d new", len(chats), nnew)
        # fetch all the messages (future optimization; all we need are the
        # IDs, but we suffer from creating an instance wrapper for each item.
        # Sadly the skype lib doesn't offer a clean way of doing this.)
        def gen_chats(chats):
            for chat in chats:
                yield threads.deferToThread(chat._GetMessages
                        ).addCallback(self._cb_got_messages, chat, seen_chats
                        )
            logger.info("skype has finished processing all chats")

        return self.conductor.coop.coiterate(gen_chats(chats))

    def _cb_got_messages(self, messages, chat, seen_chats):
        logger.debug("chat '%s' has %d message(s) total; looking for new ones",
                     chat.Name, len(messages))

        # Finally got all the messages for this chat.  Execute a view to
        # determine which we have seen (note that we obviously could just
        # fetch the *entire* chats+msgs view once - but we do it this way on
        # purpose to ensure we remain scalable...)
        keys = [[self.get_rdkey_for_msg(m),
                 'rd/msg/skypemsg/raw',
                 self.rd_extension_id] for m in messages]
        return self.doc_model.open_view('raindrop!docs!all', 'by_raindrop_key',
                                        keys=keys
                    ).addCallback(self._cb_got_seen, chat, messages, seen_chats,
                    )

    def _cb_got_seen(self, result, chat, messages, seen_chats):
        msgs_by_id = dict((self.get_rdkey_for_msg(m)[1], m) for m in messages)
        chatname = chat.Name
        need_chat = chatname not in seen_chats

        seen_msgs = set([r['key'][0][1] for r in result['rows']])
        remaining = set(msgs_by_id.keys())-set(seen_msgs)
        # we could just process the empty list as normal, but the logging of
        # an info when we do have items is worthwhile...
        if not remaining and not need_chat:
            logger.debug("Chat %r has no new items to process", chatname)
            return None
        # we have something to do...
        logger.info("Chat %r has %d items to process", chatname,
                    len(remaining))
        logger.debug("we've already seen %d items from this chat",
                     len(seen_msgs))
        return self.conductor.coop.coiterate(
                    self.gen_items(chat, remaining, msgs_by_id, need_chat))

    def gen_items(self, chat, todo, msgs_by_id, need_chat):
        tow = [] # documents to write.
        if need_chat:
            # we haven't seen the chat itself - do that.
            logger.debug("Creating new skype chat %r", chat.Name)
            # make a 'deferred list' to fetch each property one at a time.
            ds = [threads.deferToThread(chat._Property, p)
                  for p, _ in CHAT_PROPS]
            yield defer.DeferredList(ds
                        ).addCallback(self._cb_got_chat_props, chat, tow)
            
        for msgid in todo:
            msg = msgs_by_id[msgid]
            # A new msg in this chat.
            logger.debug("New skype message %d", msg._Id)
            # make a 'deferred list' to fetch each property one at a time.
            ds = [threads.deferToThread(msg._Property, p) for p, _ in MSG_PROPS]
            yield defer.DeferredList(ds
                        ).addCallback(self._cb_got_msg_props, chat, msg, tow)

        if tow:
            yield self.doc_model.create_schema_items(tow)

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
        rdkey = self.get_rdkey_for_chat(chat)
        pending.append({'rd_key' : rdkey,
                        'ext_id': self.rd_extension_id,
                        'schema_id': 'rd/msg/skypechat/raw',
                        'items': doc})

    def _cb_got_msg_props(self, results, chat, msg, pending):
        logger.debug("got message properties for %s", msg._Id)
        doc = {}
        for (name, typ), (ok, val) in zip(MSG_PROPS, results):
            if ok:
                doc['skype_'+name.lower()] = simple_convert(val, typ)
        doc['skype_id'] = msg._Id
        # Denormalize the simple chat properties we need later to avoid us
        # needing to reopen the chat for each message in that chat...
        # XXX - this may bite us later - what happens when the chat subject
        # changes? :(  For now it offers serious speedups, so it goes in.
        doc['skype_chat_friendlyname'] = chat.FriendlyName
        # we include the skype username with the ID as they are unique per user.
        rdkey = self.get_rdkey_for_msg(msg)
        pending.append({'rd_key' : rdkey,
                        'ext_id': self.rd_extension_id,
                        'schema_id': 'rd/msg/skypemsg/raw',
                        'items': doc})

    # friends...
    def _cb_got_friends(self, friends):
        logger.debug("skype has %d friends(s) total", len(friends))

        schemas = []
        for friend in friends:
            # Simply emit a NULL document with the 'exists' schema - that is
            # just an 'assertion' the identity exists - the framework
            # will take care of handling the fact it may already exist.
            rdkey = ('identity', ('skype', friend._Handle))
            item = rdkey, self.rd_extension_id, 'rd/identity', None, None
            schemas.append({'rd_key' : rdkey,
                            'schema_id' : 'rd/identity/exists',
                            'items' : None,
                            'ext_id': self.rd_extension_id})
        return self.doc_model.create_schema_items(schemas)

# A 'converter' - takes a rd/msg/skypemsg/raw as input and creates various
# schema outputs for that message - specifically 'body' and 'conversation'
@base.raindrop_extension('rd/msg/skypemsg/raw')
def skype_converter(doc):
    subject = doc['skype_chat_friendlyname']
    # Currently 'body' also defines 'envelope' type items
    bdoc = {'from': ['skype', doc['skype_from_handle']],
            'subject': subject,
            'body': doc['skype_body'],
            'body_preview': doc['skype_body'][:140],
            'timestamp': doc['skype_timestamp'], # skype's works ok here?
            }
    emit_schema('rd/msg/body', bdoc)
    # and a conversation schema
    cdoc = {'conversation_id': doc['skype_chatname']}
    emit_schema('rd/msg/conversation', cdoc)


_skype_id_converter_skype = None

@base.raindrop_extension('rd/identity/exists')
def skype_id_converter(doc):
    typ, (id_type, iid) = doc['rd_key']
    assert typ=='identity' # Must be an 'identity' to have this schema type!
    if id_type != 'skype':
        # Not a skype ID.
        return
    # Is a skype ID - attach to skype and process it.
    global _skype_id_converter_skype
    if _skype_id_converter_skype is None:
        _skype_id_converter_skype = Skype4Py.Skype()
        _skype_id_converter_skype.Attach()
    s = _skype_id_converter_skype

    user = s.User(iid)
    props = {'skype_handle': user._Handle}
    for name, typ in USER_PROPS:
        val = user._Property(name)
        props['skype_'+name.lower()] = simple_convert(val, typ)

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
        has_avatar = True
    except Skype4Py.errors.ISkypeError, why:
        has_avatar = False
        # apparently:
        # invalid 'avatar' index: [Errno 114] GET Invalid avatar
        # no avatar at all: [Errno 122] GET Unable to load avatar
        if why[0] in (114, 122):
            logger.debug("friend %r has no avatar (%s)", iid, why)
        else:
            logger.warning("Cannot save avatar for skype user %s", iid)

    did = emit_schema('rd/identity/skype', props)

    # emit one for the normalized identity schema
    props = {
            'name' : user.DisplayName or user.FullName,
            'nickname' : user._Handle
    }
    user_homepage = user.Homepage
    if user_homepage:
        props['url'] = user_homepage

    if has_avatar:
        props['image'] = '/%s/avatar1' % did
    emit_schema('rd/identity', props)

    # and finally emit lots of other raw identities we can deduce for this
    # user.

# An 'identity spawner' skype/raw as input and creates a number of identities.
# Uses a different 'emit_*' function which does some higher-level contacts
# work with the result schemas.
@base.raindrop_extension('rd/identity/skype')
def skype_id_rel_maker(doc):
    def _gen_em(props):
        # the primary 'skype' one first...
        yield ('skype', props['skype_handle']), None
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
            yield ('phone', props['skype_handle']), 'home'

    def_contact_props = {
        'name': doc['skype_displayname'] or doc['skype_fullname'],
    }
    emit_related_identities(_gen_em(doc), def_contact_props)


class SkypeAccount(base.AccountBase):
  def startSync(self, conductor):
    return TwistySkype(self, conductor).attach()
