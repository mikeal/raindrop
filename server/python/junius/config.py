import ConfigParser, logging, os, os.path

__all__ = ['get_config']

class Config(object):
  COUCH_DEFAULTS = {'host': 'localhost', 'port': 5984, 'name': 'raindrop'}
  def __init__(self):
    self.parser = ConfigParser.SafeConfigParser()

    self.couches = {'local': self.COUCH_DEFAULTS.copy()}
    self.accounts = {}

    # XXX - this seems wrong: most of the time the 'config' - particularly the
    # list of accounts etc - will come from the DB.  The config file should only
    # be used during bootstrapping.
    self.load()


  def dictifySection(self, section_name, defaults=None, name=None):
    '''
    Given a config section name, suck up its contents into a dictionary.  Poor
    man's type detection turns lowercase true/false into the boolean of that
    type, things that can be int()ed into ints, and otherwise things get to
    stay strings.  Defaults are applied before dictification, and the name is
    an optional default for 'name' if specified (which overrides the defaults
    dict.)
    '''
    results = {}
    if defaults:
      results.update(defaults)
    if name:
      results['name'] = name
    for name, value in self.parser.items(section_name):
      if value.lower() in ('true', 'false'):
        value = (value.lower() == 'true')
      else:
        try:
          value = int(value)
        except:
          pass

      results[name] = value
    return results

  def load(self):
    self.parser.read([os.path.expanduser('~/.raindrop')])

    COUCH_PREFIX = 'couch-'
    ACCOUNT_PREFIX = 'account-'
    for section_name in self.parser.sections():
      if section_name.startswith(COUCH_PREFIX):
        couch_name = section_name[len(COUCH_PREFIX):]
        self.couches[couch_name] = self.dictifySection(section_name,
                                                       self.COUCH_DEFAULTS)

      if section_name.startswith(ACCOUNT_PREFIX):
        account_name = section_name[len(ACCOUNT_PREFIX):]
        acct = self.accounts[account_name] = \
                    self.dictifySection(section_name, None, account_name)
        if 'id' in acct:
          acct['_id'] = acct['id']
          del acct['id']
        else:
          acct['_id'] = acct['username']

    self.local_couch = self.couches['local']
    self.remote_couch = self.couches.get('remote') # may be None

CONFIG = None
def get_config():
  global CONFIG
  if CONFIG is None:
    CONFIG = Config()
  return CONFIG
