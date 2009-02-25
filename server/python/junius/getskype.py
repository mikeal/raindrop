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
global skype
import junius.model as model



class SkypeAccount(object):
    def __init__(self, dbs, account_def, skype):
        self.dbs = dbs
        self.account_def = account_def
        self.skype = skype
        self.re_tags = re.compile(r'#(\w+)')
        self._knownContactsByHandle= {}

    def create_account_if_necessary(self):
        self.author = self.create_contact_if_necessary()

    def create_contact_if_necessary(self, handle=None):
        #print "skype_user = " + skype_user.FullName
        if handle in self._knownContactsByHandle:
            return self._knownContactsByHandle[handle]
        if not handle:
            skype_user = self.skype.CurrentUser
            handle = skype_user.Handle
        else:
            if isinstance(handle, Skype4Py.user.IUser):
                skype_user = handle
            else:
                print "getting user for handle", handle
                skype_user = skype.User(handle)
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
                name=skype_user.FullName,
                identities=identities,
                #location=account.location, xxxxxx ???????? what is this?
                _attachments=attachments
            )
            #print "XXX adding contact: ", skype_user.FullName

            contact.store(self.dbs.contacts)
        else:
            contact = [model.Contact.load(self.dbs.contacts,contact.value['_id']) for contact in contacts.rows][0]

        self._knownContactsByHandle[handle] = contact
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
        msgauthor = self.create_contact_if_necessary(msg.FromHandle)
        cmsg = model.Message(
            account_id=self.account_def.id,
            # Is this expected to be a real URL?
            storage_path='http://skype.com/%s' % (chat.Name,),
            storage_id=str(msg.Id),
            #
            conversation_id=chat.Name.replace('/', '').replace('#', ''),
            header_message_id=msg.Id,
            references=[], # should reference the 'parent' (ie, the chat iself?)
            # XXX - fixup 'from' and 'to' handling.
            from_contact_id=str(msgauthor.id),
            from_contact={ str(msgauthor.id) : { "name" : msg.FromDisplayName} },
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
            user = skype.User(m.Handle)
            involves[account.id] = { 'username' : m.Handle,
                                     'name' : user.FullName}
        return involves


class Grabber(object):
    def __init__(self, dbs):
        self.dbs = dbs
    
    def syncAccounts(self):
        global skype
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
