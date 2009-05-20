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
        return self.conductor.coop.coiterate(
                    self.gen_friends_info(friends))

    def gen_friends_info(self, friends):
        logger.info("apparently I've %d friends", len(friends))
        def check_identity(schemas, friend, rdkey):
            # XXX - the framework should do this for us :(
            mine = [s for s in schemas if s['rd_ext_id']==self.rd_extension_id]
            assert len(mine) in [0, 1], mine
            friend_raw = self.user_to_raw(friend)
            # Add the identity_id as our 'raw' record has it...
            if not mine or mine[0]['raw'] != friend_raw:
                logger.info("Need to update twitter user %s",
                            friend.screen_name)
                new_fields = {'raw': friend_raw}
                new_info = {'rd_key' : rdkey,
                            'ext_id': self.rd_extension_id,
                            'schema_id': 'rd/identity/twitter/raw',
                            'items': new_fields,
                          }
                if mine:
                    # this is an update...
                    new_info['_id'] = mine[0]['_id']
                    new_info['_rev'] = mine[0]['_rev']
                # should try and batch these up...
                return self.doc_model.create_schema_items([new_info])

        def do_friend_identity(friend):
            rdkey = ['twitter', friend.screen_name]
            return self.doc_model.open_schemas(rdkey, 'rd/identity/twitter/raw'
                        ).addCallback(check_identity, friend, rdkey
                        )

        def find_new_tweets(results, friend):
            rows = results['rows']
            if rows:
                rdkey = rows[0]['key'][0]
                assert rdkey[0]=='tweet'
                assert rdkey[1][0]==friend.screen_name
                last_this = rdkey[1][1]
            else:
                last_this = None
            logger.debug("friend %r (%s) has latest tweet id of %s",
                         friend.screen_name, friend.id, last_this)
            return threads.deferToThread(
                    self.twit.GetUserTimeline, friend.id, since_id=last_this
                            ).addCallback(self._cb_got_friend_timeline, friend
                            ).addErrback(self.err_friend_timeline, friend
                            )
    
        def do_friend_tweets(friend):
            # Execute a view to find the last tweet ID we know about for
            # this user.  We take advantage of the ID format for tweets and
            # couch's sorting semantics...
            # NOTE: as we use 'descending' the concepts of 'startkey' and
            # 'endkey' are reversed.
            endkey=[["tweet", [friend.screen_name]]]
            startkey=[["tweet", [friend.screen_name, {}]]]
            return self.doc_model.open_view('raindrop!docs!all',
                                            'by_raindrop_key',
                                            startkey=startkey,
                                            endkey=endkey,
                                            descending=True,
                                            limit=1
                        ).addCallback(find_new_tweets, friend
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
        infos = []
        for tweet in timeline:
            tid = tweet.id
            # put the 'raw' document object together and save it.
            logger.info("New tweet '%s...' (%s)", tweet.text[:25], tid)
            # create the schema for the tweet itself.
            fields = self.tweet_to_raw(tweet)
            rdkey = ['tweet', [friend.screen_name, tid]]
            infos.append({'rd_key' : rdkey,
                          'ext_id': self.rd_extension_id,
                          'schema_id': 'rd/msg/tweet/raw',
                          'items': fields})
        logger.info("friend %s has %d new tweets", friend.screen_name,
                    len(infos))
        return self.doc_model.create_schema_items(infos)

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
    conversation_id = doc.get('twitter_in_reply_to_status_id', doc['twitter_id'])
    cdoc = {'conversation_id': str(conversation_id)}
    emit_schema('rd/msg/conversation', cdoc)
    # and tags
    tags = re_tags.findall(body)
    if tags:
        tdoc = {'tags': tags}
        emit_schema('rd/tags', tdoc)

# Twitter identities...

# An identity 'converter' for twitter...
class TwitterRawConverter(base.SimpleConverterBase):
    target_type = 'id', 'twitter/raw'
    sources = [('id', 'twitter')]
    def simple_convert(self, doc):
        # here is a cheat - if the identity was created by our twitter
        # processor, it will have written a 'raw' dict - this means we don't
        # need to revisit twitter to get the details.  (If no 'raw' field
        # existed, then this was probably introduced by the front-end or
        # some other 'identity scraper') where all they know is the ID)
        # Eg: very soon that will include us, as we detect @tags
        assert 'raw' in doc, doc #"Sorry front-end, you can't do that yet!"
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
        yield ('twitter', props['twitter_screen_name']), None
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
