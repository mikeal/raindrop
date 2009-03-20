#!/usr/bin/env python
'''
Fetch twitter raw* objects
'''

# prevent 'import twitter' finding this module!
from __future__ import absolute_import

import logging
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
    def __init__(self, account, conductor, doc_model):
        self.account = account
        self.conductor = conductor
        self.doc_model = doc_model
        self.twit = None
        self.seen_tweets = None

    def attach(self):
        logger.info("attaching to twitter...")
        username = self.account.details['username']
        pw = self.account.details['password']
        return threads.deferToThread(twitter.Api,
                                  username=username, password=pw
                    ).addCallback(self.attached
                    ).addBoth(self.finished
                    )

    def attached(self, twit):
        self.twit = twit
        # build the list of all users we will fetch tweets from.
        return threads.deferToThread(self.twit.GetFriends
                  ).addCallback(self.got_friends)

    def got_friends(self, friends):
        # None at the start means 'me'
        self.friends_remaining = [None] + [f.screen_name for f in friends]
        return self.process_next_friend()

    def process_next_friend(self):
        if not self.friends_remaining:
            logger.debug("Finished processing twitter friends")
            return

        fid = self.friends_remaining.pop()
        return threads.deferToThread(self.twit.GetUserTimeline, fid
                            ).addCallback(self.got_friend_timeline, fid
                            ).addErrback(self.err_friend_timeline, fid
                            )

    def err_friend_timeline(self, failure, fid):
        logger.error("Failed to fetch timeline for '%s': %s", fid, failure)
        return self.process_next_friend()

    def got_friend_timeline(self, timeline, fid):
        self.current_fid = fid
        self.remaining_tweets = timeline[:]
        return self.process_next_tweet()

    def process_next_tweet(self):
        if not self.remaining_tweets:
            logger.debug("Finished processing timeline")
            return self.process_next_friend()

        tweet = self.remaining_tweets.pop()

        logger.debug("seeing if tweet %r exists", tweet.id)
        docid = "tweet.%d" % (tweet.id,)
        return self.doc_model.open_document(docid,
                        ).addCallback(self.maybe_process_tweet, docid, tweet)

    def maybe_process_tweet(self, existing_doc, docid, tweet):
        if existing_doc is None:
            # put the 'raw' document object together and save it.
            logger.info("New tweet %s", tweet.id)
            # create the couch document for the tweet itself.
            doc = {}
            for name in TWEET_PROPS:
                val = getattr(tweet, name)
                # simple hacks - users just become the user ID.
                if isinstance(val, twitter.User):
                    val = val.id
                doc['twitter_'+name.lower()] = val
            return self.doc_model.create_raw_document(docid, doc, 'proto/twitter',
                                                      self.account
                        ).addCallback(self.saved_tweet, tweet)
        else:
            # Must be a seen one.
            logger.debug("Skipping seen tweet '%s'", tweet.id)
            return self.process_next_tweet()

    def saved_tweet(self, result, tweet):
        logger.debug("Finished processing of new tweet '%s'", tweet.id)
        return self.process_next_tweet()

    def finished(self, result):
        return self.conductor.on_synch_finished(self.account, result)


# A 'converter' - takes a proto/twitter as input and creates a
# 'message' as output (some other intermediate step might end up more
# appopriate)
class TwitterConverter(base.ConverterBase):
    def convert(self, doc):
        return {'from': ['twitter', doc['twitter_user']],
                'body': doc['twitter_text']}


class TwitterAccount(base.AccountBase):
  def __init__(self, db, details):
    self.db = db
    self.details = details

  def startSync(self, conductor, doc_model):
    return TwitterProcessor(self, conductor, doc_model).attach()
