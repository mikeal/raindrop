#!/usr/bin/env python

import base64, datetime, email.utils
import pprint
import re
import sys
from urllib2 import urlopen, HTTPError

import twitter

import junius.model as model

'''
Fetch contacts, and tweets.
'''


class JuniusAccount(object):
    def __init__(self, dbs, account_def):
        self.dbs = dbs
        self.account_def = account_def
        self.twitter_account = twitter.Api(username=account_def.username, password=account_def.password)
        self.re_involves =  re.compile(r'@(\w+)')
        self.re_tags = re.compile(r'#(\w+)')
        self._contactsByHandle = {}
        
        # -- find out about what message id's we already know about
        # this is really just the most primitive synchronization logic
        #  available!  but that's okay.
        self.known_uids = set()
        #startkey=0
        #endkey=4000000000
        #for row in model.Message.by_header_id(self.dbs.messages, startkey=startkey, endkey=endkey).rows:
        ## XXX optimize this to only look for tweets from this user
        for row in model.Message.by_header_id(self.dbs.messages).rows:
            self.known_uids.add(row.key)
        try:
            self.twitter_user = self.twitter_account.GetUser(self.account_def.username)
        except HTTPError, e:
            print e.url
            raise e
        self.author = self.create_contact_if_necessary(self.account_def.username)
        self.sync(self.twitter_user)

    def create_contact_if_necessary(self, username):
        if username in self._contactsByHandle:
            return self._contactsByHandle[username]
        print "looking for contact with username ", username
        contacts = model.Contact.by_identity(self.dbs.contacts,
                                             key=['twitter', username])
        try:
            twitter_account = self.twitter_account.GetUser(username)
        except HTTPError, e:
            if e.code == 404:
                return None
            raise e

        if len(contacts) == 0:
            # the contact does't exist, create it

            attachments = {}
            if twitter_account.profile_image_url:
                try:
                  response = urlopen(twitter_account.profile_image_url)
                  attachments['default'] = { 'content_type': response.info()['Content-Type'],
                                             'data': base64.b64encode(response.read()) }
                except:
                    pass

            identities = [{'kind': 'twitter', 'value': username }]
            if twitter_account.url: 
                identities.append({'kind': 'url' , 'value' : twitter_account.url })

            contact = model.Contact(
                name=twitter_account.name,
                identities=identities,
                location=twitter_account.location,
                _attachments=attachments
            )

            contact.store(self.dbs.contacts)
        else:
            contact = [model.Contact.load(self.dbs.contacts,contact.value['_id']) for contact in contacts.rows][0]
        self._contactsByHandle[username] = contact
        return contact
    
    def find_contacts(self):
        """for all of my contacts w/ email addresses, look for twitter accounts,
        and create them if they are found"""
        twitter_contacts = model.Contact.by_identity(self.dbs.contacts, startkey=['twitter', ''],
                                             endkey=['twitter', 'ZZZZ'])
        twitter_ids = {}
        for contact in twitter_contacts.rows:
            for identity in contact.value['identities']:
                twitter_ids[identity['value']] = contact

        contacts = model.Contact.by_identity(self.dbs.contacts, startkey=['email', ''],
                                             endkey=['email', 'ZZZZ'])
        print "contacts =", contacts
        for c in contacts.rows:
            for identity in c.value['identities']:
                email = identity['value']
            print "looking for twitter account for " + email, 
            try:
                twitteruser = self.twitter_account.GetUserByEmail(email)
            except HTTPError, e:
                if e.code == 404: 
                    print "nope"
                    continue
                raise e
            print '=>', twitteruser.id
            if twitteruser.screen_name not in twitter_ids:
                contact = self.create_contact_if_necessary(twitteruser.screen_name)
#                if contact:  # this will easily get past the twitter API hourly limits.
#                    self.sync(twitteruser)

        sys.exit(0)

    def sync(self, twitter_account):
        print '***** Fetching tweets for', twitter_account.screen_name
        processed = 0
        skipped = 0

        for message in self.twitter_account.GetUserTimeline(twitter_account.screen_name):
            if str(message.id) not in self.known_uids:
                self.grok_message(self.author, message)
                processed += 1
            else:
                skipped += 1
        print '  processed', processed, 'skipped', skipped



    def grok_message(self, author, imsg):
        involves = self.grok_involves(author, imsg)
        print "grokking message from " + author.name
        cmsg = model.Message(
            account_id=self.account_def.id,
            storage_path='http://twitter.com/' + imsg.user.screen_name + '/status/' + str(imsg.id),
            storage_id=str(imsg.id),
            #
            conversation_id=imsg.GetInReplyToStatusId() if imsg.GetInReplyToStatusId() else str(imsg.id),
            header_message_id=str(imsg.id),
            references=[],
            #
            from_contact_id=str(author.id),
            from_contact={ str(author.id) : { "name" : author.name } },
            to_contact_ids=[],
            cc_contact_ids=[],
            involves_contact_ids=[involved for involved in involves],
            involves_contacts=involves,
            #
            date=datetime.datetime.utcfromtimestamp(imsg.created_at_in_seconds),
            timestamp=int(imsg.created_at_in_seconds),
            #
            read=False,
            tags=self.re_tags.findall(imsg.text),
            headers={ "Subject" : "" },
            bodyPart={"data":imsg.text, "contentType":"text/plain"},
            _attachments={}
        )

        cmsg.store(self.dbs.messages)

    def grok_involves(self, author, imsg):
        involves = { author.id : { 'name' : author.name }  }
        usernames = self.re_involves.findall(imsg.text)
        for username in usernames:
            account = self.create_contact_if_necessary(username)
            if account:
                involves[account.id] = { 'username' : username,
                                         'name' : account.name }
        return involves

class Grabber(object):
    def __init__(self, dbs):
        self.dbs = dbs
    
    def syncAccounts(self):
        for account in model.Account.all(self.dbs.accounts):
            if account.kind == 'twitter':
                junius_account = JuniusAccount(self.dbs, account)
                
                for friend in junius_account.twitter_account.GetFriends():
                    junius_account.create_contact_if_necessary(friend.screen_name)
                print 'got friend accounts'


                junius_account.find_contacts()


if __name__ == '__main__':
    import os
    dbs = model.fab_db()
    grabber = Grabber(dbs)
    grabber.syncAccounts()
