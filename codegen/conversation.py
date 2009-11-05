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

import sys

# Get the python version checks out of the way asap...
if not hasattr(sys, "version_info") or sys.version_info < (2,5):
    print >> sys.stderr, "raindrop requires Python 2.5 or later"
    sys.exit(1)

if sys.version_info > (3,):
    print >> sys.stderr, "raindrop doesn't work with python 3.x yet"
    sys.exit(1)


import os, os.path
import re
import warnings
import optparse
import inspect
import shutil
from distutils.version import StrictVersion
import twisted.web.error
from twisted.internet import reactor, defer

from raindrop.config import init_config
from raindrop.model import get_db
from raindrop.model import get_doc_model

options = None # will be set to the optparse options object.

init_config()
db = get_db()
dm = get_doc_model()

def path_part_nuke(path, count):
    for i in range(count):
        path = os.path.dirname(path)
    return path
    
def fail(why, *args):
    print >> sys.stderr, "ERROR:", why % args
    sys.exit(1)


def warn(why, *args):
    print >> sys.stderr, "WARNING:", why % args


def note(why, *args):
    print why % args

def replace(contents, ext_name, extended_name):
    contents = contents.replace("EXTNAME", ext_name)
    return contents.replace("EXTENDEDNAME", extended_name)

def convert_template(template_path, template_name, ext_name, extended_name):
        f = open(os.path.join(template_path, template_name), 'r')
        contents = f.read()
        f.close()
        return replace(contents, ext_name, extended_name)

def save_file(path, contents):
    f = open(path, 'w')
    f.write(contents)
    f.close()

@defer.inlineCallbacks
def clean(ext_dir, root_dir, ext_name):
    shutil.rmtree(ext_dir)
    os.remove(os.path.join(root_dir, "couch_docs/uiext", "rdw.ext." + ext_name + ".json"))

    key = ["rd.core.content", "key-schema_id", [["ext", "rdw.ext." + ext_name], "rd.ext.uiext"]]
    results = yield dm.open_view(key=key, include_docs=True, reduce=False)
    yield dm.delete_documents([{'_id': row['id'], '_rev': row['value']['_rev']} for row in results['rows']])

    os.system(sys.executable + ' ' + os.path.join(root_dir, "server/python/run-raindrop.py"))
    note("Extension %s has been removed", ext_name)
    reactor.stop()

def main():
    parser = optparse.OptionParser()

    global options
    options, args = parser.parse_args()
    if not args:
        print "\nusage: conversation.py extname [rdw.Widgets|rdw.Conversations] [message]\n\nGenerates an rdw.Conversation subclass and register it with rdw.Widgets (default) or rdw.Conversations. Specify 'message' as the last parameter if the extension will have a custom rdw.Message subclass. If out, then the normal rdw.Message is used to show messages inside this Conversation subclass. To clean out an extension, use:\n\nconversation.py extname clean\n"
    else:
        ext_name = args[0]
        ext_name_title = ext_name.title()
        extended_name = "rdw.Widgets"
        need_message = False
        
        if len(args) >= 2:
            extended_name = args[1]
            if extended_name != "rdw.Widgets" and extended_name != "rdw.Conversations" and extended_name != "clean":
                fail("Invalid master widget name: %s. Only good values are rdw.Widgets or rdw.Conversations.", extended_name)
        if len(args) == 3 and args[2] == "message":
            need_message = True

        file_name = inspect.currentframe().f_code.co_filename
        root_dir = path_part_nuke(file_name, 2)
        #Hack here, TODO: do this better, want this script to work no matter
        #where it is called from.
        if file_name.startswith("conversation.py") :
            root_dir = ".."
        template_path = os.path.join(root_dir, "codegen/templates/conversation")
        rdw_path = os.path.join(root_dir, "client/lib/rdw")
        rdw_template_path = os.path.join(rdw_path, "templates")
        ext_dir = os.path.join(rdw_path, "ext", ext_name)

        if extended_name == "clean":
            reactor.callWhenRunning(clean, ext_dir, root_dir, ext_name)
            reactor.run()
        else:
            # Read in Conversation.js, convert it.
            contents = convert_template(template_path, "Conversation.js", ext_name, extended_name)
            if need_message:
                contents = contents.replace("//messageCtorName", "messageCtorName")
            
            #Create directory in rdw.ext for the extension, put Conversation.js in there.
            if not os.path.exists(ext_dir):
                os.makedirs(ext_dir)
            save_file(os.path.join(ext_dir, "Conversation.js"), contents)
    
            #The HTML template for Conversation.js, copied from real rdw.Conversation.
            contents = convert_template(rdw_template_path, "Conversation.html", ext_name, extended_name)
            contents = contents.replace("rdwConversation", "rdwConversation rdwExt" + ext_name_title + "Conversation")
            save_file(os.path.join(ext_dir, "Conversation.html"), contents)
    
            #Read ext.js, do token replacement, put it in rdw.ext directory.
            contents = convert_template(template_path, "ext.js", ext_name, extended_name)
            save_file(os.path.join(ext_dir, "ext.js"), contents)
    
            #Read rdw.ext.EXTNAME.json, token replacment, save in couch_docs/uiext
            contents = convert_template(template_path, "rdw.ext.EXTNAME.json", ext_name, extended_name)
            save_file(os.path.join(root_dir, "couch_docs/uiext", "rdw.ext." + ext_name + ".json"), contents)
    
            #If need custom message class, read in Message.js, token replace,
            #put in extension directory.
            if need_message:
                #The JS file
                contents = convert_template(template_path, "Message.js", ext_name, extended_name)
                save_file(os.path.join(ext_dir, "Message.js"), contents)
    
                #The HTML file, copied from real rdw.Message.
                contents = convert_template(rdw_template_path, "Message.html", ext_name, extended_name)
                contents = contents.replace("rdwMessage", "rdwMessage rdwExt" + ext_name_title + "Message")
                save_file(os.path.join(ext_dir, "Message.html"), contents)

            # call run-raindrop.py to register the new extension.
            os.system(sys.executable + ' ' + os.path.join(root_dir, "server/python/run-raindrop.py"))

            #Print out details on where to find the files.
            note("\nExtension created at %s", ext_dir)

    
if __name__=='__main__':
    main()
