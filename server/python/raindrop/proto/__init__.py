# this needs to become a 'plugin' mechanism...

_protocol_infos = [
    ('imap', 'raindrop.proto.imap', 'IMAPAccount'),
    ('skype', 'raindrop.proto.skype', 'SkypeAccount'),
    ('twitter', 'raindrop.proto.twitter', 'TwitterAccount'),
    ('smtp', 'raindrop.proto.smtp', 'SMTPAccount'),
    ('rss', 'raindrop.proto.rss', 'RSSAccount'),
]

_test_protocol_infos = [
    ('test', 'raindrop.proto.test', 'TestAccount'),
]

protocols = {}
def init_protocols(include_test_protocols=False):
    import sys, logging
    logger = logging.getLogger('raindrop.proto')
    to_init = _protocol_infos[:]
    if include_test_protocols:
        to_init.extend(_test_protocol_infos)
    for name, mod, factname in to_init:
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
