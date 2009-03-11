"""The raindrop server
"""
import sys
import optparse
import logging

from twisted.internet import reactor, defer

from junius import model
from junius import bootstrap

logger = logging.getLogger('raindrop')

class HelpFormatter(optparse.IndentedHelpFormatter):
    def format_description(self, description):
        return description

# a decorator for our global functions, so they can force other commands
# to be run after they have (eg, 'nuking' the database requires a reconfigure)
def forces_commands(*commands):
    def decorate(f):
        f.forces = commands
        return f
    return decorate

# NOTE: All global functions with docstrings are 'commands'
# They must all return a deferred.

@forces_commands('install-files', 'install-accounts')
def nuke_db_and_delete_everything_forever(result, parser, options):
    """Nuke the database AND ALL MESSAGES FOREVER"""
    return model.nuke_db()


def install_accounts(result, parser, options):
    """Install accounts in the database from the config file"""
    return bootstrap.install_accounts(None)


def install_files(result, parser, options):
    """Install all local content files into the database"""
    return model.fab_db(update_views=True
            ).addCallback(bootstrap.install_client_files)

def sync_messages(result, parser, options):
    """Synchronize all messages from all accounts"""
    from junius.sync import SyncConductor
    conductor = SyncConductor()
    return conductor.sync(None)

def _setup_logging(options):
    init_errors = []
    logging.basicConfig()
    for val in options.log_level: # a list of all --log-level options...
        try:
            name, level = val.split("=", 1)
        except ValueError:
            name = None
            level = val
        # convert a level name to a value.
        try:
            level = int(getattr(logging, level.upper()))
        except (ValueError, AttributeError):
            # not a level name from the logging module - maybe a literal.
            try:
                level = int(level)
            except ValueError:
                init_errors.append(
                    "Invalid log-level '%s' ignored" % (val,))
                continue
        l = logging.getLogger(name)
        l.setLevel(level)

    # write the errors after the logging is completely setup.
    for e in init_errors:
        logging.getLogger().error(e)


def main():
    # build the args we support.
    all_args = {}
    for n, v in globals().iteritems():
        if callable(v) and getattr(v, '__doc__', None):
            all_args[n.replace('_', '-')] = v

    all_arg_names = sorted(all_args.keys())
    description= __doc__ + "\nCommands\n  help\n  " + \
                 "\n  ".join(all_args.keys()) + '\n'

    parser = optparse.OptionParser("%prog [options]",
                                   description=description,
                                   formatter=HelpFormatter())

    parser.add_option("", "--log-level", action="append",
                      help="Specifies either an integer or a logging module "
                           "constant (such as INFO) to set all logs to the "
                           "specified level.  Optionally can be in the format "
                           "of 'log.name=level' to only set the level of the "
                           "specified log.",
                      default=["INFO"])

    parser.add_option("", "--nuke-db-and-delete-everything-forever", dest="nuke",
                      action="store_true",
                      help="Delete the entire databases including all messages")

    options, args = parser.parse_args()

    _setup_logging(options)

    # create an initial deferred to perform tasks which must occur before we
    # can start.  The final callback added will fire up the real servers.
    if args and args[0]=='help':
        if args[1:]:
            which = args[1:]
        else:
            which = all_args.keys()
        for this in which:
            print "Help for command '%s':" % this
            print all_args[this].__doc__
            print

        sys.exit(0)

    d = defer.Deferred()
    def mutter(whateva):
        print "Raindrops keep falling on my head..."
    d.addCallback(mutter)

    for arg in args:
        current = [arg]
        while current:
            this = current.pop(0)
            try:
                func = all_args[this]
            except KeyError:
                parser.error("Invalid command: " + this)

            d.addCallback(func, parser, options)
            # and if that command forces any others, do them.
            forces = getattr(func, 'forces', [])
            current.extend(forces)

    # and some final deferreds to control the process itself.
    def done(whateva):
        print "Startup complete - reactor running..."
        #print "Finished."
        #reactor.stop()

    def error(*args, **kw):
        from twisted.python import log
        log.err(*args, **kw)
        print "FAILED."
        reactor.stop()

    d.addCallbacks(done, error)

    reactor.callWhenRunning(d.callback, None)

    logger.debug('starting reactor')
    reactor.run()
    logger.debug('reactor done')


if __name__=='__main__':
    main()
