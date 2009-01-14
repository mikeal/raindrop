#!/usr/bin/env python

import base64, datetime, email.utils
import pprint

from gocept.imapapi.account import Account

import junius.model as model

'''
Fetch new mail.
'''

class JuniusAccount(object):
    def __init__(self, dbs, account_def):
        self.dbs = dbs
        self.account_def = account_def
        self.imap_account = Account(account_def.host, account_def.port,
                                    account_def.username, account_def.password,
                                    account_def.ssl)
    
    def sync(self):
        self.considerFolders(self.imap_account.folders)
    
    def considerFolders(self, folders):
        for folder in folders.values():
            self.syncFolder(folder)
            self.considerFolders(folder.folders)
    
    def syncFolder(self, folder):
        print '***** Sync-ing', folder.path
        
        folderStatus = self.account_def.folderStatuses.get(folder.path, {})
        #curValidity = folder._validity()
        #if curValidity != folderStatus['validity']:
        #    pass
        
        # -- find out about what message id's we already know about
        # this is really just the most primitive synchronization logic
        #  available!  but that's okay.
        known_uids = set()
        startkey=[self.account_def.id, folder.path, 0]
        endkey=[self.account_def.id, folder.path, 4000000000]
        for row in model.Message.by_storage(self.dbs.messages, startkey=startkey, endkey=endkey).rows:
            known_uids.add(row.key[2])
        
        processed = 0
        skipped = 0
        for message in folder.messages.values():
            uid = int(message.UID)
            if uid not in known_uids:
                self.grok_message(message)
                processed += 1
            else:
                skipped += 1
        print '  processed', processed, 'skipped', skipped
    
    def grok_email_addresses(self, *address_strings):
        seen_contacts = {}
        result_lists = []
        involved_list = []
        for address_string in address_strings:
            cur_results = []
            cur_addresses = email.utils.getaddresses((address_string,))
            for name, address in cur_addresses:
                # XXX TODO: we can use 'keys' instead of just key.
                contacts = model.Contact.by_identity(self.dbs.contacts,
                                                     key=['email', address])
                if len(contacts):
                    # the contact exists, use it
                    contact = list(contacts)[0]
                    if contact.id in seen_contacts:
                        contact = seen_contacts[contact.id]
                    else:
                        involved_list.append(contact)
                        seen_contacts[contact.id] = contact
                else:
                    # the contact does't exist, create it
                    if not name:
                        name = address
                    contact = model.Contact(
                        name=name,
                        identities=[{'kind': 'email', 'value': address}]
                    )
                    contact.store(self.dbs.contacts)
                    involved_list.append(contact)
                    seen_contacts[contact.id] = contact
                cur_results.append(contact)
            result_lists.append(cur_results)
        result_lists.append(involved_list)
        return result_lists
    
    def extract_message_id(self, message_id_string, acceptNonDelimitedReferences):
        # this is a port of my fix for bug 466796, the comments should be ported
        #  too if we keep this logic...
        whitespaceEndedAt = None
        firstMessageIdChar = None
        foundLessThan = False
        message_len = len(message_id_string)
        i = 0
        while i < message_len:
            char = message_id_string[i]
            # do nothing on whitespace
            if char in r' \r\n\t':
                pass
            else:
                if char == '<':
                    i += 1 # skip over the '<'
                    firstMessageIdChar = i
                    foundLessThan = True
                    break
                if whitespaceEndedAt is None:
                    whitespaceEndedAt = i
            i += 1
        
        # if we hit a '<', keep going until we hit a '>' or the end
        if foundLessThan:
            while i < message_len:
                char = message_id_string[i]
                if char == '>':
                    # it's valid, update reference, making sure to stop before the '>'
                    return [message_id_string[firstMessageIdChar:i],
                            message_id_string[i+1:]]
                i += 1
        
        # if we are at the end of the string, we found some non-whitespace,
        #  and the caller requested that we accept non-delimited whitespace,
        #  give them that as their reference.  (otherwise, leave it empty)
        if acceptNonDelimitedReferences and whitespaceEndedAt:
            return [message_id_string[whitespaceEndedAt:], '']
        return [None, '']
    
    def extract_message_ids(self, message_id_string):
        references = []
        while message_id_string:
            ref, message_id_string = self.extract_message_id(message_id_string,
                                                             not references)
            if ref:
                references.append(ref)
        return references
    
    def grok_message_conversation(self, imsg):
        self_header_message_id = imsg.headers['Message-Id'][1:-1]
        refs_str = imsg.headers.get('References') or imsg.headers.get('In-Reply-To') or ''
        conversation_id = None
        conversations = {}
        self_message = None
        header_message_ids = self.extract_message_ids(refs_str)
        unseen = set(header_message_ids)

        # save off the list of referenced messages
        references = header_message_ids[:]
        # see if the self-message already exists...
        header_message_ids.append(self_header_message_id)
        
        messages = model.Message.by_header_id(self.dbs.messages,
                                              keys=header_message_ids)
        for message in messages:
            if message.header_message_id == self_header_message_id:
                self_message = message
            else:
                unseen.remove(message.header_message_id)
            conversation_id = message.conversation_id
            
        if conversation_id is None:
            # we need to allocate a conversation_id...
            conversation_id = self_header_message_id
            
        # create dudes who are missing
        if unseen:
            missing_messages = []
            for header_message_id in unseen:
                missing_messages.append(model.Message(
                    conversation_id=conversation_id,
                    header_message_id=header_message_id,
                    ))
            self.dbs.messages.update(missing_messages)
        
        return conversation_id, self_message, references
    
    def grok_message(self, imsg):
        attachments = {}
        bodyPart = self.grok_part(imsg, imsg.body, attachments)
        
        # XXX the gocept header logic unfortunately is case-sensitive...
        # XXX also, doesn't support repeated values...
        # (but we can live with these limitations for now)
        
        from_contacts, to_contacts, cc_contacts, involves_contacts = self.grok_email_addresses(
            imsg.headers.get('From', ''), imsg.headers.get('To', ''),
            imsg.headers.get('Cc', ''))
        
        conversation_id, existing_message, references = self.grok_message_conversation(imsg)
        
        timestamp = email.utils.mktime_tz(email.utils.parsedate_tz(imsg.headers['Date']))
        
        
        cmsg = model.Message(
            account_id=self.account_def.id,
            storage_path=imsg.parent.path,
            storage_id=int(imsg.UID),
            #
            conversation_id=conversation_id,
            header_message_id=imsg.headers.get('Message-Id')[1:-1],
            references=references,
            #
            from_contact_id=from_contacts[0].id,
            to_contact_ids=[c.id for c in to_contacts],
            cc_contact_ids=[c.id for c in cc_contacts],
            involves_contact_ids=[c.id for c in involves_contacts],
            #
            date=datetime.datetime.utcfromtimestamp(timestamp),
            timestamp=timestamp,
            #
            read=r'\Seen' in imsg.flags,
            #
            headers=dict(imsg.headers),
            bodyPart=bodyPart,
            _attachments=attachments
        )
        if existing_message:
            cmsg.id = existing_message.id
            # this is ugly, we should really just have the logic above use a
            #  style that allows it to work with new or existing...
            cmsg._data['_rev'] = existing_message.rev
        
        cmsg.store(self.dbs.messages)
        
    
    def grok_part(self, msg, part, attachments, depth=0):
        contentType = part['content_type']
        partNumber = part['partnumber']
        me = {'contentType': contentType,
              'partNumber': partNumber}
        if contentType.startswith('multipart/'):
            parts = me['parts'] = []
            for subpart in part.parts:
                parts.append(self.grok_part(msg, subpart, attachments, depth+1))
        else:
            me['parameters'] = part['parameters']
            data = part.fetch()
            # XXX perhaps we should recursively process the nested part dude?
            # (if contentType == 'message/rfc822')
            if contentType.startswith('text/'):
                me['data'] = data
            else:
                attachments[partNumber] = {'content_type': contentType,
                                           'data': base64.b64encode(data)}
        return me

class Grabber(object):
    def __init__(self, dbs):
        self.dbs = dbs
    
    def syncAccounts(self):
        for account in model.Account.all(self.dbs.accounts):
            junius_account = JuniusAccount(self.dbs, account)
            junius_account.sync()

if __name__ == '__main__':
    import os
    #acct = JuniusAccount('localhost', 8143, os.environ['USER'], 'pass')
    dbs = model.fab_db()
    grabber = Grabber(dbs)
    grabber.syncAccounts()
