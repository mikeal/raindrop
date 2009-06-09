#!/usr/bin/env python

'''
Setup the CouchDB server so that it is fully usable and what not.
'''
import sys
import re, json
import zipfile
import twisted.web.error
from twisted.internet import defer
import os, os.path, mimetypes, base64, pprint
import model
import hashlib

import shutil, zipfile
from cStringIO import StringIO

from .config import get_config
from .model import get_db
from .model import get_doc_model

import logging
logger = logging.getLogger(__name__)

def path_part_nuke(path, count):
    for i in range(count):
        path = os.path.dirname(path)
    return path
    

LIB_DOC = 'lib' #'_design/files'

# Updating design documents when not necessary can be expensive as all views
# in that doc are reset. So we've created a helper - a simple 'fingerprinter'
# which creates a dict, each entry holding the finterprint of a single item
# (usually a file), used when files on the file-system are the 'source' of a
# couchdb document. The 'fingerprint' is stored with the document, so later we
# can build the fingerprint of the file-system, and compare them to see if we
# need to update the document. Simple impl - doesn't use the 'stat' of the
# file at all, but always calculates the md5 checksum of the content.
class Fingerprinter:
    def __init__(self):
        self.fs_hashes = {}

    def get_finger(self, filename):
        # it doesn't make sense to calc a file's fingerprint twice
        assert filename not in self.fs_hashes
        ret = self.fs_hashes[filename] = hashlib.md5()
        return ret

    def get_prints(self):
        return dict((n,h.hexdigest()) for (n, h) in self.fs_hashes.iteritems())

# Utility function to extract files from a zip.
# taken from: http://code.activestate.com/recipes/465649/
def extract( filename, dir ):
    zf = zipfile.ZipFile( filename )
    namelist = zf.namelist()
    dirlist = filter( lambda x: x.endswith( '/' ), namelist )
    filelist = filter( lambda x: not x.endswith( '/' ), namelist )
    # make base
    pushd = os.getcwd()
    if not os.path.isdir( dir ):
        os.mkdir( dir )
    os.chdir( dir )
    # create directory structure
    dirlist.sort()
    for dirs in dirlist:
        dirs = dirs.split( '/' )
        prefix = ''
        for dir in dirs:
            dirname = os.path.join( prefix, dir )
            if dir and not os.path.isdir( dirname ):
                os.mkdir( dirname )
            prefix = dirname
    # extract files
    for fn in filelist:
        out = open( fn, 'wb' )
        buffer = StringIO( zf.read( fn ))
        buflen = 2 ** 20
        datum = buffer.read( buflen )
        while datum:
            out.write( datum )
            datum = buffer.read( buflen )
        out.close()
        logger.debug('extracted %r', fn)
    os.chdir( pushd )


def install_client_files(whateva, options):
    '''
    cram everyone in 'client' into the app database
    '''
    d = get_db()

    def _opened_ok(doc):
        logger.debug("document '%(_id)s' already exists at revision %(_rev)s",
                    doc)
        return doc

    def _open_not_exists(failure, *args, **kw):
        failure.trap(twisted.web.error.Error)
        if failure.value.status != '404': # not found.
            failure.raiseException()
        return {} # return an empty doc.

    def _insert_file(path, couch_path, attachments, fp, ignore_unknowns):
        f = open(path, 'rb')
        ct = mimetypes.guess_type(path)[0]
        if ct is None and sys.platform=="win32":
            # A very simplistic check in the windows registry.
            import _winreg
            try:
                k = _winreg.OpenKey(_winreg.HKEY_CLASSES_ROOT,
                                    os.path.splitext(path)[1])
                ct = _winreg.QueryValueEx(k, "Content Type")[0]
            except EnvironmentError:
                pass
        if not ct and not ignore_unknowns:
            assert ct, "can't guess the content type for '%s'" % path
        data = f.read()
        fp.get_finger(couch_path).update(data)
        attachments[couch_path] = {
            'content_type': ct,
            'data': base64.b64encode(data)
        }
        f.close()

    def _check_dir(client_dir, couch_path, attachments, fp, ignore_unknowns):
        for filename in os.listdir(client_dir):
            path = os.path.join(client_dir, filename)
            # Insert files if they do not start with a dot or
            # end in a ~, those are probably temp editor files. 
            if os.path.isfile(path) and \
               not filename.startswith(".") and \
               not filename.endswith("~") and \
               not filename.endswith(".zip"):
                _insert_file(path, couch_path + filename, attachments, fp, ignore_unknowns)
            elif os.path.isdir(path):
                new_couch_path = filename + "/"
                if couch_path:
                    new_couch_path = couch_path + new_couch_path
                _check_dir(path, new_couch_path, attachments, fp, ignore_unknowns)
            logger.debug("filename '%s'", filename)

    def _maybe_update_doc(design_doc, doc_name):
        fp = Fingerprinter()
        attachments = design_doc['_attachments'] = {}
        # we cannot go in a zipped egg...
        root_dir = path_part_nuke(model.__file__, 4)
        client_dir = os.path.join(root_dir, 'client/' + doc_name)
        logger.debug("listing contents of '%s' to look for client files", client_dir)

        # recursively go through directories, adding files.
        _check_dir(client_dir, "", attachments, fp, False)

        new_prints = fp.get_prints()
        if options.force or design_doc.get('rd_fingerprints') != new_prints:
            logger.info("client files in %r are different - updating doc", doc_name)
            design_doc['rd_fingerprints'] = new_prints
            return d.saveDoc(design_doc, doc_name)
        logger.debug("client files are identical - not updating doc")
        return None

    dl = []
    # we cannot go in a zipped egg...
    root_dir = path_part_nuke(model.__file__, 4)
    client_dir = os.path.join(root_dir, 'client')
    files = os.listdir(client_dir)
    
    # find all the directories in the client dir
    # and create docs with attachments for each dir.
    for f in files:
        fq_child = os.path.join(client_dir, f)
        if os.path.isdir(fq_child):
            dfd = d.openDoc(f)
            dfd.addCallbacks(_opened_ok, _open_not_exists)
            dfd.addCallback(_maybe_update_doc, f)
            dl.append(dfd)

    # Unpack dojo and install it if necessary. Only do the work if the
    # zip file has changed since the last time dojo was installed, or
    # if there is no dojo couch doc.
    def _maybe_update_dojo(design_doc):
        fp = Fingerprinter()

        # we cannot go in a zipped egg...
        root_dir = path_part_nuke(model.__file__, 4)
        client_dir = os.path.join(root_dir, 'client')
        zip_path = os.path.join(client_dir, 'dojo.zip')
        finger = fp.get_finger('client/dojo.zip')
        # .zip files might be large, so update in chunks...
        with open(zip_path, 'rb') as f:
            for chunk in f:
                finger.update(chunk)

        new_prints = fp.get_prints()
        if options.force or design_doc.get('rd_fingerprints') != new_prints:
            logger.info("updating dojo...")
            dojo_dir = os.path.join(client_dir, "dojo")

            # unpack dojo
            extract(zip_path, client_dir)

            # insert attachments into couch doc
            attachments = design_doc['_attachments'] = {}
            _check_dir(dojo_dir, "", attachments, Fingerprinter(), True)

            # remove the unzipped dojo directory.
            shutil.rmtree(dojo_dir)

            # save couch doc
            design_doc['rd_fingerprints'] = new_prints
            return d.saveDoc(design_doc, "dojo")
        else:
            return None

    #Add the dojo doc checking to the deferred list.
    dfd = d.openDoc("dojo")
    dfd.addCallbacks(_opened_ok, _open_not_exists)
    dfd.addCallback(_maybe_update_dojo)
    dl.append(dfd)

    return defer.DeferredList(dl)

@defer.inlineCallbacks
def insert_default_docs(whateva, options):
    """
    Inserts documents from the couch_docs directory into the couch.
    """
    dm = get_doc_model()

    def items_from_json(filename, data, fingerprinter):
        "Builds raindrop 'schema items' from a json file"

        try:
            src = json.loads(data)
        except ValueError, exc:
            logger.error("Failed to load %r: %s", filename, exc)
            return []

        assert '_id' not in src, src # "we build all that!"
        # a generic json document with a set of schemas etc...
        assert 'schemas' in src, 'no schemas - dunno what to do!'
        # Need to allow docs to override this - later...
        ext_id = os.path.splitext(os.path.basename(filename))[0]
        rd_key = ['ext', ext_id]
        ret = []

        finger = fingerprinter.get_finger("!".join(rd_key))
        finger.update(data)

        for name, fields in src['schemas'].items():
            for fname, fval in fields.items():
                if isinstance(fval, basestring) and fval.startswith("RDFILE:"):
                    sname = fval[7:].strip()
                    if sname.startswith("*."):
                        # a special case - means use the same base name but
                        # the new ext.
                        path = os.path.splitext(filename)[0] + sname[1:]
                    else:
                        path = os.path.join(os.path.dirname(filename), sname)
                    try:
                        with open(path) as f:
                            fval = f.read()
                            finger.update(fval)
                    except (OSError, IOError):
                        logger.warning("can't open RDFILE: file %r - skipping it",
                                       path)
                    fields[fname] = fval
            sch_item = {
                'rd_key': rd_key,
                'schema_id': name,
                'items': fields,
                'ext_id': 'rd.core',
            }
            ret.append(sch_item);

        # hack our fingerprinter in...
        for sch_item in ret:
            sch_item['items']['rd_fingerprints'] = fingerprinter.get_prints()

        return ret

    def collect_docs(items, dr, file_list):
        """
        Helper function used by os.walk call to recursively collect files.

        It collects normal 'schema items' as used by the rest of the
        back end and as passed to doc_model.emit_schema_items.
        """
        for f in file_list:
            path = os.path.join(dr, f)
            if os.path.isfile(path) and path.endswith(".json"):
                fprinter = Fingerprinter()
                #Open the file and collect the contents.
                try:
                    with open(path) as contents:
                        data = contents.read()
                        sch_items = items_from_json(path, data, fprinter)
                        items.extend(sch_items)
                except (OSError, IOError):
                    logger.warning("can't open file %r - skipping it", path)
                    continue

    # we cannot go in a zipped egg...
    root_dir = path_part_nuke(model.__file__, 4)
    doc_dir = os.path.join(root_dir, 'couch_docs')
    logger.debug("listing contents of '%s' to look for couch docs", doc_dir)

    # load all the .json files, searching recursively in directories
    items = []
    os.path.walk(doc_dir, collect_docs, items)

    #For all the schema items loaded from disk, fetch the docs from
    #the couch, then compare to see if any need to be updated.
    dids = [dm.get_doc_id_for_schema_item(i).encode('utf-8') for i in items]

    result = yield dm.db.listDoc(keys=dids, include_docs=True)
    updates = []
    for did, item, r in zip(dids, items, result['rows']):
        if 'error' in r or 'deleted' in r['value']:
            # need to create a new item...
            logger.info("couch doc %r doesn't exist or is deleted - updating",
                        did)
            updates.append(item)
        else:
            fp = item['items']['rd_fingerprints']
            existing = r['doc']
            assert existing['_id']==did
            if not options.force and fp == existing.get('rd_fingerprints'):
                logger.debug("couch doc %r hasn't changed - skipping", did)
            else:
                logger.info("couch doc %r has changed - updating", did)
                item['items']['_id'] = did
                item['items']['_rev'] = existing['_rev']
                updates.append(item)
    if updates:
        _ = yield dm.create_schema_items(updates)


@defer.inlineCallbacks
def update_apps(whateva):
    """Updates the app config file using the latest app docs in the couch.
       Should be run after a UI app/extension is added or removed from the couch.
    """
    db = get_db()
    dm = get_doc_model()
    replacements = {}

    keys = [
        ["rd.core.content", "schema_id", "rd.ext.ui"],
        ["rd.core.content", "schema_id", "rd.ext.uiext"],
    ]
    results = yield dm.open_view(keys=keys, include_docs=True, reduce=False)
    all_rows = results['rows']

    # Convert couch config value for module paths
    # to a JS string to be used in config.js
    subs = "subs: ["
    exts = "exts: ["
    paths = []
    module_paths = ""

    # TODO: this needs more work/reformatting
    # but need a real use case first.
    # module_paths += ",".join(
    #    ["'%s': '%s'" % (
    #       item["key"].replace("'", "\\'"), 
    #       item["value"].replace("'", "\\'")
    #    ) for item in view_results["rows"]]
    # )

    # Build up a complete list of required resources.
    for row in all_rows:
        if 'error' in row or 'deleted' in row['value']:
            continue
        doc = row["doc"]
        if 'subscriptions' in doc:
            # each row has a key that in an array of objects.
            for sub in doc['subscriptions']:
                # sub is an object. Get the keys and
                # add it to the text output.
                for key in sub.keys():
                  subs += "{'%s': '%s'}," % (
                      key.replace("'", "\\'"),
                      sub[key].replace("'", "\\'")
                  )
        if 'modulePaths' in doc:
            for key in doc["modulePaths"].keys():
                paths.append({
                    "key": key,
                    "value": doc["modulePaths"][key]
                })
        try:
            extender = doc["exts"]
        except KeyError:
            continue
        for key in extender.keys():
              exts += "{'%s': '%s'}," % (
                  key.replace("'", "\\'"),
                  extender[key].replace("'", "\\'")
              )

    # join the paths together
    if len(paths) > 0:
        module_paths += ",".join(
           ["'%s': '%s'" % (
              item["key"].replace("'", "\\'"), 
              item["value"].replace("'", "\\'")
           ) for item in paths]
        ) + ","

    # TODO: if my python fu was greater, probably could do this with some
    # fancy list joins, but falling back to removing trailing comma here.
    exts = re.sub(",$", "", exts)
    exts += "]"
    subs = re.sub(",$", "", subs)
    subs += "],"

    doc = yield db.openDoc(LIB_DOC, attachments=True)

    # Find config.js skeleton on disk   
    # we cannot go in a zipped egg...
    root_dir = path_part_nuke(model.__file__, 4)
    config_path = os.path.join(root_dir, "client/lib/config.js")

    # load config.js skeleton
    f = open(config_path, 'rb')
    data = f.read()
    f.close()

    # update config.js contents with couch data
    data = data.replace("/*INSERT PATHS HERE*/", module_paths)
    data = data.replace("/*INSERT SUBS HERE*/", subs)
    data = data.replace("/*INSERT EXTS HERE*/", exts)

    new = {
        'content_type': "application/x-javascript; charset=UTF-8",
        'data': base64.b64encode(data)
    }
    # save config.js in the files.
    if doc["_attachments"]["config.js"] != new:
        logger.info("config.js in %r has changed; updating", doc['_id'])
        doc["_attachments"]["config.js"] = new
        _ = yield db.saveDoc(doc, LIB_DOC)


@defer.inlineCallbacks
def install_accounts(whateva):
    db = get_db()
    config = get_config()
    dm = get_doc_model()

    for acct_name, acct_info in config.accounts.iteritems():
        acct_id = "account!" + acct_info['id']
        logger.info("Adding account '%s'", acct_id)
        rd_key = ['raindrop-account', acct_id]

        infos = yield dm.open_schemas(rd_key, 'rd.account')

        assert len(infos) in [0, 1]
        acct_info = acct_info.copy()
        try:
            del acct_info['password']
        except KeyError:
            pass
        new_info = {'rd_key' : rd_key,
                    'schema_id': 'rd.account',
                    'ext_id': 'raindrop.core',
                    'items': acct_info}
        if len(infos)==1:
            new_info['_id'] = infos[0]['_id']
            new_info['_rev'] = infos[0]['_rev']
            logger.info("account '%(_id)s' already exists at revision %(_rev)s"
                        " - updating", new_info)
        _ = yield dm.create_schema_items([new_info])


# Functions working with design documents holding views.
def install_views(whateva, options):
    def _doc_not_found(failure):
        return None

    def _got_existing_docs(results, docs):
        put_docs = []
        for (whateva, existing), doc in zip(results, docs):
            if existing:
                assert existing['_id']==doc['_id']
                assert '_rev' not in doc
                if not options.force and \
                   doc['rd_fingerprints'] == existing.get('rd_fingerprints'):
                    logger.debug("design doc %r hasn't changed - skipping",
                                 doc['_id'])
                    continue
                existing.update(doc)
                doc = existing
            logger.info("design doc %r has changed - updating", doc['_id'])
            put_docs.append(doc)
        return get_db().updateDocuments(put_docs)
    
    schema_src = os.path.abspath(os.path.join(os.path.dirname(__file__),
                                              "../../../schema"))

    docs = [d for d in generate_view_docs_from_filesystem(schema_src)]
    logger.debug("Found %d documents in '%s'", len(docs), schema_src)
    assert docs, 'surely I have *some* docs!'
    # ack - I need to open existing docs first to get the '_rev' property.
    dl = []
    for doc in docs:
        deferred = get_db().openDoc(doc['_id']).addErrback(_doc_not_found)
        dl.append(deferred)

    return defer.DeferredList(dl
                ).addCallback(_got_existing_docs, docs)


def _build_views_doc_from_directory(ddir):
    # all we look for is the views.
    ret = {}
    fprinter = Fingerprinter()
    ret_views = ret['views'] = {}
    # The '-map.js' file is the 'trigger' for creating a view...
    tail = "-map.js"
    rtail = "-reduce.js"
    files = os.listdir(ddir)
    for f in files:
        fqf = os.path.join(ddir, f)
        if f.endswith(tail):
            view_name = f[:-len(tail)]
            try:
                with open(fqf) as f:
                    data = f.read()
                    ret_views[view_name] = {'map': data}
                    fprinter.get_finger(view_name+tail).update(data)
            except (OSError, IOError):
                logger.warning("can't open map file %r - skipping this view", fqf)
                continue
            fqr = os.path.join(ddir, view_name + rtail)
            try:
                with open(fqr) as f:
                    data = f.read()
                    ret_views[view_name]['reduce'] = data
                    fprinter.get_finger(view_name+rtail).update(data)
            except (OSError, IOError):
                # no reduce - no problem...
                logger.debug("no reduce file %r - skipping reduce for view '%s'",
                             fqr, view_name)
        else:
            # avoid noise...
            if not f.endswith(rtail) and not f.startswith("."):
                logger.info("skipping non-map/reduce file %r", fqf)

    ret['rd_fingerprints'] = fprinter.get_prints()
    logger.debug("Document in directory %r has views %s", ddir, ret_views.keys())
    if not ret_views:
        logger.warning("Document in directory %r appears to have no views", ddir)
    return ret


def generate_view_docs_from_filesystem(root):
    # We use the same file-system layout as 'CouchRest' does:
    # http://jchrisa.net/drl/_design/sofa/_show/post/release__couchrest_0_9_0
    # note however that we don't create a design documents in exactly the same
    # way - the view is always named as specified, and currently no 'map only'
    # view is created (and if/when it is, only it will have a "special" name)
    # See http://groups.google.com/group/raindrop-core/web/maintaining-design-docs

    # This is pretty dumb (but therefore simple).
    # root/* -> directories used purely for a 'namespace'
    # root/*/* -> directories which hold the contents of a document.
    # root/*/*-map.js and maybe *-reduce.js -> view content with name b4 '-'
    logger.debug("Starting to build design documents from %r", root)
    for top_name in os.listdir(root):
        fq_child = os.path.join(root, top_name)
        if not os.path.isdir(fq_child):
            logger.debug("skipping non-directory: %s", fq_child)
            continue
        # so we have a 'namespace' directory.
        num_docs = 0
        for doc_name in os.listdir(fq_child):
            fq_doc = os.path.join(fq_child, doc_name)
            if not os.path.isdir(fq_doc):
                logger.info("skipping document non-directory: %s", fq_doc)
                continue
            # have doc - build a dict from its dir.
            doc = _build_views_doc_from_directory(fq_doc)
            # XXX - note the artificial 'raindrop' prefix - the intent here
            # is that we need some way to determine which design documents we
            # own, and which are owned by extensions...
            # XXX - *sob* - and that we shouldn't use '/' in the doc ID at the
            # moment (well - we probably could if we ensured we quoted all the
            # '/' chars, but that seems too much burden for no gain...)
            doc['_id'] = '_design/' + ('!'.join(['raindrop', top_name, doc_name]))
            yield doc
            num_docs += 1

        if not num_docs:
            logger.info("skipping sub-directory without child directories: %s", fq_child)
