#!/usr/bin/env python

import base64, datetime, email.utils
import pprint

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

    def create_account_if_necessary(self):
        contacts = model.Contact.by_identity(self.dbs.contacts,
                                             key=['twitter', self.account_def.username])
        if len(contacts) == 0:
            # the contact does't exist, create it
            self.twitter_user = self.twitter_account.GetUser(self.account_def.username)
            contact = model.Contact(
                name=self.twitter_user.name,
                screen_name=self.twitter_user.screen_name,
                identities=[{'kind': 'twitter', 'value': self.twitter_user.id}]
            )
            contact.store(self.dbs.contacts)
        self.author = contact
    
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

        cmsg = model.Message(
            account_id=self.account_def.id,
            storage_path='http://twitter.com/' + self.account_def.username,
            storage_id=str(imsg.id),
            #
            conversation_id='http://twitter.com/' + self.account_def.username,
            header_message_id=str(imsg.id),
            references=[],
            #
            from_contact_id=str(author.id),
            to_contact_ids=[],
            cc_contact_ids=[],
            involves_contact_ids=[str(author.id)],
            #
            date=datetime.datetime.utcfromtimestamp(imsg.created_at_in_seconds),
            timestamp=int(imsg.created_at_in_seconds),
            #
            read=False,
            #
            headers={},
            bodyPart={"data":imsg.text, "contentType":"text/plain"},
            _attachments={}
        )
        
        print self.dbs.messages

        cmsg.store(self.dbs.messages)
        

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
