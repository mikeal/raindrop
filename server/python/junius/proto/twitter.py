#!/usr/bin/env python
'''
Fetch twitter raw* objects
'''

# prevent 'import twitter' finding this module!
from __future__ import absolute_import

import logging
import twisted.python.log
from twisted.internet import reactor, defer, threads

from ..proc import base
from ..model import get_db

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
    def __init__(self, account, reactor):
        self.account = account
        self.reactor = reactor
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
        # work out which tweets are 'new'
        startkey=['tweet', self.account.details['_id']]
        # oh for https://issues.apache.org/jira/browse/COUCHDB-194 to be fixed...
        endkey=['tweet', self.account.details['_id'] + 'ZZZZZZZZZZZZZZZZZZ']
        return get_db().openView('raindrop!messages!by', 'by_storage',
                                 startkey=startkey, endkey=endkey,
            ).addCallback(self.got_seen_tweets
            )

    def got_seen_tweets(self, rows):
        self.seen_tweets = set([r['key'][2] for r in rows])
        logger.debug("Have %d tweets already in the database",
                     len(self.seen_tweets))

        # build the list of all users we will fetch tweets from.
        return threads.deferToThread(self.twit.GetFriends
                  ).addCallback(self.got_friends)
        
    def got_friends(self, friends):
        dl = []
        for fid in [None] + [f.screen_name for f in friends]:
            dl.append(threads.deferToThread(self.twit.GetUserTimeline, fid
                            ).addCallback(self.got_friend_timeline, fid
                            ).addErrback(self.err_friend_timeline, fid
                            )
                      )

        return defer.DeferredList(dl)

    def err_friend_timeline(self, failure, fid):
        logger.error("Failed to fetch timeline for '%s': %s", fid, failure)

    def got_friend_timeline(self, timeline, fid):
        dl = []
        for tweet in timeline:
            if tweet.id not in self.seen_tweets:
                logger.info("New tweet %s", tweet.id)
                # create the couch document for the tweet itself.
                doc = dict(
                  type='rawMessage',
                  subtype='tweet',
                  account_id=self.account.details['_id'],
                  storage_key=tweet.id,
                )
                for name in TWEET_PROPS:
                    val = getattr(tweet, name)
                    # simple hacks - users just become the user ID.
                    if isinstance(val, twitter.User):
                        val = val.id
                    doc['twitter_'+name.lower()] = val
                dl.append(get_db().saveDoc(doc
                            ).addCallback(self.saved_tweet, tweet
                            ))
            else:
                # Must be a seen one.
                logger.debug("Skipping seen tweet '%s'", tweet.id)
        return defer.DeferredList(dl)

    def saved_tweet(self, result, tweet):
        logger.debug("Finished processing of new tweet '%s'", tweet.id)

    def finished(self, result):
        from ..sync import get_conductor
        return get_conductor().accountFinishedSync(self.account, result)


class TwitterAccount(base.AccountBase):
  def __init__(self, db, details):
    self.db = db
    self.details = details

  def startSync(self, conductor):
    return TwitterProcessor(self, reactor).attach()
