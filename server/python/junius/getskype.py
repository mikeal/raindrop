#!/usr/bin/env python
'''
Fetch skype contacts and chats.
'''

import base64, datetime, email.utils
import pprint
import time
import re
from urllib2 import urlopen

import Skype4Py

import junius.model as model



class SkypeAccount(object):
    def __init__(self, dbs, account_def, skype):
        self.dbs = dbs
        self.account_def = account_def
        self.skype = skype
        self.re_tags = re.compile(r'#(\w+)')

    def create_account_if_necessary(self):
        self.author = self.create_contact_if_necessary(self.skype.CurrentUser)

    def create_contact_if_necessary(self, skype_user):
        contacts = model.Contact.by_identity(self.dbs.contacts,
                                             key=['skype', skype_user.Handle])

        if len(contacts) == 0:
            # the contact does't exist, create it

            attachments = {}
            # XXXX - skype_user.SaveAvatarToFile -> get the image!
            if False: ######
                try:
                  response = urlopen(account.profile_image_url)
                  attachments['default'] = { 'content_type': response.info()['Content-Type'],
                                             'data': base64.b64encode(response.read()) }
                except:
                    pass

            identities = [{'kind': 'skype', 'value': skype_user.Handle}]
            if skype_user.Homepage: 
                identities.append({'kind': 'url' , 'value' : skype_user.Homepage })

            contact = model.Contact(
                name=skype_user.DisplayName,
                identities=identities,
                #location=account.location, xxxxxx ???????? what is this?
                _attachments=attachments
            )

            contact.store(self.dbs.contacts)
        else:
            contact = [model.Contact.load(self.dbs.contacts,contact.value['_id']) for contact in contacts.rows][0]

        return contact

    def sync(self):
        
        print '***** Finding existing messages:',
        # -- find out about what message id's we already know about
        # this is really just the most primitive synchronization logic
        #  available!  but that's okay.
        known_uids = set()
        for row in model.Message.by_header_id(self.dbs.messages).rows:
            known_uids.add(row.key)

        print len(known_uids)
        processed = 0
        skipped = 0

        print '***** Fetching skype messages'
        for i, chat in enumerate(self.skype.Chats):
            messages = chat.Messages
            involves = self.grok_involves(self.author, chat)
            print "chat %d of %d '%s' (%d messages, %d contacts)" % \
                  (i, len(self.skype.Chats), chat.Name, len(messages), len(involves))

            for msg in messages:
                if str(msg.Id) not in known_uids:
                    self.grok_message(self.author, chat, msg, involves)
                    processed += 1
                else:
                    skipped += 1
        print '  processed', processed, 'skipped', skipped

        print '***** Fetching contacts'
        
        for f in self.skype.Friends:
            self.create_contact_if_necessary(f)

        print 'synchronization of contacts completed'


    def grok_message(self, author, chat, msg, involves):
        # Its possible we should make the first message in a chat the "parent"
        # and have all other messages reference that parent??

        # The status of a message includes ones that only make sense for sent
        # (eg, sending, sent) as well as for received.  An explicit status of
        # 'read' exists - so we assume if it is 'received' it isn't read yet.
        is_read = msg.Status != Skype4Py.cmsReceived
        cmsg = model.Message(
            account_id=self.account_def.id,
            # Is this expected to be a real URL?
            storage_path='http://skype.com/%s' % (chat.Name,),
            storage_id=str(msg.Id),
            #
            conversation_id=chat.Name,
            header_message_id=msg.Id,
            references=[], # should reference the 'parent' (ie, the chat iself?)
            # XXX - fixup 'from' and 'to' handling.
            from_contact_id=str(author.id),
            from_contact={ str(author.id) : { "name" : author.name } },
            to_contact_ids=[],
            cc_contact_ids=[],
            involves_contact_ids=[involved for involved in involves],
            involves_contacts=involves,
            date=msg.Datetime,
            timestamp=time.mktime(msg.Datetime.timetuple()),
            #
            read=is_read,
            tags=self.re_tags.findall(msg.Body),
            headers={ "Subject" : chat.FriendlyName },
            bodyPart={"data":msg.Body, "contentType":"text/plain"},
            _attachments={}
        )

        cmsg.store(self.dbs.messages)

    def grok_involves(self, author, chat):
        involves = { author.id : { 'name' : author.name }  }
        for m in chat.Members:
            account = self.create_contact_if_necessary(m)
            involves[account.id] = { 'username' : m.Handle,
                                     'name' : m.DisplayName }
        return involves


class Grabber(object):
    def __init__(self, dbs):
        self.dbs = dbs
    
    def syncAccounts(self):
        skype = Skype4Py.Skype()
        print "attaching to skype..."
        skype.Attach()
        print "Synching..."
        for account in model.Account.all(self.dbs.accounts):
            if account.kind == 'skype':
                # XXX - something needs to check we are currently logged
                # in to this account.
                junius_account = SkypeAccount(self.dbs, account, skype)
                junius_account.create_account_if_necessary();
                junius_account.sync()

if __name__ == '__main__':
    import os
    dbs = model.fab_db()
    grabber = Grabber(dbs)
    grabber.syncAccounts()
