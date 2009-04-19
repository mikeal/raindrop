This directory contains couch documents in JSON format that should be
automatically inserted into the couch as part of a run-raindrop.py call.

The files should be in a directory and file name structure that matches
the _id of the couch document, with directories indicated by the ! signs
in the _id. For instance, for a doc with _id "ui!inflow", it should be
placed in  couch_docs/ui/inflow.json
