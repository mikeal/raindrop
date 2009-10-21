 ***** BEGIN LICENSE BLOCK *****
 Version: MPL 1.1

 The contents of this file are subject to the Mozilla Public License Version
 1.1 (the "License"); you may not use this file except in compliance with
 the License. You may obtain a copy of the License at
 http://www.mozilla.org/MPL/

 Software distributed under the License is distributed on an "AS IS" basis,
 WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 for the specific language governing rights and limitations under the
 License.

 The Original Code is Raindrop.

 The Initial Developer of the Original Code is
 Mozilla Messaging, Inc..
 Portions created by the Initial Developer are Copyright (C) 2009
 the Initial Developer. All Rights Reserved.

 Contributor(s):


This directory contains couch documents in JSON format that should be
automatically inserted into the couch as part of a run-raindrop.py call.

The documents aren't in the exact format sent to the couch - each .json
document must at least have a 'schemas' attribute, then object detailing
the 'rd.ext.*' schemas implemented.  The extension ID and everything else
is deduced from the filename etc.

In particular, some things get magic substitutions - check out bootstrap.py
for all the gory details...

