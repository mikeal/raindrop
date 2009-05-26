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
from urllib2 import HTTPError # errors thrown by twitter...

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

def tweet_to_raw(tweet):
    ret = {}
    for name, val in tweet.AsDict().iteritems():
        val = getattr(tweet, name)
        # simple hacks - users just become the user ID.
        if isinstance(val, twitter.User):
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

        # We need to be careful of rate-limiting, so we try and use
        # the min twitter requests possible to fetch our data.
        # GetFriendsTimeline is the perfect entry point - 200 tweets and
        # all info about twitting users in a single request.
        tl= yield threads.deferToThread(self.twit.GetFriendsTimeline,
                                        count=200)
        this_users = {} # probably lots of dupes
        this_tweets = {}
        keys = []
        for status in tl:
            keys.append(['rd/core/content', 'key-schema_id', [["tweet", status.id], 'rd/msg/tweet/raw']])
            this_tweets[status.id] = status
            this_users[status.user.screen_name] = status.user

        # execute a view to work out which of these tweets are new.
        results = yield self.doc_model.open_view(keys=keys, reduce=False)
        seen_tweets = set()
        for row in results['rows']:
            seen_tweets.add(row['value']['rd_key'][1])

        infos = []
        for tid in set(this_tweets.keys())-set(seen_tweets):
            # create the schema for the tweet itself.
            tweet = this_tweets[tid]
            fields = tweet_to_raw(tweet)
            rdkey = ['tweet', tid]
            infos.append({'rd_key' : rdkey,
                          'ext_id': self.rd_extension_id,
                          'schema_id': 'rd/msg/tweet/raw',
                          'items': fields})

        # now the same treatment for the users we found; although for users
        # the fact they exist isn't enough - we also check their profile is
        # accurate.
        keys = []
        for sn in this_users.iterkeys():
            keys.append(['rd/core/content', 'key-schema_id',
                         [["identity", ["twitter", sn]], 'rd/identity/twitter']])
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
            items = user_to_raw(user)
            rdkey = ['identity', ['twitter', sn]]
            infos.append({'rd_key' : rdkey,
                          'ext_id': self.rd_extension_id,
                          'schema_id': 'rd/identity/twitter',
                          'items': items})

        _ = yield self.doc_model.create_schema_items(infos)


# A 'converter' - takes a rd/msg/tweet/raw as input and creates various
# schema outputs for that message
re_tags = re.compile(r'#(\w+)')

@base.raindrop_extension('rd/msg/tweet/raw')
def tweet_converter(doc):
    # body schema
    body = doc['twitter_text']
    bdoc = {'from': ['twitter', doc['twitter_user']],
            'body': body,
            'body_preview': body[:140],
            # we shoved GetCreatedAtInSeconds inside the func tweet_to_raw 
            # to fake having this property that doesn't come with AsDict
            'timestamp': doc['twitter_created_at_in_seconds']
    }
    emit_schema('rd/msg/body', bdoc)
    # and a conversation schema
    conversation_id = 'twitter-%s' % doc.get('twitter_in_reply_to_status_id', doc['twitter_id'])
    cdoc = {'conversation_id': conversation_id}
    emit_schema('rd/msg/conversation', cdoc)
    # and tags
    tags = re_tags.findall(body)
    if tags:
        tdoc = {'tags': tags}
        emit_schema('rd/tags', tdoc)


# Twitter identities...
_twitter_id_converter = None

@base.raindrop_extension('rd/identity/exists')
def twitter_exists_id_converter(doc):
    typ, (id_type, id_id) = doc['rd_key']
    assert typ=='identity' # Must be an 'identity' to have this schema type!
    if id_type != 'twitter':
        # Not a twitter ID.
        return

    # if we already have a twitter/raw schema for the user just skip it
    # XXX - later we should check the items are accurate...
    key = ['rd/core/content', 'key-schema_id', [doc['rd_key'], 'rd/identity/twitter']]
    results = open_view(key=key, reduce=False)
    if results['rows']:
        logger.debug("already seen this twitter user - skipping")
        return
    
    # Is a new twitter ID - attach to twitter and process it.
    global _twitter_id_converter
    if _twitter_id_converter is None:
        _twitter_id_converter = twitter.Api()
    twit = _twitter_id_converter

    try:
        user = twit.GetUser(id_id)
    # *sob* - twitter package causes urllib2 errors :(
    except HTTPError, exc:
        if exc.code == 400:
            raise RuntimeError("we seem to have saturated twitter - "
                               "please try again in an hour or so...")
        elif exc.code == 404:
            logger.info("twitter user %r does not exist", id_id)
            return
        else:
            raise

    items = user_to_raw(user)
    emit_schema('rd/identity/twitter', items)

@base.raindrop_extension('rd/identity/twitter')
def twitter_id_converter(doc):
    # emit the normalized identity schema
    items = {'nickname': doc['twitter_screen_name']}
    # the rest are optional...
    for dest, src in [
        ('name', 'name'),
        ('url', 'url'),
        ('image', 'profile_image_url'),
        ]:
        val = doc.get('twitter_' + src)
        if val:
            items[dest] = val
    emit_schema('rd/identity', items)

    # and we use the same extension to emit the 'known identities' too...
    def gen_em():
        # the primary 'twitter' one first...
        yield ('twitter', doc['twitter_screen_name']), None
        v = doc.get('twitter_url')
        if v:
            yield ('url', v.rstrip('/')), 'homepage'

    def_contact_props = {'name': doc['twitter_name'] or doc['twitter_screen_name']}
    emit_related_identities(gen_em(), def_contact_props)


class TwitterAccount(base.AccountBase):
  def startSync(self, conductor):
    return TwitterProcessor(self, conductor).attach()
