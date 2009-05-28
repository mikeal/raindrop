def handler(doc):
    # emit the normalized identity schema
    items = {'nickname': doc['twitter_screen_name']}
    # the rest are optional...
    for dest, src in [
        ('name', 'name'),
        ('url', 'url'),
        ('image', 'profile_image_url'),
        ]:
        val = doc.get('twitter_' + src)
        if val:
            items[dest] = val
    emit_schema('rd.identity', items)

    # and we use the same extension to emit the 'known identities' too...
    def gen_em():
        # the primary 'twitter' one first...
        yield ('twitter', doc['twitter_screen_name']), None
        v = doc.get('twitter_url')
        if v:
            yield ('url', v.rstrip('/')), 'homepage'

    def_contact_props = {'name': doc['twitter_name'] or doc['twitter_screen_name']}
    emit_related_identities(gen_em(), def_contact_props)
