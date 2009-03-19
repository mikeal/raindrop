# this needs to become a 'plugin' mechanism...

_protocol_infos = [
    ('imap', 'junius.proto.imap', 'IMAPAccount'),
    ('skype', 'junius.proto.skype', 'SkypeAccount'),
    ('twitter', 'junius.proto.twitter', 'TwitterAccount'),
]
if __debug__:
    _protocol_infos.append(('test', 'junius.proto.test', 'TestAccount'))

protocols = {}
def init_protocols():
    import sys, logging
    logger = logging.getLogger('raindrop.proto')
    for name, mod, factname in _protocol_infos:
        try:
            logger.debug("attempting import of '%s' for '%s'", mod, factname)
            __import__(mod)
            mod = sys.modules[mod]
            fact = getattr(mod, factname)
        except ImportError, why:
            logger.error("Failed to import '%s' factory: %s", name, why)
        except:
            logger.exception("Error creating '%s' factory", name)
        else:
            protocols[name] = fact

__all__ = [protocols, init_protocols]
