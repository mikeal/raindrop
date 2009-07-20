#!/usr/bin/env python
'''
Fetch twitter raw* objects
'''

# prevent 'import twitter' finding this module!
from __future__ import absolute_import

import logging
import sys
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

re_user = re.compile(r'@(\w+)')

def user_to_raw(user):
    items = {}
    for name, val in user.AsDict().iteritems():
        items['twitter_'+name.lower()] = val
    return items

def tweet_to_raw(tweet): # Also used for direct messages....
    ret = {}
    for name, val in tweet.AsDict().iteritems():
        val = getattr(tweet, name)
        # simple hacks - users just become the user ID.
        if isinstance(val, twitter.User):
            new_field_name = 'twitter_'+name.lower()
            if not new_field_name.endswith('_name'):
                new_field_name += '_name'
            ret[new_field_name] = val.GetName()
            val = val.screen_name
        ret['twitter_'+name.lower()] = val
    ret['twitter_created_at_in_seconds'] = tweet.GetCreatedAtInSeconds()
    return ret
    

class TwitterProcessor(object):
    # The 'id' of this extension
    # XXX - should be managed by our caller once these 'protocols' become
    # regular extensions.
    rd_extension_id = 'proto.twitter'
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

    @defer.inlineCallbacks
    def attached(self, twit):
        logger.info("attached to twitter - fetching timeline")
        self.twit = twit

        # This is the only way I can work out how to get ourselves!
        me = self.twit.GetUser(self.twit._username)
        seen_friends = [me]

        this_users = {} # probably lots of dupes
        this_items = {} # tuple of (twitter_item, rd_key, schema_id)
        keys = []

        # We need to be careful of rate-limiting, so we try and use
        # the min twitter requests possible to fetch our data.
        # GetFriendsTimeline is the perfect entry point - 200 tweets and
        # all info about twitting users in a single request.
        tl= yield threads.deferToThread(self.twit.GetFriendsTimeline,
                                        count=200)
        for status in tl:
            rd_key = ['tweet', status.id]
            schema_id = 'rd.msg.tweet.raw'
            keys.append(['rd.core.content', 'key-schema_id', [rd_key, schema_id]])
            this_items[status.id] = (status, rd_key, schema_id)
            this_users[status.user.screen_name] = status.user
        # now the same thing for direct messages.
        ml = yield threads.deferToThread(self.twit.GetDirectMessages)
        for dm in ml:
            rd_key = ['tweet-direct', dm.id]
            schema_id = 'rd.msg.tweet-direct.raw'
            keys.append(['rd.core.content', 'key-schema_id', [rd_key, schema_id]])
            this_items[dm.id] = (dm, rd_key, schema_id)
            if dm.sender_screen_name not in this_users: # don't override a valid one!
                this_users[dm.sender_screen_name] = None # say we don't have this user object.

        # execute a view to work out which of these tweets/messages are new.
        results = yield self.doc_model.open_view(keys=keys, reduce=False)
        seen_tweets = set()
        for row in results['rows']:
            seen_tweets.add(row['value']['rd_key'][1])

        infos = []
        for tid in set(this_items.keys())-set(seen_tweets):
            # create the schema for the tweet/message itself.
            item, rd_key, schema_id = this_items[tid]
            fields = tweet_to_raw(item)
            infos.append({'rd_key' : rd_key,
                          'ext_id': self.rd_extension_id,
                          'schema_id': schema_id,
                          'items': fields})

        # now the same treatment for the users we found; although for users
        # the fact they exist isn't enough - we also check their profile is
        # accurate.
        keys = []
        for sn in this_users.iterkeys():
            keys.append(['rd.core.content', 'key-schema_id',
                         [["identity", ["twitter", sn]], 'rd.identity.twitter']])
        # execute a view process these users.
        results = yield self.doc_model.open_view(keys=keys, reduce=False,
                                                 include_docs=True)
        seen_users = {}
        for row in results['rows']:
            _, idid = row['value']['rd_key']
            _, name = idid
            seen_users[name] = row['doc']

        # XXX - check the account user is in the list!!

        # XXX - check fields later - for now just check they don't exist.
        for sn in set(this_users.keys())-set(seen_users.keys()):
            user = this_users[sn]
            if user is None:
                # this can happen if we have a direct message from the user
                # but haven't seen any 'normal' tweets from them...
                logger.info("Have unknown user %r - todo - fetch me!", sn)
                continue
            items = user_to_raw(user)
            rdkey = ['identity', ['twitter', sn]]
            infos.append({'rd_key' : rdkey,
                          'ext_id': self.rd_extension_id,
                          'schema_id': 'rd.identity.twitter',
                          'items': items})

        _ = yield self.doc_model.create_schema_items(infos)


class TwitterAccount(base.AccountBase):
  def startSync(self, conductor):
    return TwitterProcessor(self, conductor).attach()

  def get_identities(self):
    return [('twitter', self.details['username'])]
