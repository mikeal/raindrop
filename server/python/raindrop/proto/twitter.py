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
import twitter

logger = logging.getLogger(__name__)


class TwitterProcessor(object):
    def __init__(self, account, conductor):
        self.account = account
        self.doc_model = account.doc_model # this is a little confused...
        self.conductor = conductor
        self.twit = None
        self.seen_tweets = None

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
        last_seen_ids = dict((int(r['key']), int(r['value'])) for r in rows)
        return self.conductor.coop.coiterate(
                    self.gen_friends_info(friends, last_seen_ids))

    def gen_friends_info(self, friends, last_seen_ids):
        logger.info("apparently I've %d friends", len(friends))
        def do_friend(friend):
            last_this = last_seen_ids.get(friend.id)
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
        yield do_friend(me)
        for f in friends:
            yield do_friend(f)

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
            doc = {}
            for name, val in tweet.AsDict().iteritems():
                val = getattr(tweet, name)
                # simple hacks - users just become the user ID.
                if isinstance(val, twitter.User):
                    val = val.id
                doc['twitter_'+name.lower()] = val
            # not clear if the user ID is actually needed.
            proto_id = "%s#%s" % (tweet.user.id, tid)
            yield self.doc_model.create_raw_documents(
                            self.account, [(proto_id, doc, 'proto/twitter')])


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
        return {'from': ['twitter', doc['twitter_user']],
                'body': body,
                'body_preview': body[:128],
                'tags': tags,
                # We don't have 'in seconds' seeing we came from AsDict() -
                # but are 'seconds' usable for a timestamp?
                #'timestamp': int(doc['twitter_created_at_in_seconds'])
                }


class TwitterAccount(base.AccountBase):
  def startSync(self, conductor):
    return TwitterProcessor(self, conductor).attach()
