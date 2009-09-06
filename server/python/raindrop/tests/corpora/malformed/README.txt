This is a directory of 'hand rolled' documents - generally taken from real
raindrop installs, then hand-edited.

Note that these are all malformed in one way or another; not every message 
will be able to have useful info extracted - but none of our core exceptions
should fail with an unhandled exception when processing them.

NOTE: Some (most?) '.rfc822.txt' files here are explicitly saved with \r\n 
line endings as specified by the relevant RFC; at least one bug behaved 
differently with \r\n versus \n.  Files are opened in binary mode by the test
suite.
