#!/usr/bin/env python

import os, os.path

try:
    import simplejson as json
except ImportError:
    import json # Python 2.6


import os, os.path, httplib2
from junius import model

class Replicator(object):
    def __init__(self):
        self.local_host = model.get_local_host_info()
        self.remote_host = model.get_remote_host_info()
        self.http = httplib2.Http()
        
    def create_remote_dbs(self):
      import couchdb
      server = couchdb.Server(self.remote_host)
      for db_name, doc_class in DATABASES.items():
          if db_name not in model.AVOID_REPLICATING:
            if not db_name in server:
                print 'Creating database', db_name
                db = server.create(db_name)

    
    def push(self):
        for db_name in model.DATABASES.keys():
            if db_name not in model.AVOID_REPLICATING:
                body = {'source': self.local_host + db_name,
                        'target': self.remote_host + db_name}
                self.http.request(self.local_host + '_replicate',
                                  'POST',
                                  body=json.dumps(body, ensure_ascii=False))
    
    def pull(self):
        for db_name in model.DATABASES.keys():
            if db_name not in model.AVOID_REPLICATING:
                body = {'source': self.remote_host + db_name,
                        'target': self.local_host + db_name}
                self.http.request(self.local_host + '_replicate',
                                  'POST',
                                  body=json.dumps(body, ensure_ascii=False))


if __name__ == '__main__':
    import sys
    replicator = Replicator()
    if 'create' in sys.argv:
        print 'Creating remote DBs'
        replicator.create_remote_dbs()
    print 'Pushing'
    replicator.push()
    print 'Pulling'
    replicator.pull()
