This directory contains couch documents in JSON format that should be
automatically inserted into the couch as part of a run-raindrop.py call.

The documents aren't in the exact format sent to the couch - each .json
document must at least have a 'schemas' attribute, then object detailing
the 'rd.ext.*' schemas implemented.  The extension ID and everything else
is deduced from the filename etc.

In particular, some things get magic substitutions - check out bootstrap.py
for all the gory details...

