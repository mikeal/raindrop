#!/usr/bin/env python

'''
Setup the CouchDB server so that it is fully usable and what not.
'''

import os, os.path, mimetypes, base64

import junius.model as model



def install_client_files(dbs):
    '''
    cram everyone in 'client' into the 'junius' app database
    '''
    # we cannot go in a zipped egg...
    junius_root_dir = os.path.join(
                          *os.path.split(os.path.abspath(model.__file__))[:-4])
    client_dir = os.path.join(junius, 'client')
    
    attachments = {}
    for filename in os.listdir(client_dir):
        if os.path.isfile(filename):
            f = open(os.path.join(client_dir, filename))
            attachments[filename] = {
                'content_type': mimetypes.guess_type(filename) or
                                'application/octet',
                'data': base64.b64encode(f.read())
            }
            f.close()
    
    dbs.junius['_design/files'] = {'_attachments': attachments}


def main():
    dbs = model.fab_db()
    
    install_client_files(dbs)
    

if __name__ == '__main__':
    main()