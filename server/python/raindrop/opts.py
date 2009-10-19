# Raindrop backend options: later we could imagine extensions adding their
# own!!
import sys
import os
import re
import tempfile
import logging
from optparse import Option

max_age_mults = {
    'sec': 1,
    'minute': 60,
    'hour': 60*60,
    'day': 60*60*24,
    'week': 60*60*24*7,
    'year': 60*60*24*365,
}
class NumSecondsOption(Option):
    def check_value(self, opt, value):
        max_age_strings = '|'.join(max_age_mults.keys())
        max_age_re = re.compile("(\d*)\W*(" + max_age_strings + ")s?")
        match = max_age_re.match(value)
        if match is None:
            raise ValueError("Invalid syntax for time option - try, eg, '4days'")
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
    yield Option("", "--color", action="store_true", dest="use_color",
                 default=False,
                 help="Use ANSI color when available.")
    yield Option("", "--debug", action="store_true", dest="debug",
                 default=False,
                 help="Enable debug mode; breaking on exceptions.")


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

    yield NumSecondsOption("", "--max-age", type="int",
                help="Maximum age of an item to fetch.  eg, '30 seconds', "
                     "'2weeks'.")

    yield NumSecondsOption("", "--repeat-after", type="int",
                help="Time to wait after completion before repeating the sync")

class LevelColorFormatter(logging.Formatter):
    RESET = '\x1b[0m'
    LEVEL_DECILE_TO_COLOR = [
        '\x1b[0;30m', # 0-9  : ridiculously detailed. hard to read dark grey
        '\x1b[1;30m', # 10-19: DEBUG dark grey
        '\x1b[0;37m', # 20-29: INFO grey
        '\x1b[0;33m', # 30-39: WARNING yellow / brown
        '\x1b[0;31m', # 40-49: ERROR red
        '\x1b[1;31m', # 50-  : CRITICAL bright red
    ]
    def format(self, record):
        s = logging.Formatter.format(self, record)
        level_decile = min(5, record.levelno // 10)
        return self.LEVEL_DECILE_TO_COLOR[level_decile] + s + self.RESET

def log_twisted(record):
    if record['isError']:
        level = logging.ERROR
    else:
        level = logging.DEBUG
    message = ''.join(record['message'])
    if 'failure' in record:
        message += "\n" + record['failure'].getTraceback()
    logging.getLogger('twisted').log(level, message)

# possibly misplaced....
def setup_logging(options):
    init_errors = []
    logging.basicConfig(filename=options.log_file)
    if options.use_color:
        handler = logging.root.handlers[0]
        color_formatter = LevelColorFormatter(handler.formatter._fmt,
                                              handler.formatter.datefmt)
        handler.setFormatter(color_formatter)

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

    # configure twisted logging...
    import twisted.python.log
    twisted.python.log.addObserver(log_twisted)
