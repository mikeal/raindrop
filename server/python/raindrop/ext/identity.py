from ..proc import base

class MessageAnnotator(base.SimpleConverterBase):
    target_type = 'msg', 'anno/tags'
    # I only consume one type of object.
    sources = [
        ('id', 'raw/identity'),
    ]
