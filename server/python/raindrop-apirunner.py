#! /usr/bin/env python
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

"""A couchdb REST API runner for raindrop.

Accepts json requests on stdin and writes results to stdout.  Loads,
compiles and executes API end-points from couch documents depending on the
request URL.
"""

import sys
import httplib
from time import clock
from urllib import urlencode, quote

try:
    import json
except ImportError:
    import simplejson as json

from raindrop import config

# -- library code --
# The short-term intention is to move to javascript based API implementations
# The javascript environment will have available a number of utility classes,
# the most important being the 'CouchDB' class.
# Below are some utilities all Python implemented API functions have available
# in their globals
api_globals={'json': json}

# A little hack so we can record some basic perf stats about certain things.
# You must modify couch's local.ini to include '--show-perf' on the cmdline.
if '--show-perf' in sys.argv:
    sys.argv.remove('--show-perf')
    def note_timeline(msg, *args):
        msg = msg % args
        log("%.3g: %s", clock(), msg)
else:
    note_timeline = lambda msg, *args: None

# This is a port of some of the couch.js class.
class CouchDB:
    def __init__(self, name, host=None, port=None):
        self.name = name;
        self.uri = "/" + quote(name) + "/"
        # share and reuse one connection.
        self.connection = httplib.HTTPConnection(host or '127.0.0.1', port or 5984)

    def maybeThrowError(self, resp):
        if resp.status >= 400:
            text = resp.read()
            try:
                result = json.loads(text)
            except ValueError:
                raise APIErrorResponse(400, text)
            raise APIErrorResponse(resp.status, result)
        # strange - couch.js doesn't check any other conditions?

    def request(self, method, uri, headers={}, body=None):
        c = self.connection
        c.request(method, uri, body, headers)
        return c.getresponse()

    def view(self, viewname, options, keys=None):
        viewParts = viewname.split('/');
        viewPath = self.uri + "_design/" + viewParts[0] + "/_view/" \
            + viewParts[1] + self.encodeOptions(options)
        if keys is None:
            resp = self.request("GET", viewPath);
        else:
            resp = self.request("POST", viewPath,
                                headers={"Content-Type": "application/json"},
                                body=json.dumps({'keys':keys}))

        if resp.status == 404:
          return None
        self.maybeThrowError(resp)
        return json.load(resp);

    # Convert a options object to an url query string.
    # ex: {key:'value',key2:'value2'} becomes '?key="value"&key2="value2"'
    def encodeOptions(self, options):
        use = {}
        for name, value in options.iteritems():
            if name in ('key', 'startkey', 'endkey', 'include_docs') \
                    or not isinstance(value, basestring):
                value = json.dumps(value, allow_nan=False)
            use[name] = value
        if not use:
            return ''
        return "?" + urlencode(use)

api_globals['CouchDB'] = CouchDB

def log(msg, *args):
    print json.dumps(["log", (msg % args)])

api_globals['log'] = log

# Function which turns an rd_key into something able to be used in a Python
# dict or set.  For now, tuple does exactly that (but may not later if we
# find rd_keys with subitems as lists)
# javascript would do something like ",".join(key_val);
hashable_key = tuple
api_globals['hashable_key'] = hashable_key

# -- raindrop specific APIs
class RDCouchDB(CouchDB):
    def __init__(self, req):
        name = req['path'][0] # first elt of path is db name
        host = req.get('peer') # later couchdb versions include this...
        port = None # XXX - get the 'port' from the request too (but it isn't provided now!)
        CouchDB.__init__(self, name, host, port)

    def megaview(self, **kw):
        # The javascript impl has a painful separation of the 'keys' param
        # from other params - hide that.
        opts = kw.copy()
        keys = opts.get('keys')
        if keys is not None:
            del opts['keys']
        note_timeline("megaview request opts=%s, %d keys", opts, len(keys or []))
        # and make the request.
        ret = self.view('raindrop!content!all/megaview', opts, keys)
        note_timeline("megaview result - %d rows", len(ret['rows']))
        return ret

api_globals['RDCouchDB'] = RDCouchDB

def make_response(result, code=None, headers=None):
    # create the json response object couchdb expects.
    ob = {'json' : result}
    if code is not None:
        ob['code'] = code
    if headers is not None:
        ob['headers'] = headers
    return ob

api_globals['make_response'] = make_response

# a couple of exceptions...
class APIException(Exception):
    def __init__(self, err_response):
        self.err_response = err_response
        Exception.__init__(self)

api_globals['APIException'] = APIException

class APIErrorResponse(APIException):
    def __init__(self, code, message):
        resp = make_response( {'error': code, 'reason': message}, code=code)
        APIException.__init__(self, resp)

api_globals['APIErrorResponse'] = APIErrorResponse

# -- api runner code --

class APILoadError(Exception):
    def __init__(self, msg, *args):
        self.msg = msg = msg % args
        Exception.__init__(self)

# REST end-point handlers we have already loaded.
_handlers = {}

def get_api_handler(cfg, req):
    # path format is "db_name/external_name/app_name/class_name/method_name
    if len(req.get('path', [])) != 5:
        raise APILoadError("invalid api request format")
    dbname = req['path'][0]
    cache_key = tuple(req['path'][:4])
    try:
        return _handlers[cache_key]
    except KeyError:
        # first request for this handler
        pass

    # Load the schemas which declare they implement this end-point
    apiid = req['path'][2:4] # the 'app' name and the 'class' name.
    key = ['rd.ext.api', 'endpoints', apiid]
    path = "/%s/_design/raindrop!content!all/_view/megaview" % dbname
    options = {'key': json.dumps(key),
               'reduce': 'false',
               'include_docs': 'true',
    }
    uri = path + "?" + urlencode(options)

    c = httplib.HTTPConnection(cfg['host'], cfg['port'])
    c.request("GET", uri)
    resp = c.getresponse()
    if resp.status != 200:
        raise APILoadError("api query failure (%s: %s)", resp.status, resp.reason)
    result = json.load(resp)
    resp.close()
    rows = result['rows']
    if not rows:
        raise APILoadError("No such API end-point %s", apiid)
    if len(rows) != 1: # should only be one doc with this criteria!
        raise APILoadError("too many docs say they implement this api!")
    doc = rows[0]['doc']
    if doc.get('content_type') != 'application/x-python' or not doc.get('code'):
        raise APILoadError("document is not a python implemented API (%s)", doc['content_type'])

    # Now dynamically compile the code we loaded.
    globs = api_globals.copy()
    try:
        exec doc['code'] in globs
    except Exception, exc:
        raise APILoadError("Failed to initialize api: %s", exc)
    handler = globs.get('handler')
    if handler is None or not callable(handler):
        raise APILoadError("source-code in extension doesn't have a 'handler' function")
    _handlers[cache_key] = handler
    log("loaded API end-point %s from %r", cache_key, doc['_id'])
    return handler


def main():
    # no options or args now!
    if len(sys.argv) != 1:
        print >> sys.stderr, __doc__
        print >> sys.stderr, "this program takes no arguments"
        sys.exit(1)

    # for now, so we know the couch.
    cfg = config.init_config().couches['local']

    log("raindrops keep falling on my api...")
    # and now the main loop.
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        req = json.loads(line)
        # handle 'special' requests'
        if len(req['path'])==3 and req['path'][-1] == '_reset':
            msg = '%d document(s) dropped' % len(_handlers)
            resp = {'code': 200, 'json': {'info': msg}}
            _handlers.clear()
        elif len(req['path'])==3 and req['path'][-1] == '_exit':
            json.dump({'code': 200, 'json': {'info': 'goodbye'}}, sys.stdout)
            sys.stdout.write("\n")
            sys.stdout.flush()
            sys.exit(0)
        else:
            try:
                handler = get_api_handler(cfg, req)
            except APILoadError, exc:
                log("%s", exc.msg)
                resp = {'code': 400, 'json': {'error': 400, 'reason': exc.msg}}
            else:
                # call the API handler - we expect the API to be robust and
                # catch mostexceptions, so if we see one, we just die.
                note_timeline("api request: %s", req['path'])
                resp = handler(req)
                note_timeline("api back")

        json.dump(resp, sys.stdout)
        sys.stdout.write("\n")
        sys.stdout.flush()
    log("raindrop api runner terminating normally")

if __name__ == "__main__":
    main()
