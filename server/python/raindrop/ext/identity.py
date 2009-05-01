from ..proc import base

# Our identities 'phone' and 'url' are 'simple' in that there is currently
# no further information we can extract.
def do_simple_id_convert(doc):
    return {
        'name' : doc['identity_id'][1],
        'identity_id': ['identity_id'],
    }

    
class PhoneIdentityConverter(base.SimpleConverterBase):
    target_type = 'id', 'identity'
    sources = [('id', 'phone')]

    def simple_convert(self, doc):
        return do_simple_id_convert(doc)


class URLIdentityConverter(base.SimpleConverterBase):
    target_type = 'id', 'identity'
    sources = [('id', 'url')]

    def simple_convert(self, doc):
        return do_simple_id_convert(doc)


class MessageAnnotator(base.SimpleConverterBase):
    target_type = 'msg', 'anno/tags'
    # I only consume one type of object.
    sources = [
        ('id', 'raw/identity'),
    ]
