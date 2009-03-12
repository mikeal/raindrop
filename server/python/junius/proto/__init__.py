# this needs to become a 'plugin' mechanism...

_protocol_infos = [
    ('imap', 'junius.proto.imap', 'IMAPAccount'),
    ('skype', 'junius.proto.skype', 'SkypeAccount'),
    ('twitter', 'junius.proto.twitter', 'TwitterAccount'),
]

# it must be time I looked up dict-comps ;)
protocols = {}
def _load():
    import sys, logging
    logger = logging.getLogger('raindrop.proto')
    for name, mod, factname in _protocol_infos:
        try:
            __import__(mod)
            mod = sys.modules[mod]
            fact = getattr(mod, factname)
        except ImportError, why:
            logger.info("Failed to import '%s' factory: %s", name, why)
        except:
            logger.exception("Error creating '%s' factory", name)
        else:
            protocols[name] = fact

_load()
del _load

__all__ = protocols
