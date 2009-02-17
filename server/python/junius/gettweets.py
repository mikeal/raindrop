#!/usr/bin/env python

import base64, datetime, email.utils
import pprint
import re

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

    def create_account_if_necessary(self):
        self.twitter_user = self.twitter_account.GetUser(self.account_def.username)
        self.author = self.create_contact_if_necessary(self.account_def.username, self.twitter_user)

    def create_contact_if_necessary(self, username, account=None):
        if account is None:
            account = self.twitter_account.GetUser(username)

        contacts = model.Contact.by_identity(self.dbs.contacts,
                                             key=['twitter', username])
        if len(contacts) == 0:
            # the contact does't exist, create it
            contact = model.Contact(
                name=account.name,
                identities=[{'kind': 'twitter', 'value': username }]
            )
            contact.store(self.dbs.contacts)
        return contact

    def sync(self):
        print '***** Fetching tweets'
        
        # -- find out about what message id's we already know about
        # this is really just the most primitive synchronization logic
        #  available!  but that's okay.
        known_uids = set()
        #startkey=0
        #endkey=4000000000
        #for row in model.Message.by_header_id(self.dbs.messages, startkey=startkey, endkey=endkey).rows:
        ## XXX optimize this to only look for tweets from this user
        for row in model.Message.by_header_id(self.dbs.messages).rows:
            print row
            known_uids.add(row.key)
        
        processed = 0
        skipped = 0

        for message in self.twitter_account.GetUserTimeline():
            if message.id not in known_uids:
                self.grok_message(self.author, message)
                processed += 1
            else:
                skipped += 1
        print '  processed', processed, 'skipped', skipped
    
    def grok_message(self, author, imsg):
        involves = self.grok_involves(author, imsg)

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
            account = self.create_contact_if_necessary(username, None)
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
                junius_account.create_account_if_necessary();
                junius_account.sync()

if __name__ == '__main__':
    import os
    dbs = model.fab_db()
    grabber = Grabber(dbs)
    grabber.syncAccounts()
