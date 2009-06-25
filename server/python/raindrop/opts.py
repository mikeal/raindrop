# Raindrop backend options: later we could imagine extensions adding their
# own!!
import sys
import os
import re
import tempfile
import logging
from optparse import Option

max_age_mults = {
    'minute': 60*60,
    'day': 60*60*24,
    'week': 60*60*24*7,
    'year': 60*60*24*365,
}
class MaxAgeOption(Option):
    def check_value(self, opt, value):
        max_age_strings = '|'.join(max_age_mults.keys())
        max_age_re = re.compile("(\d)*\W*(" + max_age_strings + ")s?")
        match = max_age_re.match(value)
        if match is None:
            raise ValueError("Invalid syntax for --max-age - try, eg, '4days'")
        val, name = match.groups()
        mult = max_age_mults[name.lower()]
        try:
            val = float(val)
        except ValueError:
            raise ValueError("%r is an invalid number" % val)
        return val * mult


def get_program_options():
    """Options that apply globally to the program itself"""
    yield Option("-l", "--log-level", action="append",
                help="Specifies either an integer or a logging module "
                     "constant (such as INFO) to set all logs to the "
                     "specified level.  Optionally can be in the format "
                     "of 'log.name=level' to only set the level of the "
                     "specified log.",
                default=["INFO"])
    yield Option("", "--log-file", action="store",
                help="Specifies the name of the log file to use.  Default is "
                     "stderr if stderr is a terminal, else $TEMP/raindrop.log")


def get_request_options():
    """Options that apply to a specific request (still global though!)"""
    yield Option("-p", "--protocol", action="append", dest='protocols',
                help="Specifies the protocols to enable.  If not "
                     "specified, all protocols are enabled")

    yield Option("-e", "--ext", action="append", dest='exts',
                help="Specifies the extensions to use for the specified "
                     "operations.")

    yield Option("", "--schema", action="append", dest='schemas',
                help="Specifies the schema ids to use for some "
                     "operations.")

    yield Option("", "--folder", action="append", dest='folders',
                help="Specifies the names of folders to use for some "
                     "operations.")

    yield Option("", "--key", action="append", dest='keys',
                help="Specifies the 'raindrop key' to use for some "
                     "operations.")

    yield Option("", "--force", action="store_true",
                help="Forces some operations which would otherwise not "
                     "be done.")

    yield Option("-s", "--stop-on-error", action="store_true",
                help="Causes (some) operations which would normally "
                     "handle an error and continue to stop when an "
                     "error occurs.")

    yield Option("", "--no-process", action="store_true",
                help="Don't process the work-queue.")

    yield MaxAgeOption("", "--max-age", type="int",
                help="Maximum age of an item to fetch.  eg, '30 seconds', "
                     "'2weeks'.")

# possibly misplaced....
def setup_logging(options):
    init_errors = []
    filename=options.log_file
    if not filename and not sys.stderr.isatty():
        filename = os.path.join(tempfile.gettempdir(), "raindrop.log")
    logging.basicConfig(filename=filename)
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
