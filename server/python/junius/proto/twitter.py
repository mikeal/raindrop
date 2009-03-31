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

TWEET_PROPS = """
        created_at created_at_in_seconds favorited in_reply_to_screen_name
        in_reply_to_user_id in_reply_to_status_id truncated
        source id text relative_created_at user
""".split()


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
        return self.conductor.coop.coiterate(self.gen_friends_info(friends))
        
    def gen_friends_info(self, friends):
        logger.info("apparently I've %d friends", len(friends))
        def do_fid(fid):
            return threads.deferToThread(self.twit.GetUserTimeline, fid
                                ).addCallback(self.got_friend_timeline, fid
                                ).addErrback(self.err_friend_timeline, fid
                                ).addCallback(self.finished_friend
                                )

        # None means 'me'
        yield do_fid(None)
        for f in friends:
            yield do_fid(f.screen_name)

        logger.debug("Finished friends")

    def finished_friend(self, result):
        logger.debug("finished friend: %s", result)

    def err_friend_timeline(self, failure, fid):
        logger.error("Failed to fetch timeline for '%s': %s", fid, failure)

    def got_friend_timeline(self, timeline, fid):
        logger.debug("Friend %r has %d items in their timeline", fid,
                     len(timeline))
        return self.conductor.coop.coiterate(
                    self.gen_friend_timeline(timeline, fid))

    def gen_friend_timeline(self, timeline, fid):
        for tweet in timeline:
            logger.debug("seeing if tweet %r exists", tweet.id)
            docid = "tweet.%d" % (tweet.id,)
            yield self.doc_model.open_document(docid,
                            ).addCallback(self.maybe_process_tweet, docid, tweet)

    def maybe_process_tweet(self, existing_doc, docid, tweet):
        if existing_doc is None:
            # put the 'raw' document object together and save it.
            logger.info("New tweet '%s...' (%s)", tweet.text[:25], tweet.id)
            # create the couch document for the tweet itself.
            doc = {}
            for name in TWEET_PROPS:
                val = getattr(tweet, name)
                # simple hacks - users just become the user ID.
                if isinstance(val, twitter.User):
                    val = val.id
                doc['twitter_'+name.lower()] = val
            return self.doc_model.create_raw_document(
                            self.account, docid, doc, 'proto/twitter')
        else:
            # Must be a seen one.
            logger.debug("Skipping seen tweet '%s'", tweet.id)


# A 'converter' - takes a proto/twitter as input and creates a
# 'message' as output (some other intermediate step might end up more
# appropriate)
class TwitterConverter(base.ConverterBase):
    re_tags = re.compile(r'#(\w+)')    
    def convert(self, doc):
        # for now, if a 'proto' can detect tags, it writes them directly
        # to a 'tags' attribute.
        body = doc['twitter_text']
        tags = self.re_tags.findall(body)
        return {'from': ['twitter', doc['twitter_user']],
                'body': body,
                'body_preview': body[:128],
                'tags': tags,
                'timestamp': int(doc['twitter_created_at_in_seconds'])
                }


class TwitterAccount(base.AccountBase):
  def startSync(self, conductor):
    return TwitterProcessor(self, conductor).attach()
