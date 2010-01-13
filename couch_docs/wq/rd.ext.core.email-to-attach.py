# Take email schemas and create schemas for the non-text attachments.
def handler(doc):
    num = 0
    for name, attach in doc['_attachments'].iteritems():
        # skip text attachments.
        if attach['content_type'].lower().startswith("text/"):
            continue
        # attachment names are 'ext_id/base_name'
        ext, fname = name.split("/", 1)
        items = {'name' : fname,
                 'visible': True,
                 'content_type': attach['content_type'],
                 'length': attach['length'],
                 'url': "/%s/%s" % (doc['_id'], name),
                 }
        attach_rdkey = ['attach', [doc['rd_key'], fname]]
        emit_schema('rd.attach.details', items, attach_rdkey)
        num += 1
    logger.debug('created %d attachment summaries for %r', num, doc['_id'])
