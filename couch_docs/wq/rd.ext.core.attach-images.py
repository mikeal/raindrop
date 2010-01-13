# create thumbnails and previews for images.
try:
    from PIL import Image
except ImportError, e:
    import Image

try:
    from PIL import ExifTags
except ImportError:
    import ExifTags

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
        get_exif(im, items)
        schema_id = "rd.attach." + name
        attachments = {name : {'content_type': 'image/png',
                                 'data': outfile.getvalue()}}
        emit_schema(schema_id, items, attachments=attachments)

# This is a hard code of the GPSInfo item found in ExifTags.TAGS
GPSINFO_TAG = 0x8825

# This really only gets the GPSInfo but in the future could import much more
# data if we had a real use for further EXIF data and somebody wanted to write
# the code that decodes and encodes all the strings
def get_exif(im, items):
    if not hasattr(im, '_getexif'):
        return;

    # Image will return None if there is no EXIF data
    exifdata = im._getexif()
    if exifdata is None:
        return;

    # And the GPS data is really the only item we care about right now
    if not exifdata.has_key(GPSINFO_TAG):
        return;

    # Just using this format for future expansion possibilities
    items['EXIF'] = {}

    # GPS EXIF information is a sub block of data
    items['exif'][ExifTags.TAGS.get(GPSINFO_TAG,GPSINFO_TAG)] = \
        dict([(ExifTags.GPSTAGS.get(t,t),v) for t,v in exifdata.get(GPSINFO_TAG, {}).items()])
