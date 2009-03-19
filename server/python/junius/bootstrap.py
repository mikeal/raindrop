#!/usr/bin/env python

'''
Setup the CouchDB server so that it is fully usable and what not.
'''
import sys
import twisted.web.error
from twisted.internet import defer
import os, os.path, mimetypes, base64, pprint
import model

from junius.config import get_config

import logging
logger = logging.getLogger(__name__)

def path_part_nuke(path, count):
    for i in range(count):
        path = os.path.dirname(path)
    return path
    

FILES_DOC = 'files' #'_design/files'

def install_client_files(whateva):
    '''
    cram everyone in 'client' into the app database
    '''
    from model import get_db
    d = get_db()

    def _opened_ok(doc):
        logger.info("document '%(_id)s' already exists, will be updating/overwriting existing records",
                    doc)
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
        logger.debug("listing contents of '%s' to look for client files", client_dir)

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
        return d.saveDoc(design_doc, FILES_DOC)

    defrd = d.openDoc(FILES_DOC)
    defrd.addCallbacks(_opened_ok, _open_not_exists)
    defrd.addCallback(_update_doc)
    return defrd

def install_accounts(whateva):
    from model import get_db
    db = get_db()
    config = get_config()

    def _opened_ok(doc):
        logger.info("account '%(_id)s' already exists, will be updating existing account",
                    doc)
        return doc

    def _open_not_exists(failure, doc_id, *args, **kw):
        failure.trap(twisted.web.error.Error)
        if failure.value.status != '404': # not found.
            failure.raiseException()
        return {'_id': doc_id} # return an empty doc for the account.

    def _update_acct(doc, info):
        logger.debug("updating %s with %s", doc, info)
        doc.update(info)
        doc['type'] = 'account'
        return db.saveDoc(doc, doc['_id'])

    def _open_doc(whateva, key):
        return db.openDoc(key)

    d = defer.Deferred()

    for acct_name, acct_info in config.accounts.iteritems():
        acct_id = acct_info['_id']
        logger.info("Adding account '%s'", acct_id)
        d.addCallback(_open_doc, acct_id)
        d.addCallbacks(_opened_ok, _open_not_exists, errbackArgs=(acct_id,))
        d.addCallback(_update_acct, acct_info)

    # Start the chain and return.
    d.callback(None)
    return d
