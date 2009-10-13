#! /usr/bin/env python
# This script is used to check the raindrop environment.
# It is designed to work even when none of the raindrop dependencies exist -
# in which case it will report which dependencies are missing, and possibly
# install them!

# As a result, the only top-level imports are those which come with
# python.

import sys

# Get the python version checks out of the way asap...
if not hasattr(sys, "version_info") or sys.version_info < (2,5):
    print >> sys.stderr, "raindrop requires Python 2.5 or later"
    sys.exit(1)

if sys.version_info > (3,):
    print >> sys.stderr, "raindrop doesn't work with python 3.x yet"
    sys.exit(1)


import os
import re
import warnings
import optparse
import urllib2
import tempfile

options = None # will be set to the optparse options object.

class PutRequest(urllib2.Request):
    def get_method(self):
        return "PUT"


def fail(why, *args):
    print >> sys.stderr, "ERROR:", why % args
    sys.exit(1)


def warn(why, *args):
    print >> sys.stderr, "WARNING:", why % args


def note(why, *args):
    print why % args


def _check_version_attr(module, required):
    bits = tuple([int(bit) for bit in re.split('[\.-]', module.__version__)])
    return bits >= required

deps = [
    ('twisted', '>=8.2', True),
    ('pyOpenSSL', '', True),
    ('paisley', '', True),
    ('feedparser', '>=4.1', False),
    ('Skype4Py', '', False),
    # ack - no 0.6 actually exists and 0.5 is missing a key feature we need.
    ('python-twitter', '>=0.6,==0.6-devel', False),
]
if sys.version_info < (2,6):
    deps.append(('simplejson', '', True))

if sys.version_info < (2,6) and sys.platform=="win32":
    warn("Python 2.6 is recommended on Windows; you may have trouble finding\n"
         "an openssl binary package for Python 2.5")

def check_deps():
    xtra = "" if not options.configure else \
           "\n(re-running this script with --configure may be able to install this for you)"
    try:
        import setuptools
    except ImportError:
        if options.configure:
            url = "http://peak.telecommunity.com/dist/ez_setup.py"
            note("installing the setuptools package from %r", url)
            try:
                code = urllib2.urlopen(url).read()
            except IOError, why:
                fail("Failed to install setuptools: %s", why)
            else:
                # hacky but effective :)
                globs = {}
                exec code in globs
                # and run the entry-point
                globs['main']([])
                # and now it should import...
    try:
        from pkg_resources import require, DistributionNotFound, VersionConflict
        import setuptools.command.easy_install
    except ImportError:
        fail("The 'setuptools' package is not installed.%s", xtra)
    for name, ver_spec, required in deps:
        ui = fail if required else warn
        full = name + ver_spec
        try:
            require(full)
        except DistributionNotFound, why:
            if options.configure:
                note("module '%s' is missing - attempting easy-install", full)
                try:
                    # egss in zip files are more trouble than they are worth...
                    setuptools.command.easy_install.main(['--always-unzip',
                                                          full])
                except SystemExit, why:
                    ui("failed to easy_install '%s' - %s%s", full, why, xtra)
            else:
                ui("module '%s' is missing%s", full, xtra)
        except VersionConflict, why:
            ui("module '%s' has version conflict: %s", full, why)

    # twisted on windows needs pywin32 which isn't currently available via
    # setuptools
    if sys.platform == "win32":
        try:
            import win32api
        except ImportError:
            fail("The pywin32 package is not available - please download and install\n"
                 "the installer from http://sourceforge.net/projects/pywin32/files/")


def is_local_host(host):
    # XXX - fix this!
    return host == "127.0.0.1"


def check_couch():
    if sys.version_info < (2,6):
        import simplejson as json
    else:
        import json
    from raindrop.config import init_config
    config = init_config()
    couch = config.couches['local']
    url = "http://%(host)s:%(port)s/" % couch
    try:
        info = json.load(urllib2.urlopen(url))
    except IOError, why:
        fail("Can't connect to couchdb: %s", why)

    note("couchdb says '%s'.", info['couchdb'])
    ver = info['version']
    # check the version string - parse the first 2 bits.
    maj_min = [int(x) for x in ver.split(".")[:2]]
    reqd = [0,10]
    if maj_min < reqd:
        fail("Couch is version %r - raindrop requires %d.%d",
             ver, reqd[0], reqd[1])

    configure = options.configure
    if configure and not is_local_host(couch['host']):
        warn("--configure specified, but we can't configure a non-local couchdb\n"
             "(couch needs to be configured with a local file-system path)")
        configure = False

    cfg_url = url + '_config/external'
    # check the config of couch - we need one special [external]
    tpl = '%s "%s/couch-raindrop.py" --log-level=info "--log-file=%s/raindrop.log"'
    my_dir = os.path.abspath(os.path.dirname(__file__))
    cmd = tpl % (sys.executable, my_dir, tempfile.gettempdir())
    if configure:
        note("configuring couchdb.")
        # need to PUT...
        r = PutRequest(cfg_url + "/raindrop",
                       data=json.dumps(cmd))
        json.load(urllib2.urlopen(r))
    else:
        # not configuring - check.
        info = json.load(urllib2.urlopen(cfg_url))
        if 'raindrop' not in info:
            msg = "couchdb needs a configuration variable set in a .ini file\n" \
                  "The following line must be created in an '[external]' section:\n" \
                  "raindrop=" + cmd + \
                  "\n(or try re-executing this script with --configure)"
            fail(msg)
    # and one httpd handler.
    cfg_url = url + '_config/httpd_db_handlers'
    val = '{couch_httpd_external, handle_external_req, <<"raindrop">>}'
    if configure:
        # need to PUT...
        r = PutRequest(cfg_url + "/_raindrop",
                       data=json.dumps(val))
        json.load(urllib2.urlopen(r))
    else:
        # not configuring - check.
        info = json.load(urllib2.urlopen(cfg_url))
        if '_raindrop' not in info:
            msg = "couchdb needs a configuration variable set in a .ini file\n" \
                  "The following line must be created in a '[httpd_db_handlers]' section:\n" \
                  "_raindrop=" + val + \
                  "\n(or try re-executing this script with --configure)"
            fail(msg)

    # TODO: native erlang views - when they work :(


def main():
    parser = optparse.OptionParser(
        description="Check and optionally configure the raindrop environment"
    )
    parser.add_option("-c", "--configure", action="store_true",
                      help="Attempt to perform any configuration necessary - "
                           "for example, easy_install missing deps, configure "
                           "couchdb, etc")
    global options
    options, args = parser.parse_args()
    if args:
        parser.error("This program takes no arguments (try --help)")

    # turn off warnings before we possibly import things...
    warnings.simplefilter("ignore", category=DeprecationWarning)
    check_deps()
    note("The raindrop python environment seems to be OK - checking couchdb")
    check_couch()
    note("raindrop appears configured and ready to run.\n"
         "Please execute 'run-raindrop.py' to create the database and open the app.")

    
if __name__=='__main__':
    main()
