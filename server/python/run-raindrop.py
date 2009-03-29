"""The raindrop server
"""
import sys
import optparse
import logging

from twisted.internet import reactor, defer

from junius import model
from junius import bootstrap
from junius import pipeline
from junius.sync import get_conductor

logger = logging.getLogger('raindrop')

class HelpFormatter(optparse.IndentedHelpFormatter):
    def format_description(self, description):
        return description

# a decorator for our global functions, so they can insist they complete
# before the next command executes;
def asynch_command(f):
    f.asynch = True
    return f

# NOTE: All global functions with docstrings are 'commands'
# They must all return a deferred.
def nuke_db_and_delete_everything_forever(result, parser, options):
    """Nuke the database AND ALL MESSAGES FOREVER"""
    return model.nuke_db(
                ).addCallback(bootstrap.install_accounts)


# XXX - install_accounts should die too, but how to make a safe 'fingerprint'
# so we can do it implicitly? We could create a hash which doesn't include
# the password, but then the password changing wouldn't be enough to trigger
# an update.  Including even the *hash* of the password might risk leaking
# info.  So for now you must install manually.
def install_accounts(result, parser, options):
    """Install accounts in the database from the config file"""
    return bootstrap.install_accounts(None)


@asynch_command
def sync_messages(result, parser, options):
    """Synchronize all messages from all accounts"""
    conductor = get_conductor()
    return conductor.sync(None)

@asynch_command
def process(result, parser, options):
    """Process all messages to see if any extensions need running"""
    def done(result):
        print "Message pipeline has finished..."
    p = pipeline.Pipeline(model.get_doc_model())
    return p.start().addCallback(done)

def delete_docs(result, parser, options):
    """Delete all documents of a particular type.  Use with caution"""
    # NOTE: This is for development only, until we get a way to say
    # 'reprocess stuff you've already done' - in the meantime deleting those
    # intermediate docs has the same result...
    from urllib import quote
    db = model.get_db()

    def _del_docs(to_del):
        docs = []
        for id, rev in to_del:
            docs.append({'_id': id, '_rev': rev, '_deleted': True})
        return db.updateDocuments(docs)

    def _got_docs(result, dt):
        to_del = [(row['id'], row['value']) for row in result]
        logger.info("Deleting %d documents of type %r", len(to_del), dt)
        return to_del

    if not options.doctypes:
        parser.error("You must specify one or more --doctype")
    deferreds = []
    for dt in options.doctypes:
        d = db.openView('raindrop!messages!by', 'by_doc_type', key=dt
                ).addCallback(_got_docs, dt
                ).addCallback(_del_docs
                )
        deferreds.append(d)
    return defer.DeferredList(deferreds)


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
                 "\n  ".join(all_args.keys()) + \
                 "\nUse '%prog help command-name' for help on a specific command.\n"

    parser = optparse.OptionParser("%prog [options]",
                                   description=description,
                                   formatter=HelpFormatter())

    parser.add_option("-l", "--log-level", action="append",
                      help="Specifies either an integer or a logging module "
                           "constant (such as INFO) to set all logs to the "
                           "specified level.  Optionally can be in the format "
                           "of 'log.name=level' to only set the level of the "
                           "specified log.",
                      default=["INFO"])

    parser.add_option("-p", "--protocol", action="append", dest='protocols',
                      help="Specifies the protocols to enable.  If not "
                           "specified, all protocols are enabled")

    parser.add_option("", "--doctype", action="append", dest='doctypes',
                      help="Specifies the document types to use for some "
                           "operations.")

    parser.add_option("", "--force", action="store_true",
                      help="Forces some operations which would otherwise not "
                           "be done.")

    options, args = parser.parse_args()

    _setup_logging(options)

    # do this very early just to set the options
    get_conductor(options)

    if args and args[0]=='help':
        if args[1:]:
            which = args[1:]
        else:
            which = all_args.keys()
        for this in which:
            if this=='help': # ie, 'help help'
                doc = "show help for the commands."
            else:
                try:
                    doc = all_args[this].__doc__
                except KeyError:
                    print "No such command '%s':" % this
                    continue
            print "Help for command '%s':" % this
            print doc
            print
    
        sys.exit(0)

    # create an initial deferred to perform tasks which must occur before we
    # can start.  The final callback added will fire up the real servers.
    asynch_tasks = []
    d = defer.Deferred()
    def mutter(whateva):
        print "Raindrops keep falling on my head..."
    d.addCallback(mutter)

    # Check DB exists.
    d.addCallback(model.fab_db)
    # Check if the files on the filesystem need updating.
    d.addCallback(bootstrap.install_client_files, options)
    d.addCallback(bootstrap.install_views, options)

    # Now process the args specified.
    for arg in args:
        try:
            func = all_args[arg]
        except KeyError:
            parser.error("Invalid command: " + arg)

        asynch = getattr(func, 'acynch', False)
        if asynch:
            asynch_tasks.append(func)
        else:
            d.addCallback(func, parser, options)

    # and some final deferreds to control the process itself.
    def done(whateva):
        if asynch_tasks:
            print "Finished."
            reactor.stop()
            return
        print "Startup complete - running tasks..."
        dl = defer.DeferredList([f(None, parser, options) for f in asynch_tasks])
        return dl

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
