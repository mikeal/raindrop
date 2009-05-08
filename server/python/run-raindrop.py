#!/usr/bin/env python
"""The raindrop server
"""
import sys
import optparse
import logging

from twisted.internet import reactor, defer, task
from twisted.python.failure import Failure

from raindrop import model
from raindrop import bootstrap
from raindrop import pipeline
from raindrop.sync import get_conductor

logger = logging.getLogger('raindrop')

class HelpFormatter(optparse.IndentedHelpFormatter):
    def format_description(self, description):
        return description

# decorators for our global functions:
#  so they can insist they complete before the next command executes
def asynch_command(f):
    f.asynch = True
    return f

#  so they can consume the rest of the args
def allargs_command(f):
    f.allargs = True
    return f


# XXX - install_accounts should die too, but how to make a safe 'fingerprint'
# so we can do it implicitly? We could create a hash which doesn't include
# the password, but then the password changing wouldn't be enough to trigger
# an update.  Including even the *hash* of the password might risk leaking
# info.  So for now you must install manually.
def install_accounts(result, parser, options):
    """Install accounts in the database from the config file"""
    return bootstrap.install_accounts(None)

# A helper function that arranges to continually perform a 'process' until
# the passed deferred has fired.  Mainly used so we can 'process' at the same
# time as 'sync-messages'
def _process_until_deferred(defd, options):
    state = {'fired': False,
             'delayed_call': None}
    p = pipeline.Pipeline(model.get_doc_model(), options)
    def_done = defer.Deferred()

    def do_start():
        # can't use Force or it will just restart each time...
        p.start(force=False).addBoth(proc_done)

    def defd_fired(result):
        state['fired'] = True
        dc = state['delayed_call']
        if dc is not None:
            # cancel the delayed call and call it now.
            dc.cancel()
            do_start()
        if isinstance(result, Failure):
            result.raiseException()

    def proc_done(result):
        state['delayed_call'] = None
        if state['fired']:
            print "Message pipeline has caught-up..."
            def_done.callback(None)

        print "Message pipeline has finished but tasks are still running; " \
              "waiting then restarting..."
        dc = reactor.callLater(5, do_start)
        state['delayed_call'] = dc

    do_start()
    defd.addCallback(defd_fired)
    
    return def_done
    

@asynch_command
def sync_messages(result, parser, options):
    """Synchronize all messages from all accounts"""
    conductor = get_conductor()
    ret = conductor.sync(None)
    if not options.no_process:
        ret = _process_until_deferred(ret, options)
    return ret

@asynch_command
def process(result, parser, options):
    """Process all messages to see if any extensions need running"""
    def done(result):
        print "Message pipeline has finished..."
    p = pipeline.Pipeline(model.get_doc_model(), options)
    return p.start().addCallback(done)

@asynch_command
def reprocess(result, parser, options):
    """Reprocess all messages even if they are up to date."""
    def done(result):
        print "Message pipeline has finished..."
    p = pipeline.Pipeline(model.get_doc_model(), options)
    return p.start(True).addCallback(done)

@asynch_command
def retry_errors(result, parser, options):
    """Reprocess all conversions which previously resulted in an error."""
    def done_errors(result):
        print "Error retry pipeline has finished - processing work queue..."
        return result
    p = pipeline.Pipeline(model.get_doc_model(), options)
    return p.start_retry_errors(
                ).addCallback(done_errors
                ).addCallback(process, parser, options)

@allargs_command
def show_view(result, parser, options, args):
    """Pretty-print the result of executing a view.

    All arguments after this command are URLs to be executed as the view.  If
    the view name starts with '/', the URL will be used as-is.  This is
    suitable for builtin views - eg:

        show-view /_all_docs?limit=5
    
    will fetch the first 5 results from the URL:

        http://[dbhost]/[dbname]/_all_docs?limit=5"

    whereas

        show-view my_design_doc/my_view?limit=5

    will fetch the first 5 results from the URL

        http://[dbhost]/[dbname]/_design/my_design_doc/_view/my_view?limit=5

    """
    from pprint import pprint
    def print_view(result, view_name):
        print "** view %r **" % view_name
        pprint(result)

    def gen_views():
        for arg in args:
            # don't use open_view as then we'd need to parse the query portion!
            # grrr - just to get the dbname :()
            from raindrop.config import get_config
            dbinfo = get_config().couches['local']
            dbname = dbinfo['name']
            if arg.startswith("/"):
                uri = "/%s/%s" % (dbname, arg)
            else:
                try:
                    doc, rest = arg.split("/")
                except ValueError:
                    parser.error("View name must be in the form design_doc_name/view")
                uri = "/%s/_design/%s/_view/%s" % (dbname, doc, rest)
            db = model.get_db()
            yield db.get(uri
                ).addCallback(db.parseResult
                ).addCallback(print_view, arg)

    coop = task.Cooperator()
    return coop.coiterate(gen_views())


def unprocess(result, parser, options):
    """Delete all documents which can be re-generated by the 'process' command
    """
    def done(result):
        print "unprocess has finished..."
    # XXX - pipeline should probably be a singleton?
    p = pipeline.Pipeline(model.get_doc_model(), options)
    return p.unprocess().addCallback(done)

def delete_docs(result, parser, options):
    """Delete all documents of a particular type.  Use with caution or see
       the 'unprocess' command for an alternative.
    """
    # NOTE: This is for development only, until we get a way to say
    # 'reprocess stuff you've already done' - in the meantime deleting those
    # intermediate docs has the same result...
    def _del_docs(to_del):
        docs = []
        for id, rev in to_del:
            docs.append({'_id': id, '_rev': rev, '_deleted': True})
        return model.get_db().updateDocuments(docs)

    def _got_docs(result, dt):
        to_del = [(row['id'], row['value']) for row in result['rows']]
        logger.info("Deleting %d documents of type %r", len(to_del), dt)
        return to_del

    if not options.doctypes:
        parser.error("You must specify one or more --doctype")
    deferreds = []
    for dt in options.doctypes:
        d = model.get_doc_model().open_view('raindrop!messages!by',
                                            'by_doc_type', key=dt
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

    parser.add_option("-e", "--ext", action="append", dest='exts',
                      help="Specifies the extensions to use for the specified "
                           "operations.")

    parser.add_option("", "--doctype", action="append", dest='doctypes',
                      help="Specifies the document types to use for some "
                           "operations.")

    parser.add_option("", "--force", action="store_true",
                      help="Forces some operations which would otherwise not "
                           "be done.")

    parser.add_option("-s", "--stop-on-error", action="store_true",
                      help="Causes (some) operations which would normally "
                           "handle an error and continue to stop when an "
                           "error occurs.")

    parser.add_option("", "--no-process", action="store_true",
                      help="Don't process the work-queue.")

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

    # Check DB exists and if not, install accounts.
    def maybe_install_accounts(db_created):
        if db_created:
            return bootstrap.install_accounts(None)
    d.addCallback(model.fab_db
        ).addCallback(maybe_install_accounts
        )
    # Check if the files on the filesystem need updating.
    d.addCallback(bootstrap.install_client_files, options)
    d.addCallback(bootstrap.insert_default_docs, options)
    d.addCallback(bootstrap.install_views, options)
    d.addCallback(bootstrap.update_apps)

    # Now process the args specified.
    for i, arg in enumerate(args):
        try:
            func = all_args[arg]
        except KeyError:
            parser.error("Invalid command: " + arg)

        asynch = getattr(func, 'asynch', False)
        if asynch:
            asynch_tasks.append(func)
        else:
            consumes_args = getattr(func, 'allargs', False)
            if consumes_args:
                d.addCallback(func, parser, options, args[i+1:])
                break
            else:
                d.addCallback(func, parser, options)

    # and some final deferreds to control the process itself.
    def done(whateva):
        print "Apparently everything is finished - terminating."
        reactor.stop()

    def start(whateva):
        if not asynch_tasks:
            print "Nothing left to do - terminating."
            reactor.stop()
            return
        print "Startup complete - running tasks..."
        dl = defer.DeferredList([f(None, parser, options) for f in asynch_tasks])
        dl.addCallback(done)
        return dl

    def error(*args, **kw):
        from twisted.python import log
        log.err(*args, **kw)
        print "A startup task failed - not executing servers."
        reactor.stop()

    d.addCallbacks(start, error)

    reactor.callWhenRunning(d.callback, None)

    logger.debug('starting reactor')
    reactor.run()
    logger.debug('reactor done')


if __name__=='__main__':
    main()
