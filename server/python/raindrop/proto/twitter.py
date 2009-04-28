#!/usr/bin/env python
'''
Fetch twitter raw* objects
'''

# prevent 'import twitter' finding this module!
from __future__ import absolute_import

import logging
import re
import twisted.python.log
from twisted.internet import defer, threads

from ..proc import base

# See http://code.google.com/p/python-twitter/issues/detail?id=13 for info
# about getting twisted support into the twitter package.
# Sadly, the twisty-twitter package has issues of its own (like calling
# delegates outside the deferred mechanism meaning you can't rely on callbacks
# being completed when they say they are.)

# So for now we are going with the blocking twitter package used via
# deferToThread for all blocking operations...
# twitter raises deprecation warnings in 2.6 - suppress them for now.
import warnings
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    import twitter

logger = logging.getLogger(__name__)


class TwitterProcessor(object):
    def __init__(self, account, conductor):
        self.account = account
        self.doc_model = account.doc_model # this is a little confused...
        self.conductor = conductor
        self.twit = None
        self.seen_tweets = None

    def user_to_raw(self, user):
        ret = {}
        for name, val in user.AsDict().iteritems():
            ret['twitter_'+name.lower()] = val
        return ret

    def tweet_to_raw(self, tweet):
        ret = {}
        for name, val in tweet.AsDict().iteritems():
            val = getattr(tweet, name)
            # simple hacks - users just become the user ID.
            if isinstance(val, twitter.User):
                val = val.screen_name
            ret['twitter_'+name.lower()] = val
        ret['twitter_created_at_in_seconds'] = tweet.GetCreatedAtInSeconds()
        return ret
        
    def attach(self):
        logger.info("attaching to twitter...")
        username = self.account.details['username']
        pw = self.account.details['password']
        return threads.deferToThread(twitter.Api,
                                  username=username, password=pw
                    ).addCallback(self.attached
                    )

    def attached(self, twit):
        logger.info("attached to twitter - fetching friends")
        self.twit = twit

        # build the list of all users we will fetch tweets from.
        return threads.deferToThread(self.twit.GetFriends
                  ).addCallback(self._cb_got_friends)

    def _cb_got_friends(self, friends):
        # Our 'seen' view is a reduce view, so we only get one result per
        # friend we pass in.  It is probably safe to assume we don't have
        # too many friends that we can't get them all in one hit...
        return self.doc_model.open_view('raindrop!proto!seen', 'twitter',
                                        group=True
                  ).addCallback(self._cb_got_seen, friends)

    def _cb_got_seen(self, result, friends):
        # result -> [{'key': '12449', 'value': 1371372980}, ...]
        # turn it into a map.
        rows = result['rows']
        last_seen_ids = dict((r['key'], int(r['value'])) for r in rows)
        return self.conductor.coop.coiterate(
                    self.gen_friends_info(friends, last_seen_ids))

    def gen_friends_info(self, friends, last_seen_ids):
        logger.info("apparently I've %d friends", len(friends))
        def check_identity(doc, friend):
            friend_raw = self.user_to_raw(friend)
            if doc is None or doc['raw'] != friend_raw:
                new_doc = {}
                if doc is not None:
                    new_doc['_rev'] = doc['_rev']
                new_doc['raw'] = friend_raw
                new_doc['identity_id'] = friend_raw['identity_id'] = \
                                            ['twitter', friend.screen_name]
                dinfos = [('id', 'twitter', friend.screen_name, new_doc)]
                return self.doc_model.create_raw_documents(self.account, dinfos)

        def do_friend_identity(friend):
            return self.doc_model.open_document('id', friend.screen_name, 'twitter'
                        ).addCallback(check_identity, friend
                        )
        
        def do_friend_tweets(friend):
            last_this = last_seen_ids.get(friend.screen_name)
            logger.debug("friend %r (%s) has latest tweet id of %s",
                         friend.screen_name, friend.id, last_this)
            return threads.deferToThread(
                    self.twit.GetUserTimeline, friend.id, since_id=last_this
                            ).addCallback(self._cb_got_friend_timeline, friend
                            ).addErrback(self.err_friend_timeline, friend
                            )

        # None means 'me' - but we don't really want to use 'None'.  This is
        # the only way I can work out how to get ourselves!
        me = self.twit.GetUser(self.twit._username)
        yield do_friend_identity(me)
        yield do_friend_tweets(me)
        for f in friends:
            yield do_friend_identity(f)
            yield do_friend_tweets(f)

        logger.debug("Finished friends")

    def err_friend_timeline(self, failure, friend):
        logger.error("Failed to fetch timeline for '%s': %s",
                     friend.screen_name, failure)

    def _cb_got_friend_timeline(self, timeline, friend):
        return self.conductor.coop.coiterate(
                    self.gen_friend_timeline(timeline, friend))

    def gen_friend_timeline(self, timeline, friend):
        for tweet in timeline:
            tid = tweet.id
            # put the 'raw' document object together and save it.
            logger.info("New tweet '%s...' (%s)", tweet.text[:25], tid)
            # create the couch document for the tweet itself.
            doc = self.tweet_to_raw(tweet)
            # not clear if the user ID is actually needed.
            proto_id = "%s#%s" % (tweet.user.id, tid)
            yield self.doc_model.create_raw_documents(
                            self.account,
                            [('msg', 'proto/twitter', proto_id, doc)])

# A 'converter' - takes a proto/twitter as input and creates a
# 'message' as output (some other intermediate step might end up more
# appropriate)
class TwitterConverter(base.SimpleConverterBase):
    target_type = 'msg', 'message'
    sources = [('msg', 'proto/twitter')]
    re_tags = re.compile(r'#(\w+)')    
    def simple_convert(self, doc):
        # for now, if a 'proto' can detect tags, it writes them directly
        # to a 'tags' attribute.
        body = doc['twitter_text']
        tags = self.re_tags.findall(body)
        conversation_id = doc.get('twitter_in_reply_to_status_id', doc['twitter_id'])
        return {'from': ['twitter', doc['twitter_user']],
                'body': body,
                'body_preview': body[:140],
                'tags': tags,
                'conversation_id' : str(conversation_id),
                'header_message_id': str(doc['twitter_id']),
                # we shoved GetCreatedAtInSeconds inside the func tweet_to_raw 
                # to fake having this property that doesn't come with AsDict
                'timestamp': doc['twitter_created_at_in_seconds']
                }

# Twitter identities...

# An identity 'converter' for twitter...
class TwitterRawConverter(base.SimpleConverterBase):
    target_type = 'id', 'twitter/raw'
    sources = [('id', 'twitter')]
    def simple_convert(self, doc):
        # here is a cheat - if the identity was created by our twitter
        # processor, it will have written a 'raw' dict - this means we don't
        # need to revisit twitter to get the details.  (If no 'raw' field
        # existed, then this was probably introduced by the front-end, where
        # all they know is the ID)
        assert 'raw' in doc, "Sorry front-end, you can't do that yet!"
        return doc['raw'].copy()


# The intent of this class is a 'union' of the useful fields we might want...
class TwitterBakedConverter(base.SimpleConverterBase):
    target_type = 'id', 'identity'
    sources = [('id', 'twitter/raw')]
    def simple_convert(self, doc):
        # Python's twitter API only gives us elts explicitly set, so many
        # may not exist...
        ret = {}
        for dest, src in [
            ('name', 'twitter_name'),
            ('nickname', 'twitter_screen_name'),
            ('url', 'twitter_url'),
            ('image', 'twitter_profile_image_url'),
            # XXX - this sucks - the ID things needs more thought - does it
            # really need to be carried forward?
            ('identity_id', 'identity_id'),
            ]:
            try:
                ret[dest] = doc[src]
            except KeyError:
                pass
        return ret


# An 'identity spawner' twitter/raw as input and creates a number of identities.
class TwitterIdentitySpawner(base.IdentitySpawnerBase):
    source_type = 'id', 'twitter/raw'
    def get_identity_rels(self, src_doc):
        return [r for r in self._gen_em(src_doc)]

    def _gen_em(self, props):
        # the primary 'twitter' one first...
        yield props['twitter_screen_name'], None
        v = props.get('twitter_url')
        if v:
            yield ('url', v.rstrip('/')), 'homepage'

    def get_default_contact_props(self, src_doc):
        return {
            'name': src_doc['twitter_name'] or src_doc['twitter_screen_name']
        }


class TwitterAccount(base.AccountBase):
  def startSync(self, conductor):
    return TwitterProcessor(self, conductor).attach()
