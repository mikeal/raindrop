#!/usr/bin/env python

'''
Setup the CouchDB server so that it is fully usable and what not.
'''
import model

import sys
import os, os.path, mimetypes, base64, pprint

import junius.model as model

def setup_account(dbs):
    if len(model.Account.all(dbs.accounts)):
        print 'Account presumably already exists, not adding it!'
        return
    
    # we want a file of the form:
    #  hostname,port,username,password,ssl?
    # example:
    #  mail.example.com,993,bob@example.com,sekret,True
    import os, os.path
    configPath = os.path.join(os.environ['HOME'], ".junius")
    f = open(configPath, 'r')
    data = f.read()
    f.close()
    host, portstr, username, password, sslstr = data.split(',')
    ssl = not (sslstr.strip().lower() in ['false', 'f', 'no', '0'])
    
    account = model.Account(
        kind='imap', host=host, port=int(portstr), ssl=ssl,
        username=username, password=password,
    )
    account.store(dbs.accounts)

def setup_twitter_account(dbs):
    # we want a file of the form:
    #  username,password
    # example:
    #  davidascher,sekret
    import os, os.path
    configPath = os.path.join(os.environ['HOME'], ".junius_twitter")
    if not os.path.isfile(configPath):
        print "Skipping twitter - no config file '%s'" % (configPath,)
        return
    f = open(configPath, 'r')
    data = f.read()
    f.close()
    username, password = data.strip().split(',')

    account = model.Account(
        kind='twitter', username=username, password=password,
    )
    account.store(dbs.accounts)

def setup_skype_account(dbs):
    # For now we just use whoever is currently logged into skype (but we
    # probably do want a config file and should skip things if that user
    # isn't current.)

    # XXX - paramaterized views?
    accts = [acct for acct in model.Account.all(dbs.accounts) if acct.kind=='skype']
    if accts:
        print 'Skype accounts for %r already exist, not automatically adding a new one!' % \
              [acct.username for a in accts]
        return

    try:
        import Skype4Py
    except ImportError:
        print "skipping skype as the Skype4Py module isn't installed"
    else:
        skype = Skype4Py.Skype()
        skype.Timeout = 10000 # default of 30 seconds is painful...
        print 'Connecting to Skype (please check skype; you may need to authorize us)'
        try:
            skype.Attach()
        except Skype4Py.SkypeAPIError, exc:
            print 'Failed to attach to Skype (is it installed and running? Is authorization pending?)'
            print '  error was:', exc
            return
        print 'Creating skype account for current user', skype.CurrentUser.Handle
        account = model.Account(
            kind='skype', username=skype.CurrentUser.Handle,
        )
        account.store(dbs.accounts)

def path_part_nuke(path, count):
    for i in range(count):
        path = os.path.dirname(path)
    return path
    

FILES_DOC = 'files' #'_design/files'

def install_client_files(dbs):
    '''
    cram everyone in 'client' into the 'junius' app database
    '''
    if FILES_DOC in dbs.junius:
        print 'Design doc already exists, will be updating/overwriting files'
        design_doc = dbs.junius[FILES_DOC]
        attachments = design_doc['_attachments'] = {}
    else:
        design_doc = {}
        attachments = design_doc['_attachments'] = {}
    
    # we cannot go in a zipped egg...
    junius_root_dir = path_part_nuke(model.__file__, 4)
    client_dir = os.path.join(junius_root_dir, 'client')
    print 'listing contents of', client_dir
    
    for filename in os.listdir(client_dir):
        path = os.path.join(client_dir, filename)
        if filename.endswith("~") or filename.startswith("."): continue;
        if os.path.isfile(path):
            f = open(path, 'rb')
            ct = mimetypes.guess_type(filename)[0]
            if ct is None and sys.platform=="win32":
                # A very simplistic check in the windows registry.
                import _winreg
                try:
                    k = _winreg.OpenKey(_winreg.HKEY_CLASSES_ROOT,
                                        os.path.splitext(filename)[1])
                    ct = _winreg.QueryValueEx(k, "Content Type")[0]
                except EnvironmentError:
                    pass
            assert ct, "can't guess the content type for '%s'" % filename
            attachments[filename] = {
                'content_type': ct,
                'data': base64.b64encode(f.read())
            }
            f.close()
        print 'filename "%s" (%s)' % (filename, ct)
    
    dbs.junius[FILES_DOC] = design_doc


def main():
    import sys
    if 'nuke' in sys.argv:
      print 'NUKING DATABASE!!!'
      model.nuke_db()

    dbs = model.fab_db(update_views='updateviews' in sys.argv)

    setup_account(dbs)
    setup_twitter_account(dbs)
    setup_skype_account(dbs)
    install_client_files(dbs)
    

if __name__ == '__main__':
    main()
