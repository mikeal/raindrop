#!/usr/bin/env python

'''
Setup the CouchDB server so that it is fully usable and what not.
'''
import sys
from twisted.internet import reactor, defer
import twisted.web.error
import os, os.path, mimetypes, base64, pprint
import model

import logging
logger = logging.getLogger(__name__)

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
    f = open(configPath, 'r')
    data = f.read()
    f.close()
    username, password = data.split(',')

    account = model.Account(
        kind='twitter', username=username, password=password,
    )
    account.store(dbs.accounts)

def path_part_nuke(path, count):
    for i in range(count):
        path = os.path.dirname(path)
    return path
    

FILES_DOC = 'files' #'_design/files'

def install_client_files(whateva):
    '''
    cram everyone in 'client' into the 'junius' app database
    '''
    from model import get_db
    d = get_db()

    def _opened_ok(doc):
        logger.info('Design doc already exists, will be updating/overwriting files')
        return doc

    def _open_not_exists(failure, *args, **kw):
        failure.trap(twisted.web.error.Error)
        if failure.value.status != '404': # not found.
            failure.raiseException()
        return {} # return an empty doc.

    def _update_doc(design_doc):
        attachments = design_doc['_attachments'] = {}
        # we cannot go in a zipped egg...
        junius_root_dir = path_part_nuke(model.__file__, 4)
        client_dir = os.path.join(junius_root_dir, 'client')
        logger.info("listing contents of '%s'", client_dir)
        
        for filename in os.listdir(client_dir):
            path = os.path.join(client_dir, filename)
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
            logger.debug("filename '%s' (%s)", filename, ct)
        return d.saveDoc('raindrop', design_doc, FILES_DOC)

    defrd = d.openDoc('raindrop', FILES_DOC) # XXX - why the db name??
    defrd.addCallbacks(_opened_ok, _open_not_exists)
    defrd.addCallback(_update_doc)
    return defrd


def main():
    import sys

    d = defer.Deferred()
    def mutter(whateva):
        print "Raindrops keep falling on my head..."
    d.addCallback(mutter)

    if 'nuke' in sys.argv:
        def do_nuke(whateva):
            # returns a deferred.
            return model.nuke_db()
        d.addCallback(do_nuke)

    def do_fab(whateva):
        # returns a deferred.
        return model.fab_db(update_views='updateviews' in sys.argv)

    d.addCallback(do_fab)

    d.addCallback(install_client_files)

    #dbs = model.fab_db(update_views='updateviews' in sys.argv)
    #
    #setup_account(dbs)
    #setup_twitter_account(dbs)

    #install_client_files(dbs)

    def done(whateva):
        print "Finished."
        reactor.stop()

    def error(*args, **kw):
        from twisted.python import log
        log.err(*args, **kw)
        print "FAILED."
        reactor.stop()

    d.addCallbacks(done, error)

    reactor.callWhenRunning(d.callback, None)

    logger.debug('starting reactor')
    reactor.run()
    logger.debug('reactor done')
    

if __name__ == '__main__':
    main()
