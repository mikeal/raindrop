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

import logging
logger = logging.getLogger(__name__)

def path_part_nuke(path, count):
    for i in range(count):
        path = os.path.dirname(path)
    return path
    

FILES_DOC = 'files' #'_design/files'

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
        fp.get_finger(path).update(data)
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
        if options.force or design_doc.get('fingerprints') != new_prints:
            logger.info("client files are different - updating doc")
            design_doc['fingerprints'] = new_prints
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

        f = open(zip_path, 'rb')
        data = f.read()
        fp.get_finger(zip_path).update(data)
        f.close()

        new_prints = fp.get_prints()
        if options.force or design_doc.get('fingerprints') != new_prints:
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
            design_doc['fingerprints'] = new_prints
            return d.saveDoc(design_doc, "dojo")
        else:
            return None

    #Add the dojo doc checking to the deferred list.
    dfd = d.openDoc("dojo")
    dfd.addCallbacks(_opened_ok, _open_not_exists)
    dfd.addCallback(_maybe_update_dojo)
    dl.append(dfd)

    return defer.DeferredList(dl)


def insert_default_docs(whateva, options):
    """
    Inserts documents from the couch_docs directory into the couch.
    """

    def collect_docs(docs, dr, file_list):
        """
        Helper function used by os.walk call to recursively collect files
        """
        for f in file_list:
            path = os.path.join(dr, f)
            if os.path.isfile(path) and path.endswith(".json"):
                #Open the file and collect the contents.
                try:
                    with open(path) as contents:
                        fprinter = Fingerprinter()
                        data = contents.read()
                        doc = json.loads(data)
                        #print json.dumps(doc)
                        fprinter.get_finger(doc['_id']).update(data)
                        doc['fingerprints'] = fprinter.get_prints()
                        docs[doc['_id']] = doc
                except (OSError, IOError):
                    logger.warning("can't open file %r - skipping it", path)
                    continue

    def _doc_not_found(failure):
        return None

    def _got_existing_docs(results, docs):
        put_docs = []
        for (whateva, existing), doc_id in zip(results, docs):
            doc = docs[doc_id]
            if existing:
                assert existing['_id']==doc['_id']
                assert '_rev' not in doc
                if not options.force and \
                    doc['fingerprints'] == existing.get('fingerprints'):
                    logger.debug("couch doc %r hasn't changed - skipping",
                                 doc['_id'].encode('utf8'))
                    continue
                existing.update(doc)
                doc = existing
            logger.info("couch doc %r has changed - updating", doc['_id'].encode('utf8'))
            put_docs.append(doc)
        return get_db().updateDocuments(put_docs)
   
    # we cannot go in a zipped egg...
    root_dir = path_part_nuke(model.__file__, 4)
    doc_dir = os.path.join(root_dir, 'couch_docs')
    logger.debug("listing contents of '%s' to look for couch docs", doc_dir)

    # load all the .json files, searching recursively in directories
    docs = {}
    os.path.walk(doc_dir, collect_docs, docs)
    
    #For all the docs loaded from disk, fetch the docs from
    #the couch, then compare to see if any need to be updated.
    dl = []
    for doc_id in docs:
        doc = docs[doc_id]
        deferred = get_db().openDoc(doc['_id'].encode('utf8')
).addErrback(_doc_not_found)
        dl.append(deferred)

    return defer.DeferredList(dl).addCallback(_got_existing_docs, docs)

  
def update_apps(whateva):
    """Updates the app config file using the latest app docs in the couch.
       Should be run after a UI app/extension is added or removed from the couch.
    """

    db = get_db()

    def _insert_paths(view_results, replacements):
        # Convert couch config value for module paths
        # to a JS string to be used in config.js
        module_paths = ""
        
        # TODO: this needs more work/reformatting
        # but need a real use case first.
        # module_paths += ",".join(
        #    ["'%s': '%s'" % (
        #       item["key"].replace("'", "\\'"), 
        #       item["value"].replace("'", "\\'")
        #    ) for item in view_results["rows"]]
        # )

        replacements["module_paths"] = module_paths
        
        return db.openView("raindrop!uiext!extends", "all"
                    ).addCallback(_insert_extends, replacements)


    def _insert_extends(view_results, replacements):
        # Convert couch config value for module paths
        # to a JS string to be used in config.js
        extends = "extends: ["

        # Build up a complete list of required resources.
        for row in view_results["rows"]:
            extender = row["key"]
            for key in extender.keys():
                  extends += "{'%s': '%s'}," % (
                      key.replace("'", "\\'"),
                      extender[key].replace("'", "\\'")
                  )

        # TODO: if my python fu was greater, probably could do this with some
        # fancy list joins, but falling back to removing trailing comma here.
        extends = re.sub(",$", "", extends)
        extends += "]"

        # Add the string of the required resources to
        # the replacement structure.
        replacements["extends"] = extends

        return db.openView("raindrop!uiext!subs", "all"
                    ).addCallback(_insert_extensions, replacements)

    def _insert_extensions(view_results, replacements):
        # Pull out all the subscriptions
        subs = "subs: ["
        for item in view_results["rows"]:
            # each row has a key that in an array of objects.
            for sub in item["key"]:
                # sub is an object. Get the keys and
                # add it to the text output.
                for key in sub.keys():
                  subs += "{'%s': '%s'}," % (
                      key.replace("'", "\\'"),
                      sub[key].replace("'", "\\'")
                  )

        # TODO: if my python fu was greater, probably could do this with some
        # fancy list joins, but falling back to removing trailing comma here.
        subs = re.sub(",$", "", subs)
        subs += "],"

        replacements["subs"] = subs

        return db.openDoc(FILES_DOC
                    ).addCallback(_save_config, replacements
                    )

    def _save_config(doc, replacements):
        # Find config.js skeleton on disk   
        # we cannot go in a zipped egg...
        root_dir = path_part_nuke(model.__file__, 4)
        config_path = os.path.join(root_dir, "client/files/config.js")

        # load config.js skeleton
        f = open(config_path, 'rb')
        data = f.read()
        f.close()

        # update config.js contents with couch data
        data = data.replace("/*INSERT PATHS HERE*/", replacements["module_paths"])
        data = data.replace("/*INSERT SUBS HERE*/", replacements["subs"])
        data = data.replace("/*INSERT EXTENDS HERE*/", replacements["extends"])

        # save config.js in the files.
        doc["_attachments"]["config.js"] = {
            'content_type': "application/x-javascript; charset=UTF-8",
            'data': base64.b64encode(data)
        }

        return db.saveDoc(doc, FILES_DOC)

    replacements = {}
    return db.openView("raindrop!ui!paths", "all"
                ).addCallback(_insert_paths, replacements
                )

def install_accounts(whateva):
    db = get_db()
    config = get_config()

    def _opened_ok(doc):
        logger.info("account '%(_id)s' already exists at revision %(_rev)s"
                    " - updating", doc)
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
        acct_id = "account!" + acct_info['id']
        logger.info("Adding account '%s'", acct_id)
        d.addCallback(_open_doc, acct_id)
        d.addCallbacks(_opened_ok, _open_not_exists, errbackArgs=(acct_id,))
        d.addCallback(_update_acct, acct_info)

    # Start the chain and return.
    d.callback(None)
    return d


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
                   doc['fingerprints'] == existing.get('fingerprints'):
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

    ret['fingerprints'] = fprinter.get_prints()
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
