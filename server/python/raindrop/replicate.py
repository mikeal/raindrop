#!/usr/bin/env python
# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is Raindrop.
#
# The Initial Developer of the Original Code is
# Mozilla Messaging, Inc..
# Portions created by the Initial Developer are Copyright (C) 2009
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#


import os
import json
import httplib2
from . import model

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
