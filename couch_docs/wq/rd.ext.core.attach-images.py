# create thumbnails and previews for images.
try:
    from PIL import Image
except ImportError, e:
    import Image

from cStringIO import StringIO

ct_images = set("""image/jpg image/jpeg image/png image/ppm
                """.split())

# these shouldn't be hard-coded!
SIZE_THUMBNAIL = 100
SIZE_PREVIEW = 1024

def handler(doc):
    if doc.get('content_type') not in ct_images:
        return
    # in theory PIL can handle it...
    logger.info("creating thumbnail and preview for %(_id)r", doc)

    # This is pretty hacky - we assume the URL is in "{doc_id}/attach"
    # format in this DB.
    docid, attach_id = doc['url'].split("/", 1)
    attach_data = open_attachment(docid, attach_id)
    infile = StringIO(attach_data)
    # Make the thumbnail and preview.
    for (name, size) in [
        ('thumbnail', SIZE_THUMBNAIL),
        ('preview', SIZE_PREVIEW),
        ]:
        infile.seek(0,0)
        im = Image.open(infile)
        im.thumbnail((size, size), Image.ANTIALIAS)
        outfile = StringIO()
        im.save(outfile, "PNG")
        # and save it in the couch
        items = {'content_type': 'image/png',
                 'width': im.size[0],
                 'height': im.size[1],
                 # a special URL format - leading "./" means 'in this document'
                 'url': './' + name,
        }
        schema_id = "rd.attach." + name
        attachments = {name : {'content_type': 'image/png',
                                 'data': outfile.getvalue()}}
        emit_schema(schema_id, items, attachments=attachments)
