#!/usr/bin/env python

from gocept.imapapi.account import Account

import junius.model as model

'''
Fetch new mail.
'''

class JuniusAccount(object):
    def __init__(self, *args):
        self.acct = Account(*args)
    
    def sync(self):
        inbox = self.acct.folders['INBOX']
        print 'Folder', inbox
        for m in inbox.messages.values():
            print m
            self.grok_part(m, m.body)
    
    def grok_part(self, msg, part, depth=0):
        ct = part['content_type']
        if ct.startswith('multipart/'):
            print '..' * depth, ct, part
            for subpart in part.parts:
                self.grok_part(msg, subpart, depth+1)
        elif ct.startswith('text/'):
            print '  ' * depth, ct, part
        elif ct == 'message/rfc822':
            print '  ' * depth, ct, part.headers
        else:
            print '00' * depth, ct, part

if __name__ == '__main__':
    import os
    #acct = JuniusAccount('localhost', 8143, os.environ['USER'], 'pass')
    acct = JuniusAccount('localhost', 10143, 'test', 'bsdf')
    acct.sync()
